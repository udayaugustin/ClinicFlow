import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import PatientFooter from '@/components/PatientFooter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface PolicyPageRendererProps {
  policyKey: string;
  icon: React.ReactNode;
  title: string;
}

const PolicyPageRenderer: React.FC<PolicyPageRendererProps> = ({ policyKey, icon, title }) => {
  const [, setLocation] = useLocation();
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPolicy();
  }, [policyKey]);

  const fetchPolicy = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('GET', `/api/policies/${policyKey}`);
      const data = await response.json();
      setContent(data.content);
    } catch (error) {
      console.error('Error fetching policy:', error);
      toast({
        title: 'Error',
        description: 'Failed to load policy content',
        variant: 'destructive'
      });
      setContent('<p>Failed to load content. Please try again later.</p>');
    } finally {
      setIsLoading(false);
    }
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
              {icon}
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {isLoading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600 mb-4" />
                <p className="text-gray-600">Loading content...</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8">
                <div 
                  className="prose prose-slate max-w-none
                    prose-headings:text-gray-900 
                    prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-4
                    prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-4
                    prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3
                    prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4
                    prose-ul:list-disc prose-ul:ml-6 prose-ul:mb-4
                    prose-ol:list-decimal prose-ol:ml-6 prose-ol:mb-4
                    prose-li:text-gray-700 prose-li:mb-2
                    prose-strong:text-gray-900 prose-strong:font-semibold
                    prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <PatientFooter />
    </div>
  );
};

export default PolicyPageRenderer;
