import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface NearbyConfig {
  enabled: boolean;
  radiusKm: number;
  maxRadiusKm: number;
  fallbackEnabled: boolean;
}

interface AppConfig {
  nearby_default_enabled: boolean;
  nearby_default_radius_km: number;
  nearby_max_radius_km: number;
  nearby_fallback_enabled: boolean;
}

export function useAppConfig() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['app-config-nearby'],
    queryFn: async () => {
      const response = await fetch('/api/configurations/public?category=nearby');
      if (!response.ok) {
        throw new Error('Failed to fetch configurations');
      }
      const result = await response.json();
      return result.configurations as AppConfig;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  return {
    nearbyEnabled: data?.nearby_default_enabled ?? true,
    nearbyRadius: data?.nearby_default_radius_km ?? 20,
    nearbyMaxRadius: data?.nearby_max_radius_km ?? 50,
    nearbyFallbackEnabled: data?.nearby_fallback_enabled ?? true,
    isLoading,
    error,
  };
}

export function useAdminConfig() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-config-nearby'],
    queryFn: async () => {
      const response = await fetch('/api/admin/configurations?category=nearby');
      if (!response.ok) {
        throw new Error('Failed to fetch admin configurations');
      }
      return response.json();
    },
    staleTime: 1 * 60 * 1000, // Cache for 1 minute
  });

  const updateMutation = useMutation({
    mutationFn: async (configurations: Record<string, any>) => {
      const response = await fetch('/api/admin/configurations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ configurations }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update configurations');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate both admin and public config caches
      queryClient.invalidateQueries({ queryKey: ['admin-config-nearby'] });
      queryClient.invalidateQueries({ queryKey: ['app-config-nearby'] });
    },
  });

  return {
    configurations: data?.configurations || [],
    isLoading,
    error,
    updateConfigurations: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,
  };
}
