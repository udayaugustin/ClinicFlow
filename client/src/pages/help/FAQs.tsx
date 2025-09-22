import React, { useState } from 'react';
import { HelpCircle, ArrowLeft, ChevronDown, ChevronRight, Search, Phone, Clock, CreditCard, AlertTriangle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import PatientFooter from '@/components/PatientFooter';
import { useLocation } from 'wouter';

const FAQs: React.FC = () => {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  const faqData = [
    {
      id: 'general',
      title: 'General',
      icon: <HelpCircle className="h-5 w-5" />,
      color: 'blue',
      faqs: [
        {
          id: 'q1',
          question: 'What is ClinicFlow?',
          answer: 'ClinicFlow is a digital platform that helps patients book consultation tokens at hospitals/clinics, track queues in real time, and get updates about schedules. ⚠️Important: ClinicFlow is not a hospital or healthcare provider and does not charge or collect consultation fees. Patients pay consultation fees directly to hospitals/clinics.'
        },
        {
          id: 'q2',
          question: 'Do I need to pay to use ClinicFlow?',
          answer: 'Yes. ClinicFlow charges a small platform fee when you book a token. This fee covers booking, notifications, and real-time tracking services. The consultation fee must be paid directly at the hospital/clinic.'
        },
        {
          id: 'q3',
          question: 'Can I use ClinicFlow without creating an account?',
          answer: 'No. Registration is required to book tokens, receive updates, and track your appointment.'
        }
      ]
    },
    {
      id: 'booking',
      title: 'Booking & Tokens',
      icon: <Phone className="h-5 w-5" />,
      color: 'green',
      faqs: [
        {
          id: 'q4',
          question: 'How do I book a token?',
          answer: '1. Log in to ClinicFlow\n2. Search for your hospital/doctor\n3. Select an available schedule\n4. Pay the ClinicFlow platform fee\n5. You\'ll receive your token number instantly'
        },
        {
          id: 'q5',
          question: 'Do I need to pay the consultation fee in the app?',
          answer: 'No. Consultation fees are collected directly by the hospital/clinic at the time of your visit. ClinicFlow does not handle or process consultation fee payments.'
        },
        {
          id: 'q6',
          question: 'Can I choose a specific consultation time?',
          answer: 'No. Tokens are sequential. You will get an estimated consultation time based on doctor arrival and average consultation duration.'
        },
        {
          id: 'q7',
          question: 'What if I am late for my token?',
          answer: 'If you are late:\n• Hospital staff may place your token on "Hold" and allow you later (depending on hospital policy)\n• If too late, your token may be cancelled by hospital staff'
        },
        {
          id: 'q8',
          question: 'What if the doctor is late?',
          answer: 'You\'ll get notified when the doctor arrives, and your estimated consultation time will be adjusted.'
        }
      ]
    },
    {
      id: 'cancellations',
      title: 'Cancellations',
      icon: <Clock className="h-5 w-5" />,
      color: 'orange',
      faqs: [
        {
          id: 'q9',
          question: 'How can I cancel my token?',
          answer: 'Go to My Bookings > Select Token > Cancel. Tokens must be cancelled before consultation starts.'
        },
        {
          id: 'q10',
          question: 'Can I reschedule my token?',
          answer: 'Rescheduling depends on the hospital\'s policy. Some hospitals allow it, others require a new booking.'
        },
        {
          id: 'q11',
          question: 'What if the doctor cancels the schedule?',
          answer: 'You\'ll be notified instantly. Your ClinicFlow platform fee will be refunded automatically. ⚠️Any consultation fee paid at the hospital must be claimed directly from the hospital.'
        }
      ]
    },
    {
      id: 'payments',
      title: 'Payments & Refunds',
      icon: <CreditCard className="h-5 w-5" />,
      color: 'purple',
      faqs: [
        {
          id: 'q12',
          question: 'What payments are made in ClinicFlow?',
          answer: 'You only pay the ClinicFlow platform fee through the app. The consultation fee is paid separately at the hospital.'
        },
        {
          id: 'q13',
          question: 'When will I get a refund?',
          answer: 'Refunds apply only to the ClinicFlow platform fee. You are eligible if:\n• The doctor/hospital cancels the schedule\n• You cancel your token within the hospital\'s allowed cancellation window'
        },
        {
          id: 'q14',
          question: 'When am I not eligible for a refund?',
          answer: '• If you do not show up\n• If you cancel after the consultation has started\n• If hospital rules mark your cancellation as ineligible'
        },
        {
          id: 'q15',
          question: 'How long does it take to get my refund?',
          answer: 'Eligible ClinicFlow platform fee refunds will be processed within 5–7 business days back to your original payment method.'
        },
        {
          id: 'q16',
          question: 'What about the consultation fee refund?',
          answer: 'ClinicFlow does not collect consultation fees. Any consultation fee refund (if applicable) must be claimed directly from the hospital/clinic. ClinicFlow is not responsible for consultation fee disputes.'
        }
      ]
    },
    {
      id: 'notifications',
      title: 'Notifications & Updates',
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'yellow',
      faqs: [
        {
          id: 'q17',
          question: 'What notifications will I receive?',
          answer: 'You\'ll get real-time notifications for:\n• Token booking start\n• Doctor arrival\n• Token progress (start, hold, pause, cancel)\n• Schedule changes\n• Travel-time reminders (if location enabled)'
        },
        {
          id: 'q18',
          question: 'Can I turn off notifications?',
          answer: 'Yes. You can adjust notification preferences in the app, but we recommend keeping them enabled to avoid missing critical updates.'
        }
      ]
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      icon: <Shield className="h-5 w-5" />,
      color: 'indigo',
      faqs: [
        {
          id: 'q22',
          question: 'Is my data safe?',
          answer: 'Yes. ClinicFlow uses encryption and secure servers. Your data is shared only with the hospital/doctor you book with.'
        },
        {
          id: 'q23',
          question: 'Can I delete my account?',
          answer: 'Yes. You can request account deletion via Settings > Account > Delete Account or contact support.'
        },
        {
          id: 'q24',
          question: 'Does ClinicFlow track my location?',
          answer: 'Only if you enable location services. Location is used for travel-time reminders to help you arrive on time.'
        }
      ]
    }
  ];

  const filteredFaqData = faqData.map(section => ({
    ...section,
    faqs: section.faqs.filter(faq =>
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(section => section.faqs.length > 0);

  const getColorClasses = (color: string) => {
    const colorMap: { [key: string]: string } = {
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      green: 'bg-green-50 border-green-200 text-green-800',
      orange: 'bg-orange-50 border-orange-200 text-orange-800',
      purple: 'bg-purple-50 border-purple-200 text-purple-800',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800'
    };
    return colorMap[color] || 'bg-gray-50 border-gray-200 text-gray-800';
  };

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
              <HelpCircle className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h1>
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
                <HelpCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">How can we help you?</h2>
                <p className="text-gray-600">
                  Find answers to commonly asked questions about ClinicFlow
                </p>
              </div>

              {/* Search */}
              <div className="relative max-w-md mx-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search FAQs..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* FAQ Sections */}
          <div className="space-y-6">
            {filteredFaqData.map((section) => (
              <Card key={section.id} className="overflow-hidden">
                <CardHeader className={`${getColorClasses(section.color)}`}>
                  <CardTitle className="flex items-center gap-3">
                    {section.icon}
                    {section.title}
                    <span className="ml-auto text-sm font-normal">
                      {section.faqs.length} question{section.faqs.length !== 1 ? 's' : ''}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {section.faqs.map((faq, index) => (
                    <Collapsible
                      key={faq.id}
                      open={openItems.has(faq.id)}
                      onOpenChange={() => toggleItem(faq.id)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div className={`p-6 text-left hover:bg-gray-50 transition-colors ${
                          index !== section.faqs.length - 1 ? 'border-b border-gray-100' : ''
                        }`}>
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900 pr-4">{faq.question}</h3>
                            {openItems.has(faq.id) ? (
                              <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-gray-500 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-6 pb-6">
                          <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                            {faq.answer}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* No Results */}
          {searchTerm && filteredFaqData.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <HelpCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-600 mb-4">
                  Try searching with different keywords or browse all categories above.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setSearchTerm('')}
                >
                  Clear Search
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Contact Support */}
          <Card className="mt-8">
            <CardContent className="p-6 bg-blue-50 border-blue-200">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Still have questions?</h3>
                <p className="text-gray-600 mb-4">
                  Can't find the answer you're looking for? Our support team is here to help.
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

export default FAQs;