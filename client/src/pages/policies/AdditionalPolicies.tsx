import React from 'react';
import { ArrowLeft, FileText, Shield, AlertTriangle, Users, Clock, CreditCard, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PatientFooter from '@/components/PatientFooter';
import { useLocation } from 'wouter';

const AdditionalPolicies: React.FC = () => {
  const [, setLocation] = useLocation();

  const policies = [
    {
      icon: <Shield className="h-6 w-6 text-blue-600" />,
      title: "Data Security Policy",
      content: [
        {
          subtitle: "Encryption Standards",
          text: "All patient data is encrypted using industry-standard AES-256 encryption during transmission and storage."
        },
        {
          subtitle: "Access Controls",
          text: "Multi-factor authentication and role-based access controls ensure only authorized personnel can access sensitive information."
        },
        {
          subtitle: "Data Backup",
          text: "Regular automated backups are performed to ensure data integrity and availability in case of system failures."
        },
        {
          subtitle: "Security Monitoring",
          text: "24/7 monitoring systems detect and prevent unauthorized access attempts and security threats."
        }
      ]
    },
    {
      icon: <Users className="h-6 w-6 text-green-600" />,
      title: "Non-Discrimination Policy",
      content: [
        {
          subtitle: "Equal Access",
          text: "ClinicFlow is committed to providing equal access to all users regardless of race, gender, religion, age, disability, or sexual orientation."
        },
        {
          subtitle: "Healthcare Providers",
          text: "We work only with licensed healthcare providers who maintain non-discriminatory practices in their medical services."
        },
        {
          subtitle: "Platform Usage",
          text: "All users are expected to treat others with respect and dignity when using our platform and services."
        },
        {
          subtitle: "Reporting Discrimination",
          text: "Users can report discriminatory behavior through our support channels, and appropriate action will be taken."
        }
      ]
    },
    {
      icon: <Clock className="h-6 w-6 text-orange-600" />,
      title: "Service Availability Policy",
      content: [
        {
          subtitle: "Platform Availability",
          text: "ClinicFlow aims to maintain 99.5% uptime for our platform services, with scheduled maintenance performed during low-usage hours."
        },
        {
          subtitle: "Emergency Maintenance",
          text: "In case of critical security updates or system issues, emergency maintenance may be performed with minimal advance notice."
        },
        {
          subtitle: "Service Interruptions",
          text: "Users will be notified of planned maintenance at least 24 hours in advance through app notifications and email."
        },
        {
          subtitle: "Backup Systems",
          text: "Redundant systems and failover mechanisms are in place to minimize service disruptions."
        }
      ]
    },
    {
      icon: <CreditCard className="h-6 w-6 text-purple-600" />,
      title: "Payment and Billing Policy",
      content: [
        {
          subtitle: "Platform Fees",
          text: "ClinicFlow charges a small platform fee for booking and queue management services, clearly displayed before payment."
        },
        {
          subtitle: "Payment Methods",
          text: "We accept major credit cards, debit cards, and digital wallets. All payments are processed through secure, PCI-compliant systems."
        },
        {
          subtitle: "Billing Disputes",
          text: "Users can dispute charges within 60 days of the transaction. We will investigate and resolve disputes within 7 business days."
        },
        {
          subtitle: "Refund Processing",
          text: "Eligible refunds are processed within 5-7 business days back to the original payment method."
        },
        {
          subtitle: "Consultation Fees",
          text: "ClinicFlow does not collect consultation fees. These are paid directly to healthcare providers and are subject to their individual policies."
        }
      ]
    },
    {
      icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
      title: "Liability Limitations",
      content: [
        {
          subtitle: "Platform Liability",
          text: "ClinicFlow's liability is limited to the platform fees paid for the specific service where issues occurred."
        },
        {
          subtitle: "Healthcare Provider Responsibility",
          text: "Healthcare providers are solely responsible for the quality, safety, and outcomes of medical consultations and treatments."
        },
        {
          subtitle: "Technical Issues",
          text: "While we strive for optimal performance, ClinicFlow is not liable for losses due to technical failures beyond our control."
        },
        {
          subtitle: "Third-Party Services",
          text: "We are not responsible for issues arising from third-party payment processors, healthcare providers, or external systems."
        },
        {
          subtitle: "Maximum Liability",
          text: "Our total liability to any user shall not exceed the total platform fees paid by that user in the 12 months prior to the claim."
        }
      ]
    },
    {
      icon: <FileText className="h-6 w-6 text-indigo-600" />,
      title: "Intellectual Property Policy",
      content: [
        {
          subtitle: "ClinicFlow IP",
          text: "All content, software, designs, and trademarks on the ClinicFlow platform are owned by ClinicFlow or our licensors."
        },
        {
          subtitle: "User Content",
          text: "Users retain ownership of their personal information but grant ClinicFlow permission to use it for providing services."
        },
        {
          subtitle: "Copyright Protection",
          text: "We respect intellectual property rights and will respond to valid DMCA takedown notices promptly."
        },
        {
          subtitle: "Permitted Use",
          text: "Users may not copy, modify, distribute, or create derivative works from ClinicFlow's proprietary content."
        }
      ]
    }
  ];

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
              <h1 className="text-2xl font-bold text-gray-900">Additional Policies</h1>
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
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Additional Policies</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Comprehensive policies governing various aspects of ClinicFlow services, 
                  ensuring transparency and clarity in our operations.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Policy Sections */}
          <div className="space-y-8">
            {policies.map((policy, policyIndex) => (
              <Card key={policyIndex} className="overflow-hidden">
                <CardHeader className="bg-gray-50 border-b">
                  <CardTitle className="flex items-center gap-3">
                    {policy.icon}
                    {policy.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {policy.content.map((section, sectionIndex) => (
                      <div key={sectionIndex}>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                          {section.subtitle}
                        </h3>
                        <p className="text-gray-700 leading-relaxed pl-4 border-l-4 border-blue-200">
                          {section.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Important Notice */}
          <Card className="mt-8 border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-amber-800">
                <AlertTriangle className="h-6 w-6" />
                Important Notice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-amber-700 space-y-3">
                <p className="leading-relaxed">
                  <strong>Medical Disclaimer:</strong> ClinicFlow is a technology platform that facilitates 
                  appointment booking and queue management. We do not provide medical advice, diagnosis, or treatment. 
                  All healthcare services are provided by licensed healthcare professionals and facilities.
                </p>
                <p className="leading-relaxed">
                  <strong>Policy Updates:</strong> These policies may be updated from time to time. 
                  Users will be notified of significant changes via email or in-app notifications. 
                  Continued use of the platform constitutes acceptance of updated policies.
                </p>
                <p className="leading-relaxed">
                  <strong>Jurisdiction:</strong> These policies are governed by the laws of India, 
                  and any disputes will be resolved in the appropriate courts of jurisdiction.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="mt-8">
            <CardContent className="p-6 bg-blue-50 border-blue-200">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Policy Questions?</h3>
                <p className="text-gray-600 mb-4">
                  If you have questions about these policies or need clarification on any terms, please contact us.
                </p>
                <div className="flex justify-center gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>support@clinicflow.com</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>+91-XXXX-XXXXXX</span>
                  </div>
                </div>
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={() => setLocation('/contact-us')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Contact Support
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setLocation('/help/faqs')}
                  >
                    View FAQs
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Related Documents */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Related Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-auto p-4 text-left flex flex-col items-start"
                  onClick={() => setLocation('/policies/privacy-policy')}
                >
                  <Shield className="h-5 w-5 text-blue-600 mb-2" />
                  <span className="font-semibold">Privacy Policy</span>
                  <span className="text-sm text-gray-600">How we collect and protect your data</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto p-4 text-left flex flex-col items-start"
                  onClick={() => setLocation('/policies/terms-conditions')}
                >
                  <FileText className="h-5 w-5 text-green-600 mb-2" />
                  <span className="font-semibold">Terms & Conditions</span>
                  <span className="text-sm text-gray-600">Rules and guidelines for using ClinicFlow</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto p-4 text-left flex flex-col items-start"
                  onClick={() => setLocation('/policies/cancellation-refund')}
                >
                  <CreditCard className="h-5 w-5 text-purple-600 mb-2" />
                  <span className="font-semibold">Cancellation & Refund</span>
                  <span className="text-sm text-gray-600">Policies for cancellations and refunds</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto p-4 text-left flex flex-col items-start"
                  onClick={() => setLocation('/policies/about-us')}
                >
                  <Users className="h-5 w-5 text-orange-600 mb-2" />
                  <span className="font-semibold">About ClinicFlow</span>
                  <span className="text-sm text-gray-600">Learn more about our mission and values</span>
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

export default AdditionalPolicies;