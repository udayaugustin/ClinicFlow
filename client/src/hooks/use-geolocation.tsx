import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  status: 'idle' | 'requesting' | 'granted' | 'denied' | 'error';
  position: GeolocationPosition | null;
  error: string | null;
  isSupported: boolean;
  attempt: number;
  bestPosition: GeolocationPosition | null; // Keep track of the most accurate position
}

interface GeolocationOptions extends PositionOptions {
  autoRequest?: boolean; // Automatically request location if permission is already granted
  minAccuracy?: number; // Minimum acceptable accuracy in meters (default: 1000)
  maxAttempts?: number; // Maximum number of location attempts (default: 3)
}

export function useGeolocation(options: GeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 30000, // Increased to 30 seconds for better GPS lock
    maximumAge = 60000, // Reduced to 1 minute for fresher location data
    autoRequest = false,
    minAccuracy = 1000, // Accept locations within 1km accuracy
    maxAttempts = 3 // Try up to 3 times for better accuracy
  } = options;

  const [state, setState] = useState<GeolocationState>({
    status: 'idle',
    position: null,
    error: null,
    isSupported: 'geolocation' in navigator,
    attempt: 0,
    bestPosition: null
  });

  const requestLocation = useCallback((attemptNumber: number = 1) => {
    if (!state.isSupported) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Geolocation is not supported by this browser.'
      }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      status: 'requesting', 
      error: null, 
      attempt: attemptNumber 
    }));

    const positionOptions: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge: attemptNumber === 1 ? 0 : maximumAge // Force fresh location on first attempt
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log(`📍 Geolocation Success (Attempt ${attemptNumber}):`, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString()
        });

        setState(prev => {
          // Check if this position is accurate enough
          const isAccurate = position.coords.accuracy <= minAccuracy;
          
          // Check if this is better than our previous best position
          const isBetter = !prev.bestPosition || 
            position.coords.accuracy < prev.bestPosition.coords.accuracy;
          
          const newBestPosition = isBetter ? position : prev.bestPosition;
          
          // If accurate enough OR we've exhausted our attempts, use the best position
          if (isAccurate || attemptNumber >= maxAttempts) {
            console.log(`✅ Using position with accuracy: ${newBestPosition?.coords.accuracy}m`);
            return {
              ...prev,
              status: 'granted',
              position: newBestPosition,
              bestPosition: newBestPosition,
              error: null
            };
          } else {
            // Try again with next attempt
            console.log(`⚠️ Accuracy too low (${position.coords.accuracy}m), trying again...`);
            setTimeout(() => requestLocation(attemptNumber + 1), 1000); // Wait 1s between attempts
            return {
              ...prev,
              bestPosition: newBestPosition,
              attempt: attemptNumber + 1
            };
          }
        });
      },
      (error) => {
        console.error(`❌ Geolocation Error (Attempt ${attemptNumber}):`, error);
        
        // If we have a previous best position and this isn't a permission error, use it
        if (state.bestPosition && error.code !== error.PERMISSION_DENIED) {
          console.log('🔄 Using best available position due to error');
          setState(prev => ({
            ...prev,
            status: 'granted',
            position: prev.bestPosition,
            error: null
          }));
          return;
        }
        
        // If we haven't exhausted attempts and it's not a permission error, try again
        if (attemptNumber < maxAttempts && error.code !== error.PERMISSION_DENIED) {
          console.log(`🔄 Retrying location request (${attemptNumber + 1}/${maxAttempts})`);
          setTimeout(() => requestLocation(attemptNumber + 1), 2000);
          return;
        }
        
        // Give up and show error
        let errorMessage = 'Failed to get your location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions in your browser.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please check your connection and try again.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
        }

        setState(prev => ({
          ...prev,
          status: error.code === error.PERMISSION_DENIED ? 'denied' : 'error',
          error: errorMessage
        }));
      },
      positionOptions
    );
  }, [enableHighAccuracy, timeout, maximumAge, minAccuracy, maxAttempts, state.isSupported, state.bestPosition]);

  // Auto-check permission status and request location if enabled
  useEffect(() => {
    if (!state.isSupported || !autoRequest) return;

    // Check current permission status
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((permissionStatus) => {
        console.log('🔐 Geolocation permission status:', permissionStatus.state);
        
        if (permissionStatus.state === 'granted') {
          requestLocation();
        }
      }).catch((err) => {
        console.warn('Could not query geolocation permission:', err);
      });
    }
  }, [state.isSupported, autoRequest, requestLocation]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState(prev => ({
      status: 'idle',
      position: null,
      error: null,
      isSupported: prev.isSupported,
      attempt: 0,
      bestPosition: null
    }));
  }, []);

  return {
    ...state,
    requestLocation: () => requestLocation(1), // Always start from attempt 1
    clearError,
    reset,
    coordinates: state.position ? {
      latitude: state.position.coords.latitude,
      longitude: state.position.coords.longitude,
      accuracy: state.position.coords.accuracy
    } : null,
    // Additional debugging info
    attemptInfo: {
      currentAttempt: state.attempt,
      maxAttempts,
      minAccuracy,
      hasValidPosition: state.position !== null,
      accuracy: state.position?.coords.accuracy
    }
  };
}