import React from 'react';
import { RefreshCw } from 'lucide-react';
import PolicyPageRenderer from '@/components/PolicyPageRenderer';

const CancellationRefund: React.FC = () => {
  return (
    <PolicyPageRenderer
      policyKey="policy_cancellation_refund"
      icon={<RefreshCw className="h-6 w-6 text-blue-600" />}
      title="Cancellation & Refund Policy"
    />
  );
};

export default CancellationRefund;
