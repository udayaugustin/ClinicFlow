import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, AlertCircle, CheckCircle, Settings, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGeolocation } from '@/hooks/use-geolocation';
import { LocationDiagnostics } from '@/components/location-diagnostics';
import { LeafletMap } from '@/components/ui/leaflet-map';
import { useNearbyClinics } from '@/hooks/use-nearby-clinics';

export default function MapPage() {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  const {
    status,
    position,
    error,
    isSupported,
    coordinates,
    requestLocation,
    attemptInfo
  } = useGeolocation({ 
    autoRequest: true, 
    minAccuracy: 500, // Accept locations within 500m for better accuracy
    maxAttempts: 3 
  });

  // Fetch nearby clinics (0-10km range)
  const {
    clinics: nearbyClinics,
    loading: clinicsLoading,
    error: clinicsError,
    fetchClinics,
    count: clinicsCount
  } = useNearbyClinics({ 
    radius: 10 // 10km radius from user location
  });

  // Store last fetched location to prevent infinite loops
  const [lastFetchedLocation, setLastFetchedLocation] = React.useState<{lat: number, lng: number} | null>(null);

  // Fetch clinics when location is detected
  React.useEffect(() => {
    if (coordinates && status === 'granted') {
      // Only fetch if location has changed significantly (more than 100m)
      const hasLocationChanged = !lastFetchedLocation || 
        Math.abs(coordinates.latitude - lastFetchedLocation.lat) > 0.001 ||
        Math.abs(coordinates.longitude - lastFetchedLocation.lng) > 0.001;
      
      if (hasLocationChanged) {
        console.log('🗺️ Location detected, fetching nearby clinics...');
        fetchClinics(coordinates.latitude, coordinates.longitude, 10);
        setLastFetchedLocation({ lat: coordinates.latitude, lng: coordinates.longitude });
      }
    }
  }, [coordinates, status]); // Remove fetchClinics from dependencies


  const renderLocationStatus = () => {
    switch (status) {
      case 'idle':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle>Find Healthcare Near You</CardTitle>
              <CardDescription>
                We need your location to show nearby hospitals and clinics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={requestLocation} 
                className="w-full" 
                disabled={!isSupported}
              >
                <Navigation className="mr-2 h-4 w-4" />
                Enable Location
              </Button>
              {!isSupported && (
                <p className="text-sm text-muted-foreground text-center mt-2">
                  Geolocation is not supported by your browser
                </p>
              )}
            </CardContent>
          </Card>
        );

      case 'requesting':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                <Navigation className="h-8 w-8 text-yellow-600 animate-pulse" />
              </div>
              <CardTitle>Requesting Location...</CardTitle>
              <CardDescription>
                {attemptInfo ? (
                  `Attempt ${attemptInfo.currentAttempt} of ${attemptInfo.maxAttempts} - Getting precise location...`
                ) : (
                  'Please allow location access in your browser'
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        );

      case 'granted':
        return (
          <div className="w-full max-w-2xl mx-auto space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Location detected successfully! Check the browser console for coordinates.
              </AlertDescription>
            </Alert>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  Your Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                {position && coordinates && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Latitude</p>
                        <p className="font-mono text-sm">{coordinates.latitude.toFixed(6)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Longitude</p>
                        <p className="font-mono text-sm">{coordinates.longitude.toFixed(6)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Accuracy</p>
                        <p className={`text-sm font-medium ${
                          coordinates.accuracy <= 100 ? 'text-green-600' :
                          coordinates.accuracy <= 500 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {Math.round(coordinates.accuracy)} meters
                          {coordinates.accuracy <= 100 && ' ✅'}
                          {coordinates.accuracy > 100 && coordinates.accuracy <= 500 && ' ⚠️'}
                          {coordinates.accuracy > 500 && ' ❌'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
                        <p className="text-sm">{new Date(position.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Attempts</p>
                        <p className="text-sm">{attemptInfo.currentAttempt} / {attemptInfo.maxAttempts}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Quality</p>
                        <p className={`text-sm font-medium ${
                          coordinates.accuracy <= 100 ? 'text-green-600' :
                          coordinates.accuracy <= 500 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {coordinates.accuracy <= 100 ? 'Excellent' :
                           coordinates.accuracy <= 500 ? 'Good' :
                           'Poor'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {coordinates && coordinates.accuracy > 1000 && (
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Poor location accuracy detected ({Math.round(coordinates.accuracy)}m). 
                      This suggests GPS issues.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2 mt-4">
                  <Button 
                    onClick={requestLocation} 
                    variant="outline"
                  >
                    <Navigation className="mr-2 h-4 w-4" />
                    Refresh Location
                  </Button>
                  
                  {coordinates && coordinates.accuracy > 1000 && (
                    <Button 
                      onClick={() => setShowDiagnostics(!showDiagnostics)} 
                      variant="outline"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Run Diagnostics
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* OpenStreetMap Display */}
            <Card>
              <CardHeader>
                <CardTitle>Healthcare Map</CardTitle>
                <CardDescription>
                  Interactive map showing your location and nearby healthcare facilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96 w-full">
                  <LeafletMap
                    center={coordinates ? [coordinates.latitude, coordinates.longitude] : [13.0827, 80.2707]}
                    zoom={14}
                    height="100%"
                    showCurrentLocation={true}
                    currentLocation={coordinates ? [coordinates.latitude, coordinates.longitude] : undefined}
                    hospitals={nearbyClinics.map(clinic => ({
                      id: clinic.id,
                      name: clinic.name,
                      latitude: clinic.latitude,
                      longitude: clinic.longitude,
                      address: `${clinic.address}, ${clinic.city}`,
                      rating: undefined, // Real rating data would come from reviews/feedback
                      distance: clinic.distance,
                      phone: clinic.phone,
                      openingHours: clinic.openingHours
                    }))}
                    onMapReady={(map) => {
                      console.log('Map is ready!', map);
                      console.log(`Displaying ${clinicsCount} clinics on map`);
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Nearby Clinics Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Nearby Clinics (0-10km)</span>
                  {clinicsLoading && (
                    <div className="animate-pulse text-sm text-muted-foreground">Loading...</div>
                  )}
                </CardTitle>
                <CardDescription>
                  {clinicsCount > 0 ? 
                    `Found ${clinicsCount} clinic${clinicsCount !== 1 ? 's' : ''} within 10km of your location` :
                    clinicsLoading ? 'Searching for nearby clinics...' :
                    clinicsError ? 'Unable to load nearby clinics' :
                    'No clinics found within 10km'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {clinicsError ? (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {clinicsError}
                    </AlertDescription>
                  </Alert>
                ) : clinicsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-muted-foreground">Finding nearby clinics...</span>
                  </div>
                ) : clinicsCount > 0 ? (
                  <div className="space-y-3">
                    {nearbyClinics.slice(0, 5).map((clinic) => (
                      <div key={clinic.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{clinic.name}</h4>
                          <p className="text-sm text-muted-foreground">{clinic.address}, {clinic.city}</p>
                          <p className="text-xs text-green-600 font-medium">{clinic.distance.toFixed(1)} km away</p>
                        </div>
                        <Button variant="outline" size="sm">
                          View Doctors
                        </Button>
                      </div>
                    ))}
                    {clinicsCount > 5 && (
                      <p className="text-sm text-muted-foreground text-center pt-2">
                        And {clinicsCount - 5} more clinic{clinicsCount - 5 !== 1 ? 's' : ''} on the map
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No clinics found within 10km.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Try refreshing your location or expanding the search radius.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'denied':
      case 'error':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle>Location Access Required</CardTitle>
              <CardDescription>
                {error}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button onClick={requestLocation} className="w-full">
                  <Navigation className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>To enable location:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Click the location icon in your browser's address bar</li>
                    <li>Select "Always allow" for this site</li>
                    <li>Refresh the page and try again</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Healthcare Near You</h1>
        <p className="text-muted-foreground mt-2">
          Discover nearby hospitals, clinics, and specialists
        </p>
      </div>
      
      {renderLocationStatus()}
      
      {/* Diagnostics Section */}
      {showDiagnostics && (
        <div className="mt-8">
          <LocationDiagnostics />
        </div>
      )}
    </div>
  );
}
