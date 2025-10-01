import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  Satellite, 
  Wifi, 
  Shield, 
  Clock, 
  Navigation,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react';

interface DiagnosticResult {
  test: string;
  status: 'pass' | 'fail' | 'warning' | 'unknown';
  message: string;
  details?: string;
}

export function LocationDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setDiagnostics([]);
    const results: DiagnosticResult[] = [];

    // Test 1: Geolocation API Support
    results.push({
      test: 'Geolocation API Support',
      status: 'geolocation' in navigator ? 'pass' : 'fail',
      message: 'geolocation' in navigator ? 'Geolocation API is supported' : 'Geolocation API not supported',
      details: 'geolocation' in navigator ? 'Your browser supports the Geolocation API' : 'Your browser does not support geolocation'
    });

    // Test 2: HTTPS/Secure Context
    const isSecure = window.isSecureContext;
    results.push({
      test: 'Secure Context (HTTPS)',
      status: isSecure ? 'pass' : 'fail',
      message: isSecure ? 'Running in secure context' : 'Not running in secure context',
      details: isSecure ? 'HTTPS or localhost - geolocation should work' : 'Geolocation requires HTTPS in production'
    });

    // Test 3: Permission Status
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      results.push({
        test: 'Location Permission',
        status: permission.state === 'granted' ? 'pass' : permission.state === 'prompt' ? 'warning' : 'fail',
        message: `Permission status: ${permission.state}`,
        details: permission.state === 'granted' ? 'Location access granted' : 
                permission.state === 'prompt' ? 'Permission will be requested' :
                'Location access denied - check browser settings'
      });
    } catch (error) {
      results.push({
        test: 'Location Permission',
        status: 'unknown',
        message: 'Could not check permission status',
        details: 'Permission API not supported or failed'
      });
    }

    // Test 4: High Accuracy GPS Test
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('GPS timeout after 30 seconds'));
        }, 30000);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeout);
            setCurrentLocation(position);
            const accuracy = position.coords.accuracy;
            
            results.push({
              test: 'High Accuracy GPS',
              status: accuracy <= 100 ? 'pass' : accuracy <= 1000 ? 'warning' : 'fail',
              message: `GPS accuracy: ${Math.round(accuracy)}m`,
              details: `Coordinates: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
            });
            resolve();
          },
          (error) => {
            clearTimeout(timeout);
            results.push({
              test: 'High Accuracy GPS',
              status: 'fail',
              message: `GPS failed: ${error.message}`,
              details: `Error code: ${error.code} - ${getGeoLocationErrorMessage(error.code)}`
            });
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 0
          }
        );
      });
    } catch (error) {
      // GPS test already added result in catch block
    }

    // Test 5: Network Location Test
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Network location timeout'));
        }, 10000);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeout);
            const accuracy = position.coords.accuracy;
            
            results.push({
              test: 'Network Location',
              status: accuracy <= 5000 ? 'pass' : 'warning',
              message: `Network accuracy: ${Math.round(accuracy)}m`,
              details: `This is likely cell tower/Wi-Fi based location`
            });
            resolve();
          },
          (error) => {
            clearTimeout(timeout);
            results.push({
              test: 'Network Location',
              status: 'fail',
              message: `Network location failed: ${error.message}`,
              details: `Even network-based location is not working`
            });
            reject(error);
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000
          }
        );
      });
    } catch (error) {
      // Network test already added result in catch block
    }

    // Test 6: Device Capabilities
    const hasOrientation = 'DeviceOrientationEvent' in window;
    const hasMotion = 'DeviceMotionEvent' in window;
    
    results.push({
      test: 'Device Sensors',
      status: hasOrientation && hasMotion ? 'pass' : 'warning',
      message: `Orientation: ${hasOrientation ? '✓' : '✗'}, Motion: ${hasMotion ? '✓' : '✗'}`,
      details: 'Device sensors can help with location accuracy'
    });

    setDiagnostics(results);
    setIsRunning(false);
  };

  const getGeoLocationErrorMessage = (code: number): string => {
    switch (code) {
      case 1: return 'Permission denied by user';
      case 2: return 'Position unavailable (GPS/network error)';
      case 3: return 'Request timeout';
      default: return 'Unknown error';
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'fail': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default: return <Settings className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass': return 'bg-green-50 border-green-200';
      case 'fail': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const generateRecommendations = () => {
    const failed = diagnostics.filter(d => d.status === 'fail');
    const warnings = diagnostics.filter(d => d.status === 'warning');
    
    const recommendations: string[] = [];

    if (failed.some(d => d.test === 'Location Permission')) {
      recommendations.push('Enable location permissions in your browser settings');
      recommendations.push('Clear site data and reload to reset permissions');
    }

    if (failed.some(d => d.test === 'High Accuracy GPS')) {
      recommendations.push('Go outdoors to get better GPS signal');
      recommendations.push('Enable "High Accuracy" mode in your device location settings');
      recommendations.push('Turn off "Battery Saver" mode which can disable GPS');
      recommendations.push('Restart your browser and try again');
    }

    if (warnings.some(d => d.test === 'High Accuracy GPS')) {
      recommendations.push('Move away from tall buildings or indoor spaces');
      recommendations.push('Wait longer for GPS to acquire satellite lock');
      recommendations.push('Ensure your device has a clear view of the sky');
    }

    if (!window.isSecureContext) {
      recommendations.push('Use HTTPS or localhost for geolocation to work properly');
    }

    return recommendations;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-6 w-6" />
          Location Diagnostics
        </CardTitle>
        <CardDescription>
          Comprehensive analysis of why your location accuracy is poor (10529m)
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Current Problem Alert */}
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Issue Detected:</strong> Your device is using cell tower triangulation 
            (accuracy: 10529m) instead of GPS. This suggests GPS is not available or blocked.
          </AlertDescription>
        </Alert>

        {/* Run Diagnostics Button */}
        <div className="text-center">
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning}
            size="lg"
          >
            {isRunning ? (
              <>
                <Settings className="mr-2 h-4 w-4 animate-spin" />
                Running Diagnostics...
              </>
            ) : (
              <>
                <Navigation className="mr-2 h-4 w-4" />
                Run Location Diagnostics
              </>
            )}
          </Button>
        </div>

        {/* Diagnostic Results */}
        {diagnostics.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Diagnostic Results</h3>
            {diagnostics.map((result, index) => (
              <div
                key={index}
                className={`p-4 border rounded-lg ${getStatusColor(result.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <p className="font-medium">{result.test}</p>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                    </div>
                  </div>
                  <Badge variant={result.status === 'pass' ? 'default' : 'destructive'}>
                    {result.status.toUpperCase()}
                  </Badge>
                </div>
                {result.details && (
                  <p className="text-xs text-muted-foreground mt-2 ml-8">
                    {result.details}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Current Location Info */}
        {currentLocation && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Location Reading</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Latitude</p>
                  <p className="font-mono">{currentLocation.coords.latitude.toFixed(6)}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Longitude</p>
                  <p className="font-mono">{currentLocation.coords.longitude.toFixed(6)}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Accuracy</p>
                  <p className={`font-medium ${
                    currentLocation.coords.accuracy <= 100 ? 'text-green-600' :
                    currentLocation.coords.accuracy <= 1000 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {Math.round(currentLocation.coords.accuracy)}m
                  </p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Timestamp</p>
                  <p>{new Date(currentLocation.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {diagnostics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recommendations</CardTitle>
              <CardDescription>
                Steps to improve your location accuracy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {generateRecommendations().map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-600 mt-1">•</span>
                    {recommendation}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">Browser</p>
                <p>{navigator.userAgent.split(' ').slice(-2).join(' ')}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Platform</p>
                <p>{navigator.platform}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Secure Context</p>
                <p>{window.isSecureContext ? 'Yes (HTTPS/localhost)' : 'No (HTTP)'}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Online</p>
                <p>{navigator.onLine ? 'Connected' : 'Offline'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}