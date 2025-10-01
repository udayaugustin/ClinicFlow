import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  status: 'idle' | 'requesting' | 'granted' | 'denied' | 'error';
  position: GeolocationPosition | null;
  error: string | null;
  isSupported: boolean;
}

interface GeolocationOptions extends PositionOptions {
  autoRequest?: boolean; // Automatically request location if permission is already granted
}

export function useGeolocation(options: GeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 300000, // 5 minutes
    autoRequest = false
  } = options;

  const [state, setState] = useState<GeolocationState>({
    status: 'idle',
    position: null,
    error: null,
    isSupported: 'geolocation' in navigator
  });

  const requestLocation = useCallback(() => {
    if (!state.isSupported) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Geolocation is not supported by this browser.'
      }));
      return;
    }

    setState(prev => ({ ...prev, status: 'requesting', error: null }));

    const positionOptions: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('📍 Geolocation Success:', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString()
        });

        setState({
          status: 'granted',
          position,
          error: null,
          isSupported: true
        });
      },
      (error) => {
        console.error('❌ Geolocation Error:', error);
        
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
  }, [enableHighAccuracy, timeout, maximumAge, state.isSupported]);

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
      isSupported: prev.isSupported
    }));
  }, []);

  return {
    ...state,
    requestLocation,
    clearError,
    reset,
    coordinates: state.position ? {
      latitude: state.position.coords.latitude,
      longitude: state.position.coords.longitude,
      accuracy: state.position.coords.accuracy
    } : null
  };
}