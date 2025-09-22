import React from 'react';
import { Shield, ArrowLeft, Eye, Lock, UserCheck, Settings, Database, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PatientFooter from '@/components/PatientFooter';
import { useLocation } from 'wouter';

const PrivacyPolicy: React.FC = () => {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Introduction */}
          <Card className="mb-8">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">We Protect Your Privacy and Data</h2>
                <p className="text-gray-600">
                  Your privacy is important to us. This policy explains how we collect, use, and protect your information.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Information We Collect */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Database className="h-5 w-5 text-blue-600" />
                1. Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <UserCheck className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Personal Information</h4>
                      <p className="text-sm text-gray-600">Name, age, gender, contact details</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Booking Information</h4>
                      <p className="text-sm text-gray-600">Hospital, doctor, token number, date/time</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Settings className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">App Usage</h4>
                      <p className="text-sm text-gray-600">Preferences, notifications</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Share2 className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Location (Optional)</h4>
                      <p className="text-sm text-gray-600">Used for travel-time reminders if enabled</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Use of Data */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-blue-600" />
                2. Use of Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span className="text-gray-700">To process bookings and payments</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-gray-700">To send token and schedule updates</span>
                  </li>
                </ul>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <span className="text-gray-700">To improve app experience</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                    <span className="text-gray-700">To provide customer support</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Data Sharing */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Share2 className="h-5 w-5 text-blue-600" />
                3. Data Sharing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  <span className="text-gray-700">Shared only with hospitals/doctors you book</span>
                </div>
                <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
                  <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                  <span className="text-gray-700">Never sold to third parties</span>
                </div>
                <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
                  <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
                  <span className="text-gray-700">May be shared if legally required</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-blue-600" />
                4. Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="text-gray-700">Encrypted storage and secure payments</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="text-gray-700">Restricted access to authorized personnel only</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <UserCheck className="h-5 w-5 text-blue-600" />
                5. Your Rights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <span className="text-gray-700">Update, correct, or delete your data anytime</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <span className="text-gray-700">Request account deletion via in-app support</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <span className="text-gray-700">Control notifications and location sharing in settings</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="mb-8">
            <CardContent className="p-6 bg-blue-50 border-blue-200">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Questions About Your Privacy?</h3>
                <p className="text-gray-600 mb-4">
                  If you have any questions about this Privacy Policy, please contact our support team.
                </p>
                <Button
                  onClick={() => setLocation('/contact-us')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <PatientFooter />
    </div>
  );
};

export default PrivacyPolicy;