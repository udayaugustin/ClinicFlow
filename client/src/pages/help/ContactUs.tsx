import React, { useState } from 'react';
import { ArrowLeft, Mail, Phone, MapPin, Clock, Send, MessageCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import PatientFooter from '@/components/PatientFooter';
import { useLocation } from 'wouter';

const ContactUs: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    setTimeout(() => {
      toast({
        title: "Message Sent Successfully",
        description: "Thank you for contacting us. We'll get back to you within 24 hours.",
      });
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      setIsSubmitting(false);
    }, 1000);
  };

  const contactInfo = [
    {
      icon: <Mail className="h-6 w-6 text-blue-600" />,
      title: "Email Us",
      content: "support@clinicflow.com",
      description: "Send us an email anytime"
    },
    {
      icon: <Phone className="h-6 w-6 text-green-600" />,
      title: "Call Us",
      content: "+91-XXXX-XXXXXX",
      description: "Mon-Fri, 9:00 AM - 6:00 PM"
    },
    {
      icon: <MapPin className="h-6 w-6 text-red-600" />,
      title: "Visit Us",
      content: "India",
      description: "Our headquarters"
    },
    {
      icon: <Clock className="h-6 w-6 text-orange-600" />,
      title: "Support Hours",
      content: "24/7 Online Support",
      description: "We're here to help anytime"
    }
  ];

  const quickActions = [
    {
      icon: <HelpCircle className="h-6 w-6 text-blue-600" />,
      title: "View FAQs",
      description: "Find quick answers to common questions",
      action: () => setLocation('/help/faqs')
    },
    {
      icon: <MessageCircle className="h-6 w-6 text-green-600" />,
      title: "Live Chat",
      description: "Chat with our support team",
      action: () => toast({ title: "Live chat feature coming soon!", description: "For now, please use the contact form below." })
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
              <Mail className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Contact Us</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Introduction */}
          <Card className="mb-8">
            <CardContent className="p-8">
              <div className="text-center">
                <Mail className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Get in Touch</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Have questions about ClinicFlow? Need help with your account? 
                  We're here to help you get the most out of our platform.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {quickActions.map((action, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6" onClick={action.action}>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {action.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{action.title}</h3>
                      <p className="text-gray-600">{action.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Contact Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Send className="h-6 w-6 text-blue-600" />
                  Send Us a Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="Enter your phone number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        required
                        placeholder="What's this about?"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      placeholder="Please describe your inquiry in detail..."
                      rows={6}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {contactInfo.map((info, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex-shrink-0">
                        {info.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">{info.title}</h3>
                        <p className="text-lg text-blue-600 font-medium mb-1">{info.content}</p>
                        <p className="text-sm text-gray-600">{info.description}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Support Promise */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">Our Support Promise</h3>
                  <ul className="space-y-2 text-blue-800">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      Response within 24 hours
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      Dedicated support team
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      Multilingual assistance
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      Follow-up until resolved
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Emergency Notice */}
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-red-900 mb-3">Medical Emergency?</h3>
                  <p className="text-red-800 text-sm leading-relaxed">
                    For medical emergencies, please contact emergency services immediately. 
                    ClinicFlow is not a medical service provider and cannot assist with urgent medical situations.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <PatientFooter />
    </div>
  );
};

export default ContactUs;