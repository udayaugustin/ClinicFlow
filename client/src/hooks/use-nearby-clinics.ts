import { useState, useEffect, useCallback } from 'react';

interface NearbyClinic {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string | null;
  phone: string;
  email: string | null;
  openingHours: string | null;
  description: string | null;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  createdAt: string;
  distance: number; // Distance in km
}

interface NearbyClinicResponse {
  success: boolean;
  count: number;
  location: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  clinics: NearbyClinic[];
}

interface UseNearbyClinicsOptions {
  autoFetch?: boolean;
  radius?: number; // radius in km
}

interface UseNearbyClinicsReturn {
  clinics: NearbyClinic[];
  loading: boolean;
  error: string | null;
  fetchClinics: (lat: number, lng: number, radius?: number) => Promise<void>;
  refetch: () => void;
  count: number;
}

export function useNearbyClinics(options: UseNearbyClinicsOptions = {}): UseNearbyClinicsReturn {
  const { autoFetch = false, radius = 10 } = options;
  
  const [clinics, setClinics] = useState<NearbyClinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLocation, setLastLocation] = useState<{lat: number; lng: number; radius: number} | null>(null);

  const fetchClinics = useCallback(async (lat: number, lng: number, radiusKm: number = radius) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🏥 Fetching clinics near ${lat}, ${lng} within ${radiusKm}km`);

      const response = await fetch(
        `/api/clinics/nearby?lat=${lat}&lng=${lng}&radius=${radiusKm}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: NearbyClinicResponse = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch clinics');
      }

      console.log(`✅ Found ${data.count} clinics within 5-${radiusKm}km range:`, data.clinics);

      setClinics(data.clinics);
      setLastLocation({ lat, lng, radius: radiusKm });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch nearby clinics';
      console.error('❌ Error fetching nearby clinics:', errorMessage);
      setError(errorMessage);
      setClinics([]);
    } finally {
      setLoading(false);
    }
  }, []); // Remove radius dependency to prevent infinite loops

  const refetch = useCallback(() => {
    if (lastLocation) {
      fetchClinics(lastLocation.lat, lastLocation.lng, lastLocation.radius);
    }
  }, [lastLocation]); // Remove fetchClinics dependency to prevent loops

  // Auto-fetch nearby clinics if user location is available
  useEffect(() => {
    if (autoFetch && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('🗺️ Auto-fetching clinics for detected location:', latitude, longitude);
          fetchClinics(latitude, longitude);
        },
        (error) => {
          console.warn('Could not get user location for auto-fetch:', error);
          setError('Could not get your location for finding nearby clinics');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    }
  }, [autoFetch]); // Remove fetchClinics dependency

  return {
    clinics,
    loading,
    error,
    fetchClinics,
    refetch,
    count: clinics.length
  };
}