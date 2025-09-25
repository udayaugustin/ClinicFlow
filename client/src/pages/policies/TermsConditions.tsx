import React from 'react';
import { FileText, ArrowLeft, Users, CreditCard, Calendar, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PatientFooter from '@/components/PatientFooter';
import { useLocation } from 'wouter';

const TermsConditions: React.FC = () => {
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
              <FileText className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Terms & Conditions</h1>
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
                <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Terms & Conditions</h2>
                <p className="text-gray-600">
                  By using ClinicFlow, you agree to the following terms and conditions.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Eligibility */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-600" />
                1. Eligibility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="text-gray-700">Users must be 18 years or older</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                  <span className="text-gray-700">Users under 18 must register with parent/guardian consent</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Use */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-blue-600" />
                2. Account Use
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  <span className="text-gray-700">Keep login credentials confidential</span>
                </div>
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <span className="text-gray-700">You are responsible for all actions under your account</span>
                </div>
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    <strong>Warning:</strong> Misuse (fake bookings, multiple no-shows, fraudulent activity) may lead to account suspension.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>

          {/* Token Booking */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-blue-600" />
                3. Token Booking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="text-sm text-gray-700">Token bookings are subject to hospital/doctor availability</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <span className="text-sm text-gray-700">Bookings confirmed only after successful payment</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                      <span className="text-sm text-gray-700">Tokens are non-transferable</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                      <span className="text-sm text-gray-700">Tokens cannot be resold</span>
                    </div>
                  </div>
                </div>
                
                <Alert className="border-blue-200 bg-blue-50">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700">
                    <strong>Payment Note:</strong> Bookings are confirmed only after successful payment of both consultation fee and platform fee.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>

          {/* Hospital & Doctor Responsibility */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-blue-600" />
                4. Hospital & Doctor Responsibility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                  <h4 className="font-semibold text-gray-900 mb-2">Hospital/Doctor Management</h4>
                  <p className="text-sm text-gray-700">Hospitals/doctors manage schedules, consultation delays, and cancellations.</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                  <h4 className="font-semibold text-gray-900 mb-2">ClinicFlow Liability</h4>
                  <p className="text-sm text-gray-700">ClinicFlow is <strong>not liable</strong> for medical services, delays, or outcomes.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Platform Rights */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-blue-600" />
                5. Platform Rights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-700">
                    <strong>Account Suspension:</strong> We may suspend accounts that violate our policies.
                  </AlertDescription>
                </Alert>
                
                <Alert className="border-blue-200 bg-blue-50">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700">
                    <strong>Terms Updates:</strong> Terms may be updated; continued use means you accept updates.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>

          {/* Important Disclaimers */}
          <Card className="mb-8 border-red-200">
            <CardHeader className="bg-red-50">
              <CardTitle className="flex items-center gap-3 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                Important Disclaimers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-lg">
                  <h4 className="font-semibold text-red-900 mb-2">Medical Services</h4>
                  <p className="text-sm text-red-800">
                    ClinicFlow is a technology platform. We do not provide medical advice, consultation, or treatment. 
                    All medical services are provided by hospitals and doctors.
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold text-yellow-900 mb-2">Platform Role</h4>
                  <p className="text-sm text-yellow-800">
                    Our role is limited to booking facilitation and notifications. We are not responsible for 
                    medical outcomes, delays, or emergency situations.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agreement */}
          <Card className="mb-8">
            <CardContent className="p-6 bg-blue-50 border-blue-200">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">By Using ClinicFlow</h3>
                <p className="text-gray-600 mb-4">
                  You acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => setLocation('/policies/privacy-policy')}
                    variant="outline"
                  >
                    Read Privacy Policy
                  </Button>
                  <Button
                    onClick={() => setLocation('/contact-us')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Contact Support
                  </Button>
                </div>
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

export default TermsConditions;