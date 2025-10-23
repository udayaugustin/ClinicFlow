import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, FileText } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface Policy {
  key: string;
  content: string;
  description: string;
  category: string;
  updatedAt: string;
}

const policyLabels: Record<string, string> = {
  'policy_terms_conditions': 'Terms & Conditions',
  'policy_privacy': 'Privacy Policy',
  'policy_cancellation_refund': 'Cancellation & Refund',
  'policy_additional': 'Additional Policies',
  'policy_about_us': 'About Us',
  'help_faqs': 'FAQs'
};

const PolicyEditor: React.FC = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('GET', '/api/admin/policies');
      const data = await response.json();
      setPolicies(data);
      
      if (data.length > 0 && !selectedPolicy) {
        setSelectedPolicy(data[0].key);
        setContent(data[0].content);
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
      toast({
        title: 'Error',
        description: 'Failed to load policies',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePolicySelect = (key: string) => {
    const policy = policies.find(p => p.key === key);
    if (policy) {
      setSelectedPolicy(key);
      setContent(policy.content);
    }
  };

  const handleSave = async () => {
    if (!selectedPolicy) return;

    try {
      setIsSaving(true);
      const response = await apiRequest('PUT', `/api/admin/policies/${selectedPolicy}`, {
        content
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Policy updated successfully'
        });
        
        // Refresh policies to get updated timestamp
        await fetchPolicies();
      } else {
        throw new Error('Failed to update policy');
      }
    } catch (error) {
      console.error('Error saving policy:', error);
      toast({
        title: 'Error',
        description: 'Failed to save policy',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ]
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'link'
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-600 mt-4">Loading policies...</p>
        </CardContent>
      </Card>
    );
  }

  const currentPolicy = policies.find(p => p.key === selectedPolicy);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Policy & Content Management
          </CardTitle>
          <CardDescription>
            Edit policy pages and help content that appears on your platform
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Policy List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Pages</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1">
              {policies.map((policy) => (
                <button
                  key={policy.key}
                  onClick={() => handlePolicySelect(policy.key)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    selectedPolicy === policy.key
                      ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-900 font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="text-sm">{policyLabels[policy.key] || policy.key}</div>
                  <div className="text-xs text-gray-500 mt-1">{policy.category}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{policyLabels[selectedPolicy || ''] || 'Select a policy'}</CardTitle>
                {currentPolicy && (
                  <CardDescription className="mt-2">
                    {currentPolicy.description}
                    <br />
                    <span className="text-xs">
                      Last updated: {new Date(currentPolicy.updatedAt).toLocaleString()}
                    </span>
                  </CardDescription>
                )}
              </div>
              <Button
                onClick={handleSave}
                disabled={isSaving || !selectedPolicy}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedPolicy ? (
              <div className="space-y-4">
                <ReactQuill
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  modules={modules}
                  formats={formats}
                  className="bg-white"
                  style={{ height: '500px', marginBottom: '50px' }}
                />
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">
                Select a policy from the list to start editing
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PolicyEditor;
