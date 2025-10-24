import React from 'react';
import { FileText } from 'lucide-react';
import PolicyPageRenderer from '@/components/PolicyPageRenderer';

const TermsConditions: React.FC = () => {
  return (
    <PolicyPageRenderer
      policyKey="policy_terms_conditions"
      icon={<FileText className="h-6 w-6 text-blue-600" />}
      title="Terms & Conditions"
    />
  );
};

export default TermsConditions;
