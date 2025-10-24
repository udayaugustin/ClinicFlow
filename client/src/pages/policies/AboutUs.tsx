import React from 'react';
import { Heart } from 'lucide-react';
import PolicyPageRenderer from '@/components/PolicyPageRenderer';

const AboutUs: React.FC = () => {
  return (
    <PolicyPageRenderer
      policyKey="policy_about_us"
      icon={<Heart className="h-6 w-6 text-blue-600" />}
      title="About Us"
    />
  );
};

export default AboutUs;
