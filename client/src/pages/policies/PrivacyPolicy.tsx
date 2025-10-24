import React from 'react';
import { Shield } from 'lucide-react';
import PolicyPageRenderer from '@/components/PolicyPageRenderer';

const PrivacyPolicy: React.FC = () => {
  return (
    <PolicyPageRenderer
      policyKey="policy_privacy"
      icon={<Shield className="h-6 w-6 text-blue-600" />}
      title="Privacy Policy"
    />
  );
};

export default PrivacyPolicy;
