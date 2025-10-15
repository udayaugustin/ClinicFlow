import { useState, useEffect, useCallback, useRef } from 'react';

interface LocationSource {
  type: 'gps' | 'network' | 'cached';
  position: GeolocationPosition;
  accuracy: number;
  timestamp: number;
  confidence: number;
}

interface AdvancedGeolocationState {
  status: 'idle' | 'requesting' | 'granted' | 'denied' | 'error';
  position: GeolocationPosition | null;
  error: string | null;
  isSupported: boolean;
  sources: LocationSource[];
  bestSource: LocationSource | null;
  requestId: string | null;
}

interface AdvancedGeolocationOptions {
  autoRequest?: boolean;
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  minAccuracy?: number;
  useCache?: boolean;
  parallelRequests?: boolean;
  maxSources?: number;
}

export function useAdvancedGeolocation(options: AdvancedGeolocationOptions = {}) {
  const {
    autoRequest = false,
    enableHighAccuracy = true,
    timeout = 30000,
    maximumAge = 60000,
    minAccuracy = 500,
    useCache = true,
    parallelRequests = true,
    maxSources = 3
  } = options;

  const [state, setState] = useState<AdvancedGeolocationState>({
    status: 'idle',
    position: null,
    error: null,
    isSupported: 'geolocation' in navigator,
    sources: [],
    bestSource: null,
    requestId: null
  });

  const watchId = useRef<number | null>(null);
  const locationCache = useRef<LocationSource[]>([]);

  // Cache location data in localStorage (like Google does)
  const cacheLocation = useCallback((source: LocationSource) => {
    if (!useCache) return;
    
    try {
      const cached = {
        ...source,
        timestamp: Date.now()
      };
      localStorage.setItem('clinicflow_location_cache', JSON.stringify(cached));
      locationCache.current.push(cached);
      
      // Keep only recent cache entries (last 5)
      locationCache.current = locationCache.current
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5);
    } catch (error) {
      console.warn('Failed to cache location:', error);
    }
  }, [useCache]);

  // Get cached location (like Google's last known location)
  const getCachedLocation = useCallback((): LocationSource | null => {
    if (!useCache) return null;
    
    try {
      const cached = localStorage.getItem('clinicflow_location_cache');
      if (cached) {
        const location: LocationSource = JSON.parse(cached);
        
        // Check if cache is still fresh (within maximumAge)
        if (Date.now() - location.timestamp < maximumAge) {
          console.log('🗄️ Using cached location:', location.accuracy + 'm accuracy');
          return location;
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve cached location:', error);
    }
    
    return null;
  }, [useCache, maximumAge]);

  // Calculate confidence score based on accuracy and freshness
  const calculateConfidence = useCallback((position: GeolocationPosition, type: LocationSource['type']): number => {
    const accuracyScore = Math.max(0, 100 - (position.coords.accuracy / 10));
    const freshnessScore = Math.max(0, 100 - ((Date.now() - position.timestamp) / 1000 / 60)); // Decrease over minutes
    const typeMultiplier = type === 'gps' ? 1.2 : type === 'network' ? 1.0 : 0.8;
    
    return Math.min(100, (accuracyScore + freshnessScore) * typeMultiplier / 2);
  }, []);

  // Google-like location fusion - select best from multiple sources
  const fuseBestLocation = useCallback((sources: LocationSource[]): LocationSource | null => {
    if (sources.length === 0) return null;
    
    // Sort by confidence score (highest first)
    const sortedSources = sources.sort((a, b) => b.confidence - a.confidence);
    
    console.log('📊 Location sources ranked by confidence:', 
      sortedSources.map(s => ({
        type: s.type,
        accuracy: Math.round(s.accuracy),
        confidence: Math.round(s.confidence)
      }))
    );
    
    return sortedSources[0];
  }, []);

  // Make a single location request with specific options
  const makeLocationRequest = useCallback((
    requestOptions: PositionOptions,
    sourceType: LocationSource['type']
  ): Promise<LocationSource> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const source: LocationSource = {
            type: sourceType,
            position,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            confidence: calculateConfidence(position, sourceType)
          };
          
          console.log(`📍 ${sourceType.toUpperCase()} location received:`, {
            accuracy: Math.round(source.accuracy),
            confidence: Math.round(source.confidence),
            lat: position.coords.latitude.toFixed(6),
            lng: position.coords.longitude.toFixed(6)
          });
          
          resolve(source);
        },
        reject,
        requestOptions
      );
    });
  }, [calculateConfidence]);

  // Google-style parallel location requests
  const requestLocationParallel = useCallback(async (): Promise<void> => {
    if (!state.isSupported) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Geolocation is not supported by this browser.'
      }));
      return;
    }

    const requestId = Date.now().toString();
    setState(prev => ({ ...prev, status: 'requesting', error: null, requestId }));

    try {
      const sources: LocationSource[] = [];
      
      // Add cached location first (instant result like Google)
      const cachedLocation = getCachedLocation();
      if (cachedLocation) {
        sources.push(cachedLocation);
      }

      // Create multiple parallel requests with different strategies
      const requests = [];

      // 1. High-accuracy GPS request (like Google's precise mode)
      requests.push(
        makeLocationRequest({
          enableHighAccuracy: true,
          timeout: timeout,
          maximumAge: 0 // Force fresh GPS reading
        }, 'gps').catch(error => {
          console.warn('GPS request failed:', error.message);
          return null;
        })
      );

      // 2. Fast network-based request (like Google's quick mode)
      requests.push(
        makeLocationRequest({
          enableHighAccuracy: false,
          timeout: 10000, // Shorter timeout for network location
          maximumAge: maximumAge
        }, 'network').catch(error => {
          console.warn('Network request failed:', error.message);
          return null;
        })
      );

      // Wait for all parallel requests (with timeout)
      const results = await Promise.allSettled(requests);
      
      // Process successful results
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          sources.push(result.value);
        }
      });

      // If no new sources and no cache, show error
      if (sources.length === 0) {
        throw new Error('All location requests failed. Please check your location settings.');
      }

      // Find the best location using Google-like fusion
      const bestSource = fuseBestLocation(sources);
      
      if (bestSource) {
        // Cache the best location
        if (bestSource.type !== 'cached') {
          cacheLocation(bestSource);
        }

        setState(prev => {
          // Only update if this is still the current request
          if (prev.requestId === requestId) {
            return {
              ...prev,
              status: 'granted',
              position: bestSource.position,
              sources,
              bestSource,
              error: null
            };
          }
          return prev;
        });

        console.log(`✅ Using ${bestSource.type.toUpperCase()} location with ${Math.round(bestSource.accuracy)}m accuracy`);
      }

    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to get location'
      }));
    }
  }, [
    state.isSupported,
    timeout,
    maximumAge,
    getCachedLocation,
    makeLocationRequest,
    fuseBestLocation,
    cacheLocation
  ]);

  // Start continuous location watching (like Google Maps does)
  const startWatching = useCallback(() => {
    if (!state.isSupported || watchId.current) return;

    console.log('👁️ Starting location watching...');
    
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const source: LocationSource = {
          type: 'gps',
          position,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          confidence: calculateConfidence(position, 'gps')
        };

        // Only update if this is significantly better or fresher
        setState(prev => {
          const shouldUpdate = !prev.bestSource || 
            source.accuracy < prev.bestSource.accuracy * 0.8 ||
            source.timestamp - prev.bestSource.timestamp > 60000; // 1 minute fresher

          if (shouldUpdate) {
            console.log('🔄 Location updated from watching:', Math.round(source.accuracy) + 'm');
            cacheLocation(source);
            return {
              ...prev,
              position: source.position,
              bestSource: source,
              sources: [source, ...prev.sources.slice(0, maxSources - 1)]
            };
          }
          return prev;
        });
      },
      (error) => {
        console.warn('Location watching error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 30000
      }
    );
  }, [state.isSupported, calculateConfidence, cacheLocation, maxSources]);

  const stopWatching = useCallback(() => {
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      console.log('🛑 Stopped location watching');
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (parallelRequests) {
      return requestLocationParallel();
    } else {
      // Fallback to single request
      return makeLocationRequest({
        enableHighAccuracy,
        timeout,
        maximumAge
      }, 'gps').then(source => {
        setState(prev => ({
          ...prev,
          status: 'granted',
          position: source.position,
          sources: [source],
          bestSource: source
        }));
      });
    }
  }, [parallelRequests, requestLocationParallel, makeLocationRequest, enableHighAccuracy, timeout, maximumAge]);

  // Auto-request location on mount (like Google Maps)
  useEffect(() => {
    if (!state.isSupported || !autoRequest) return;

    // Check permissions first
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((permissionStatus) => {
        console.log('🔐 Geolocation permission status:', permissionStatus.state);
        
        if (permissionStatus.state === 'granted') {
          requestLocation();
          startWatching();
        }
      }).catch((err) => {
        console.warn('Could not query geolocation permission:', err);
        requestLocation(); // Try anyway
      });
    } else {
      requestLocation();
    }

    return () => {
      stopWatching();
    };
  }, [state.isSupported, autoRequest, requestLocation, startWatching, stopWatching]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    stopWatching();
    setState({
      status: 'idle',
      position: null,
      error: null,
      isSupported: 'geolocation' in navigator,
      sources: [],
      bestSource: null,
      requestId: null
    });
  }, [stopWatching]);

  return {
    ...state,
    requestLocation,
    startWatching,
    stopWatching,
    clearError,
    reset,
    coordinates: state.position ? {
      latitude: state.position.coords.latitude,
      longitude: state.position.coords.longitude,
      accuracy: state.position.coords.accuracy
    } : null,
    // Enhanced debugging info
    debugInfo: {
      sources: state.sources.map(s => ({
        type: s.type,
        accuracy: Math.round(s.accuracy),
        confidence: Math.round(s.confidence),
        age: Math.round((Date.now() - s.timestamp) / 1000)
      })),
      bestSourceType: state.bestSource?.type,
      isWatching: watchId.current !== null,
      cacheSize: locationCache.current.length
    }
  };
}