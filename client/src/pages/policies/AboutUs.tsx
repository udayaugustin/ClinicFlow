import React from 'react';
import { ArrowLeft, Heart, Shield, Clock, Users, CheckCircle, Star, Target, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PatientFooter from '@/components/PatientFooter';
import { useLocation } from 'wouter';

const AboutUs: React.FC = () => {
  const [, setLocation] = useLocation();

  const values = [
    {
      icon: <Heart className="h-8 w-8 text-red-500" />,
      title: "Patient First",
      description: "Every decision we make puts patient convenience and health outcomes at the center."
    },
    {
      icon: <Shield className="h-8 w-8 text-blue-500" />,
      title: "Trust & Security",
      description: "We maintain the highest standards of data privacy and security for all healthcare information."
    },
    {
      icon: <Clock className="h-8 w-8 text-green-500" />,
      title: "Time Respect",
      description: "We value everyone's time—patients, doctors, and healthcare staff—and work to eliminate unnecessary delays."
    },
    {
      icon: <Lightbulb className="h-8 w-8 text-yellow-500" />,
      title: "Innovation",
      description: "We continuously innovate to make healthcare more accessible, efficient, and user-friendly."
    }
  ];

  const features = [
    "Smart Queue Management",
    "Real-time Notifications",
    "Multi-platform Access",
    "Secure Data Handling",
    "Hospital Integration",
    "24/7 Support"
  ];

  const milestones = [
    {
      year: "2024",
      title: "Clinik Launch",
      description: "Launched our digital queue management platform for healthcare providers"
    },
    {
      year: "2024",
      title: "First Partnerships",
      description: "Partnered with leading hospitals and clinics to improve patient experience"
    },
    {
      year: "2024",
      title: "Growing Impact",
      description: "Continuously expanding to serve more patients and healthcare providers"
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
              <Heart className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">About Clinik</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Hero Section */}
          <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-blue-100 rounded-full">
                    <Heart className="h-12 w-12 text-blue-600" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Transforming Healthcare Experience
                </h2>
                <p className="text-lg text-gray-700 max-w-3xl mx-auto leading-relaxed">
                  Clinik is a digital healthcare platform that revolutionizes how patients interact with 
                  healthcare providers by eliminating long waiting times and providing real-time updates 
                  about appointments and queue status.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Mission & Vision */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Target className="h-6 w-6 text-blue-600" />
                  Our Mission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  To make healthcare more accessible and efficient by providing patients with real-time 
                  information about their appointments, reducing wait times, and improving the overall 
                  healthcare experience through innovative technology solutions.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Star className="h-6 w-6 text-yellow-600" />
                  Our Vision
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  To become the leading digital healthcare platform that connects patients and healthcare 
                  providers seamlessly, creating a world where healthcare access is transparent, efficient, 
                  and patient-centered.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* What We Do */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Users className="h-6 w-6 text-green-600" />
                What We Do
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-700 leading-relaxed">
                Clinik bridges the gap between patients and healthcare providers through our comprehensive 
                digital platform that offers:
              </p>
              
              <div className="grid md:grid-cols-3 gap-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Key Services:</h3>
                <div className="space-y-3">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold text-gray-900">Token Booking System</h4>
                    <p className="text-gray-600">
                      Book consultation tokens digitally and get real-time updates about your queue position.
                    </p>
                  </div>
                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="font-semibold text-gray-900">Queue Management</h4>
                    <p className="text-gray-600">
                      Advanced queue management system that provides accurate waiting time estimates.
                    </p>
                  </div>
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="font-semibold text-gray-900">Smart Notifications</h4>
                    <p className="text-gray-600">
                      Receive instant notifications about doctor arrivals, delays, and your turn.
                    </p>
                  </div>
                  <div className="border-l-4 border-orange-500 pl-4">
                    <h4 className="font-semibold text-gray-900">Hospital Integration</h4>
                    <p className="text-gray-600">
                      Seamless integration with healthcare providers to ensure accurate information flow.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Our Values */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Our Core Values</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {values.map((value, index) => (
                  <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      {value.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{value.title}</h3>
                      <p className="text-gray-600">{value.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Our Journey */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Our Journey</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {milestones.map((milestone, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm">{milestone.year}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{milestone.title}</h3>
                      <p className="text-gray-600">{milestone.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Important Notice */}
          <Card className="mb-8 border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-amber-800">Important Notice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 text-amber-700">
                <Shield className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-2">About Healthcare Services</p>
                  <p className="text-sm leading-relaxed">
                    Clinik is a technology platform that facilitates appointment booking and queue management. 
                    We are not a healthcare provider, hospital, or medical service provider. All medical consultations, 
                    treatments, and healthcare services are provided directly by the registered healthcare providers 
                    and hospitals on our platform.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 text-amber-700">
                <Users className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-2">Consultation Fees</p>
                  <p className="text-sm leading-relaxed">
                    Consultation fees are set and collected directly by healthcare providers. Clinik only 
                    charges a small platform fee for booking and queue management services. We do not collect 
                    or process consultation fees on behalf of healthcare providers.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Us */}
          <Card>
            <CardContent className="p-6 bg-blue-50 border-blue-200">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Get in Touch</h3>
                <p className="text-gray-600 mb-4">
                  Have questions about Clinik or want to partner with us?
                </p>
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={() => setLocation('/contact-us')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Contact Us
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
        </div>
      </div>

      {/* Footer */}
      <PatientFooter />
    </div>
  );
};

export default AboutUs;