import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGeolocation } from '@/hooks/use-geolocation';

export default function MapPage() {
  const {
    status,
    position,
    error,
    isSupported,
    coordinates,
    requestLocation
  } = useGeolocation({ autoRequest: true });


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
                Please allow location access in your browser
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
                        <p className="text-sm">{Math.round(coordinates.accuracy)} meters</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
                        <p className="text-sm">{new Date(position.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                )}
                <Button 
                  onClick={requestLocation} 
                  variant="outline" 
                  className="mt-4"
                >
                  <Navigation className="mr-2 h-4 w-4" />
                  Refresh Location
                </Button>
              </CardContent>
            </Card>
            
            {/* Placeholder for future map and search results */}
            <Card>
              <CardHeader>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  Nearby hospitals and clinics will appear here
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  🔍 Feature coming soon: Find ENT specialists within 5-10 km
                </p>
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
    </div>
  );
}