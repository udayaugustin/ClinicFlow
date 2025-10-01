import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, AlertCircle, CheckCircle, Satellite, Wifi, Archive, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAdvancedGeolocation } from '@/hooks/use-advanced-geolocation';

export default function AdvancedLocationDemo() {
  const {
    status,
    position,
    error,
    isSupported,
    coordinates,
    requestLocation,
    startWatching,
    stopWatching,
    sources,
    bestSource,
    debugInfo
  } = useAdvancedGeolocation({ 
    autoRequest: true,
    parallelRequests: true,
    useCache: true,
    minAccuracy: 500,
    maxSources: 5
  });

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'gps': return <Satellite className="h-4 w-4" />;
      case 'network': return <Wifi className="h-4 w-4" />;
      case 'cached': return <Archive className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  const getSourceColor = (type: string) => {
    switch (type) {
      case 'gps': return 'bg-green-100 text-green-800';
      case 'network': return 'bg-blue-100 text-blue-800';
      case 'cached': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderLocationStatus = () => {
    switch (status) {
      case 'idle':
        return (
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle>Google-Style Location Detection</CardTitle>
              <CardDescription>
                Advanced location detection using multiple sources like Google Maps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={requestLocation} 
                className="w-full" 
                disabled={!isSupported}
              >
                <Navigation className="mr-2 h-4 w-4" />
                Request Location (Multi-Source)
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
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                <Navigation className="h-8 w-8 text-yellow-600 animate-pulse" />
              </div>
              <CardTitle>Requesting Location from Multiple Sources...</CardTitle>
              <CardDescription>
                Checking GPS, Network, Wi-Fi, and cached locations simultaneously
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Satellite className="h-4 w-4" />
                    GPS (High Accuracy)
                  </span>
                  <span className="animate-pulse">Requesting...</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Wifi className="h-4 w-4" />
                    Network Location
                  </span>
                  <span className="animate-pulse">Requesting...</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Archive className="h-4 w-4" />
                    Cached Location
                  </span>
                  <span>{debugInfo.cacheSize > 0 ? 'Available' : 'None'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'granted':
        return (
          <div className="w-full max-w-4xl mx-auto space-y-6">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Location detected successfully using Google-like multi-source fusion!
              </AlertDescription>
            </Alert>
            
            {/* Main Location Display */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {getSourceIcon(bestSource?.type || 'gps')}
                    Your Location ({bestSource?.type?.toUpperCase() || 'UNKNOWN'})
                  </CardTitle>
                  <Badge className={getSourceColor(bestSource?.type || 'gps')}>
                    Confidence: {Math.round(bestSource?.confidence || 0)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {position && coordinates && (
                  <div className="space-y-4">
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
                        <p className="text-sm font-medium text-muted-foreground">Sources Found</p>
                        <p className="text-sm">{sources.length} source{sources.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Watching</p>
                        <p className="text-sm flex items-center gap-1">
                          {debugInfo.isWatching ? (
                            <>
                              <Eye className="h-3 w-3 text-green-600" />
                              Active
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3 text-gray-600" />
                              Inactive
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        onClick={requestLocation} 
                        variant="outline" 
                        size="sm"
                      >
                        <Navigation className="mr-2 h-4 w-4" />
                        Refresh Location
                      </Button>
                      
                      {!debugInfo.isWatching ? (
                        <Button 
                          onClick={startWatching} 
                          variant="outline" 
                          size="sm"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Start Watching
                        </Button>
                      ) : (
                        <Button 
                          onClick={stopWatching} 
                          variant="outline" 
                          size="sm"
                        >
                          <EyeOff className="mr-2 h-4 w-4" />
                          Stop Watching
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location Sources Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Location Sources Analysis</CardTitle>
                <CardDescription>
                  How Google-like fusion selected the best location
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {debugInfo.sources.map((source, index) => (
                    <div 
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        source.type === bestSource?.type ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {getSourceIcon(source.type)}
                        <div>
                          <p className="font-medium text-sm">{source.type.toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground">
                            {source.accuracy}m accuracy • {source.age}s ago
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="secondary" 
                          className={`${getSourceColor(source.type)} text-xs`}
                        >
                          {source.confidence}% confidence
                        </Badge>
                        {source.type === bestSource?.type && (
                          <Badge variant="default" className="text-xs">
                            SELECTED
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {debugInfo.sources.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No location sources analyzed yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Technical Details */}
            <Card>
              <CardHeader>
                <CardTitle>Technical Details</CardTitle>
                <CardDescription>
                  Advanced location detection metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">Best Source</p>
                    <p>{debugInfo.bestSourceType?.toUpperCase() || 'None'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Cache Size</p>
                    <p>{debugInfo.cacheSize} locations</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Total Sources</p>
                    <p>{debugInfo.sources.length}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Watching Status</p>
                    <p>{debugInfo.isWatching ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'denied':
      case 'error':
        return (
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle>Location Access Issue</CardTitle>
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
                <div className="text-sm text-muted-foreground space-y-2">
                  <p><strong>Google Maps-like tips:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Enable "High Accuracy" location mode in device settings</li>
                    <li>Allow location access for this site</li>
                    <li>Try going outdoors for better GPS signal</li>
                    <li>Check if Wi-Fi and mobile data are enabled</li>
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
        <h1 className="text-3xl font-bold tracking-tight">Advanced Location Detection</h1>
        <p className="text-muted-foreground mt-2">
          Google Maps-style multi-source location fusion with caching and confidence scoring
        </p>
      </div>
      
      {renderLocationStatus()}
    </div>
  );
}