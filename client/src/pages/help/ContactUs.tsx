import React from 'react';
import { FileText } from 'lucide-react';
import PolicyPageRenderer from '@/components/PolicyPageRenderer';

import { useLocation } from 'wouter';

const ContactUs: React.FC = () => {
   return (
     <PolicyPageRenderer
       policyKey="policy_contactUs"
       icon={<FileText className="h-6 w-6 text-blue-600" />}
       title="Contact US"
     />
   );
};

export default ContactUs;