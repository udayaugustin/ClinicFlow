import React from 'react';
import { RefreshCw, ArrowLeft, CheckCircle, XCircle, Clock, CreditCard, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PatientFooter from '@/components/PatientFooter';
import { useLocation } from 'wouter';

const CancellationRefund: React.FC = () => {
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
              <RefreshCw className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Cancellation & Refund Policy</h1>
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
                <RefreshCw className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Cancellation & Refund Policy</h2>
                <p className="text-gray-600">
                  We provide flexibility for both patients and hospitals to cancel bookings with transparent refund processes.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Cancellation Policy */}
          <Card className="mb-8">
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-blue-800">Cancellation Policy</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* Patient-Initiated Cancellation */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  1. Patient-Initiated Cancellation
                </h3>
                <div className="space-y-3 ml-7">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-gray-700">You may cancel a token anytime <strong>before consultation begins</strong></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span className="text-gray-700">Rescheduling may be allowed if the hospital permits</span>
                  </div>
                </div>
              </div>

              {/* Late Arrival */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  2. Late Arrival
                </h3>
                <div className="ml-7">
                  <p className="text-gray-700">
                    If you are late, hospital staff may place your token on <strong>"Hold"</strong> or mark it <strong>"Cancelled"</strong>.
                  </p>
                </div>
              </div>

              {/* Doctor/Hospital Cancellation */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  3. Doctor/Hospital Cancellation
                </h3>
                <div className="space-y-3 ml-7">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                    <span className="text-gray-700">If a doctor cannot attend, the hospital may cancel the schedule</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span className="text-gray-700">All affected patients will be notified immediately</span>
                  </div>
                </div>
              </div>

              <Alert className="mt-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Note:</strong> Rescheduling and cancellation rules depend on each hospital's policy.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Refund Policy */}
          <Card className="mb-8">
            <CardHeader className="bg-green-50">
              <CardTitle className="text-green-800">Refund Policy</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-700 mb-6">
                ClinicFlow follows a transparent refund process for both <strong>consultation fees</strong> (handled by the hospital) 
                and <strong>platform fees</strong> (handled by ClinicFlow).
              </p>

              {/* When Refunds Are Eligible */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  When Refunds Are Eligible
                </h3>
                <div className="space-y-3 ml-7">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-gray-700">Doctor cancels the schedule</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-gray-700">Hospital cancels your booking due to unforeseen reasons</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-gray-700">You cancel your token within the hospital's allowed cancellation window</span>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2">✅ In these cases, you will receive:</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-green-600" />
                      <span className="text-green-700">Consultation fee refund (processed by the hospital/clinic)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-green-600" />
                      <span className="text-green-700">ClinicFlow platform fee refund (processed directly by ClinicFlow)</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* When Refunds Are Not Provided */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  When Refunds Are Not Provided
                </h3>
                <div className="space-y-3 ml-7">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                    <span className="text-gray-700">Patient does not show up</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                    <span className="text-gray-700">Cancellation occurs after consultation has started</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                    <span className="text-gray-700">Cancellation is marked ineligible by hospital rules</span>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-semibold text-red-800 mb-2">❌ In these cases:</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-red-700">Consultation fee refund will not be provided</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-red-700">ClinicFlow platform fee refund will not be provided</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Refund Timeline */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Refund Timeline
                </h3>
                <div className="space-y-4 ml-7">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span className="text-gray-700">
                      Refunds (both consultation + platform fee, where eligible) will be processed within <strong>5–7 business days</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span className="text-gray-700">Refunds will be credited back to your original payment method</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Refund Disputes */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Refund Disputes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="text-gray-700">Patients may raise disputes through the in-app support option</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <span className="text-gray-700">ClinicFlow handles only the platform fee refund</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                  <span className="text-gray-700">Hospital/clinic is solely responsible for consultation fee refunds</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                  <span className="text-gray-700">Final decision on consultation refunds rests with the hospital</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Important Disclaimer */}
          <Card className="mb-8 border-yellow-200">
            <CardContent className="p-6 bg-yellow-50">
              <Alert className="border-yellow-300 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Disclaimer:</strong> ClinicFlow is only a booking platform. While we ensure timely processing of our platform 
                  fee refunds, we are not responsible for disputes regarding hospital consultation fees.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Contact for Support */}
          <Card>
            <CardContent className="p-6 bg-blue-50 border-blue-200">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Help with Cancellations or Refunds?</h3>
                <p className="text-gray-600 mb-4">
                  Our support team is here to assist you with any cancellation or refund queries.
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

export default CancellationRefund;