import React from 'react';
import { FileText } from 'lucide-react';
import PolicyPageRenderer from '@/components/PolicyPageRenderer';

const AdditionalPolicies: React.FC = () => {
  return (
    <PolicyPageRenderer
      policyKey="policy_additional"
      icon={<FileText className="h-6 w-6 text-blue-600" />}
      title="Disclaimer Policy"
    />
  );
};

export default AdditionalPolicies;
