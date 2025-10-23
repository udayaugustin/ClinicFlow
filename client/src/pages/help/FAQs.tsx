import React from 'react';
import { HelpCircle } from 'lucide-react';
import PolicyPageRenderer from '@/components/PolicyPageRenderer';

const FAQs: React.FC = () => {
  return (
    <PolicyPageRenderer
      policyKey="help_faqs"
      icon={<HelpCircle className="h-6 w-6 text-blue-600" />}
      title="Frequently Asked Questions"
    />
  );
};

export default FAQs;
