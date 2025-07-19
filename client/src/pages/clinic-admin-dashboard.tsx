import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Redirect, useLocation, useRoute } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Building2, 
  Users, 
  Calendar, 
  Clock, 
  Edit, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  User,
  UserCheck,
  Loader2,
  Save,
  Trash2,
  Check,
  Plus,
  Upload,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '../hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { specialties } from '@shared/schema';

// Define interfaces for the data types
interface Clinic {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  openingHours: string;
  description?: string;
  imageUrl?: string;
}

interface Doctor {
  id: number;
  name: string;
  username: string;
  specialty: string;
  bio?: string;
  imageUrl?: string;
  phone?: string;
  clinicId?: number;
  isPresent?: boolean;
  appointmentsToday?: number;
  completedToday?: number;
}

interface Attender {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string;
  clinicId?: number;
  isOnDuty?: boolean;
  assignedDoctors?: number[];
  imageUrl?: string | null;
}

interface Appointment {
  id: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  time: string;
  tokenNumber: number;
  status: string;
  isWalkIn: boolean;
}

interface TodayStats {
  scheduled: number;
  completed: number;
  cancelled: number;
}

// Doctor schema - doctors don't need login credentials
const doctorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  specialty: z.string().min(1, "Specialty is required"),
  phone: z.string().min(1, "Phone number is required"),
  bio: z.string().optional(),
  imageUrl: z.string().optional(),
});

// Attender schema for validation - attenders need login credentials
const attenderSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  imageUrl: z.string().optional(),
  assignedDoctors: z.array(z.number()).optional(),
});

// Edit schemas (without password)
const editDoctorSchema = doctorSchema;
const editAttenderSchema = attenderSchema.omit({ password: true });

// Doctor Dashboard Content Component - Navigate to dedicated doctor dashboard page
function DoctorDashboardContent() {
  const [_, navigate] = useLocation();
  
  // Navigate to the attender dashboard page immediately
  useEffect(() => {
    navigate('/attender-dashboard');
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">Redirecting to doctor dashboard...</span>
    </div>
  );
}

// Schedules Content Component - Navigate to dedicated schedules page
function SchedulesContent() {
  const [_, navigate] = useLocation();
  
  // Navigate to the schedules page immediately
  useEffect(() => {
    navigate('/schedules');
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">Redirecting to schedules...</span>
    </div>
  );
}

export default function ClinicAdminDashboard() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const [match, params] = useRoute<{ id: string }>("/clinic-admin/:id");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Dialog state
  const [isAddDoctorDialogOpen, setIsAddDoctorDialogOpen] = useState(false);
  const [isEditDoctorDialogOpen, setIsEditDoctorDialogOpen] = useState(false);
  const [isDeleteDoctorDialogOpen, setIsDeleteDoctorDialogOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  
  const [isAddAttenderDialogOpen, setIsAddAttenderDialogOpen] = useState(false);
  const [isEditAttenderDialogOpen, setIsEditAttenderDialogOpen] = useState(false);
  const [isDeleteAttenderDialogOpen, setIsDeleteAttenderDialogOpen] = useState(false);
  const [isAssignDoctorDialogOpen, setIsAssignDoctorDialogOpen] = useState(false);
  const [selectedAttender, setSelectedAttender] = useState<Attender | null>(null);
  const [attenderId, setAttenderId] = useState<number | null>(null);
  
  // File upload state
  const [doctorImageFile, setDoctorImageFile] = useState<File | null>(null);
  const [doctorImagePreview, setDoctorImagePreview] = useState<string>("");
  const [editDoctorImageFile, setEditDoctorImageFile] = useState<File | null>(null);
  const [editDoctorImagePreview, setEditDoctorImagePreview] = useState<string>("");
  const [attenderImageFile, setAttenderImageFile] = useState<File | null>(null);
  const [attenderImagePreview, setAttenderImagePreview] = useState<string>("");
  const [editAttenderImageFile, setEditAttenderImageFile] = useState<File | null>(null);
  const [editAttenderImagePreview, setEditAttenderImagePreview] = useState<string>("");
  
  // Reset password state
  const [resetPasswordDialog, setResetPasswordDialog] = useState({
    isOpen: false,
    attenderId: null,
    attenderName: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Alert dialog state for password reset errors
  const [passwordErrorAlert, setPasswordErrorAlert] = useState({
    isOpen: false,
    message: ''
  });
  
  // Utility function to convert file to base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };
  
  // File upload handlers
  const handleDoctorImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a valid image file (JPEG, PNG, GIF, or WebP)",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setDoctorImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setDoctorImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleEditDoctorImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a valid image file (JPEG, PNG, GIF, or WebP)",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setEditDoctorImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditDoctorImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleAttenderImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a valid image file (JPEG, PNG, GIF, or WebP)",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setAttenderImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAttenderImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleEditAttenderImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a valid image file (JPEG, PNG, GIF, or WebP)",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setEditAttenderImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditAttenderImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Clear image handlers
  const clearDoctorImage = () => {
    setDoctorImageFile(null);
    setDoctorImagePreview("");
  };
  
  const clearEditDoctorImage = () => {
    setEditDoctorImageFile(null);
    setEditDoctorImagePreview("");
  };
  
  const clearAttenderImage = () => {
    setAttenderImageFile(null);
    setAttenderImagePreview("");
  };
  
  const clearEditAttenderImage = () => {
    setEditAttenderImageFile(null);
    setEditAttenderImagePreview("");
  };
  // Form hooks
  const addDoctorForm = useForm<z.infer<typeof doctorSchema>>({ 
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      name: "",
      specialty: "",
      phone: "",
      bio: "",
      imageUrl: "",
    }
  });
  
  const editDoctorForm = useForm<z.infer<typeof editDoctorSchema>>({ 
    resolver: zodResolver(editDoctorSchema),
    defaultValues: {
      name: "",
      specialty: "",
      phone: "",
      bio: "",
      imageUrl: "",
    }
  });
  
  const addAttenderForm = useForm<z.infer<typeof attenderSchema>>({ 
    resolver: zodResolver(attenderSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      phone: "",
      imageUrl: "",
      assignedDoctors: [],
    }
  });
  
  const editAttenderForm = useForm<z.infer<typeof editAttenderSchema>>({ 
    resolver: zodResolver(editAttenderSchema),
    defaultValues: {
      username: "",
      name: "",
      email: "",
      phone: "",
      imageUrl: "",
      assignedDoctors: [],
    }
  });
  
  // Handler functions
  const handleAddDoctor = async (data: z.infer<typeof doctorSchema>) => {
    const clinicId = params?.id || user?.clinicId;
    if (!clinicId) return;
    
    // Generate username and password automatically for doctors
    const username = `dr.${data.name.toLowerCase().replace(/\s+/g, '')}.${Math.floor(Math.random() * 1000)}`;
    const password = Math.random().toString(36).slice(-8); // Generate 8-character random password
    
    // Convert uploaded image to base64 if available
    let imageUrl = "";
    if (doctorImageFile) {
      try {
        imageUrl = await convertFileToBase64(doctorImageFile);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to process image file",
          variant: "destructive",
        });
        return;
      }
    }
    
    createDoctorMutation.mutate({
      ...data,
      username,
      password,
      imageUrl,
      role: "doctor",
      clinicIds: [parseInt(clinicId.toString())]
    });
  };
  
  const handleEditDoctor = async (data: z.infer<typeof editDoctorSchema>) => {
    if (!selectedDoctor) return;
    
    // Convert uploaded image to base64 if available
    let imageUrl = data.imageUrl;
    if (editDoctorImageFile) {
      try {
        imageUrl = await convertFileToBase64(editDoctorImageFile);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to process image file",
          variant: "destructive",
        });
        return;
      }
    }
    
    updateDoctorMutation.mutate({
      id: selectedDoctor.id,
      ...data,
      imageUrl
    });
  };
  
  const handleDeleteDoctor = () => {
    if (!selectedDoctor) return;
    deleteDoctorMutation.mutate(selectedDoctor.id);
  };
  
  const handleAddAttender = async (data: z.infer<typeof attenderSchema>) => {
    const clinicId = params?.id || user?.clinicId;
    if (!clinicId) return;
    
    // Convert uploaded image to base64 if available
    let imageUrl = "";
    if (attenderImageFile) {
      try {
        imageUrl = await convertFileToBase64(attenderImageFile);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to process image file",
          variant: "destructive",
        });
        return;
      }
    }
    
    createAttenderMutation.mutate({
      ...data,
      imageUrl,
      role: "attender",
      clinicId: parseInt(clinicId.toString())
    });
  };
  
  const handleEditAttender = async (data: z.infer<typeof editAttenderSchema>) => {
    if (!selectedAttender) return;
    
    // Convert uploaded image to base64 if available
    let imageUrl = data.imageUrl;
    if (editAttenderImageFile) {
      try {
        imageUrl = await convertFileToBase64(editAttenderImageFile);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to process image file",
          variant: "destructive",
        });
        return;
      }
    }
    
    updateAttenderMutation.mutate({
      id: selectedAttender.id,
      ...data,
      imageUrl
    });
  };
  
  const handleDeleteAttender = () => {
    if (!selectedAttender) return;
    deleteAttenderMutation.mutate(selectedAttender.id);
  };
  
  // Mutations
  const createDoctorMutation = useMutation({
    mutationFn: async (doctorData: any) => {
      // Now that clinic admins have permission to create doctors, make the API call
      const res = await apiRequest('POST', '/api/doctors', doctorData);
      const newDoctor = await res.json();
      
      // After creating the doctor, automatically assign to all attenders in the clinic
      if (newDoctor && newDoctor.id) {
        const clinicId = doctorData.clinicIds?.[0];
        if (clinicId) {
          // Get all attenders in this clinic
          const attenderRes = await apiRequest('GET', `/api/attenders?clinicId=${clinicId}`);
          const attenders = await attenderRes.json();
          
          // Assign the new doctor to each attender
          if (attenders && attenders.length > 0) {
            for (const attender of attenders) {
              await apiRequest('POST', '/api/attender-doctors', {
                attenderId: attender.id,
                doctorId: newDoctor.id,
                clinicId
              });
            }
          }
        }
      }
      
      return newDoctor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-doctors', params?.id || user?.clinicId] });
      // Also invalidate attender-doctors queries for all attenders
      queryClient.invalidateQueries({ queryKey: ['attender-doctors'] });
      setIsAddDoctorDialogOpen(false);
      addDoctorForm.reset();
      clearDoctorImage(); // Clear image state
      toast({
        title: "Success",
        description: "Doctor added successfully and assigned to all attenders",
      });
    },
    onError: (error: any) => {
      // We're handling the error in the mutationFn now, so this won't be called for permission issues
      if (error.message !== "Permission denied: Only Super Admins can add doctors") {
        toast({
          title: "Error",
          description: error.message || "Failed to add doctor",
          variant: "destructive",
        });
      }
    }
  });
  
  const updateDoctorMutation = useMutation({
    mutationFn: async (doctorData: any) => {
      const { id, ...data } = doctorData;
      const res = await apiRequest('PUT', `/api/doctors/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-doctors', params?.id || user?.clinicId] });
      setIsEditDoctorDialogOpen(false);
      setSelectedDoctor(null);
      clearEditDoctorImage(); // Clear image state
      toast({
        title: "Success",
        description: "Doctor updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update doctor",
        variant: "destructive",
      });
    }
  });
  
  const deleteDoctorMutation = useMutation({
    mutationFn: async (doctorId: number) => {
      const res = await apiRequest('DELETE', `/api/doctors/${doctorId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-doctors', params?.id || user?.clinicId] });
      setIsDeleteDoctorDialogOpen(false);
      setSelectedDoctor(null);
      toast({
        title: "Success",
        description: "Doctor deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete doctor",
        variant: "destructive",
      });
    }
  });
  
  const createAttenderMutation = useMutation({
    mutationFn: async (attenderData: any) => {
      // Original code (uncommented):
      const res = await apiRequest('POST', '/api/attenders', attenderData);
      const newAttender = await res.json();
      
      // After creating the attender, automatically assign all doctors in the clinic
      if (newAttender && newAttender.id) {
        const clinicId = attenderData.clinicId;
        if (clinicId) {
          // Get all doctors in this clinic
          const doctorRes = await apiRequest('GET', `/api/clinics/${clinicId}/doctors`);
          const doctors = await doctorRes.json();
          
          // Assign all doctors to the new attender
          if (doctors && doctors.length > 0) {
            for (const doctor of doctors) {
              await apiRequest('POST', '/api/attender-doctors', {
                attenderId: newAttender.id,
                doctorId: doctor.id,
                clinicId
              });
            }
          }
        }
      }
      
      return newAttender;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-attenders', params?.id || user?.clinicId] });
      setIsAddAttenderDialogOpen(false);
      addAttenderForm.reset();
      clearAttenderImage(); // Clear image state
      toast({
        title: "Success",
        description: "Attender added successfully and assigned all doctors",
      });
    },
    onError: (error: any) => {
      // We're handling the error in the mutationFn now, so this won't be called for endpoint issues
      if (error.message !== "Attender creation endpoint not available") {
        toast({
          title: "Error",
          description: error.message || "Failed to add attender",
          variant: "destructive",
        });
      }
    }
  });
  
  const updateAttenderMutation = useMutation({
    mutationFn: async (attenderData: any) => {
      const { id, ...data } = attenderData;
      const res = await apiRequest('PUT', `/api/users/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-attenders', params?.id || user?.clinicId] });
      setIsEditAttenderDialogOpen(false);
      setSelectedAttender(null);
      clearEditAttenderImage(); // Clear image state
      toast({
        title: "Success",
        description: "Attender updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update attender",
        variant: "destructive",
      });
    }
  });
  
  const deleteAttenderMutation = useMutation({
    mutationFn: async (attenderId: number) => {
      const res = await apiRequest('DELETE', `/api/users/${attenderId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-attenders', params?.id || user?.clinicId] });
      setIsDeleteAttenderDialogOpen(false);
      setSelectedAttender(null);
      toast({
        title: "Success",
        description: "Attender deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete attender",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for assigning a doctor to an attender
  const assignDoctorMutation = useMutation({
    mutationFn: async ({ attenderId, doctorId, clinicId }: { attenderId: number, doctorId: number, clinicId: number }) => {
      const res = await apiRequest('POST', '/api/attender-doctors', {
        attenderId,
        doctorId,
        clinicId
      });
      return await res.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate both clinic-attenders and attender-doctors queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['clinic-attenders', params?.id || user?.clinicId] });
      queryClient.invalidateQueries({ queryKey: ['attender-doctors', variables.attenderId] });
      toast({
        title: "Success",
        description: "Doctor assigned successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign doctor",
        variant: "destructive",
      });
    }
  });

  // Mutation for removing a doctor from an attender
  const removeDoctorMutation = useMutation({
    mutationFn: async ({ attenderId, doctorId }: { attenderId: number, doctorId: number }) => {
      // Use request body for DELETE request as per the API endpoint definition
      const res = await apiRequest('DELETE', '/api/attender-doctors', { attenderId, doctorId });
      return await res.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate both clinic-attenders and attender-doctors queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['clinic-attenders', params?.id || user?.clinicId] });
      queryClient.invalidateQueries({ queryKey: ['attender-doctors', variables.attenderId] });
      toast({
        title: "Success",
        description: "Doctor removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove doctor",
        variant: "destructive",
      });
    }
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ attenderId, newPassword }: { attenderId: number; newPassword: string }) => {
      const res = await apiRequest('PATCH', '/api/admin/reset-attender-password', { attenderId, newPassword });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Password reset successfully'
      });
      setResetPasswordDialog({ isOpen: false, attenderId: null, attenderName: '' });
      setNewPassword('');
      queryClient.invalidateQueries({ queryKey: ['clinic-attenders', params?.id || user?.clinicId] });
    },
    onError: (error: any) => {
      // Extract and clean up the error message
      let errorMessage = error.message || 'Failed to reset password';
      
      // Clean up common API error formats
      if (errorMessage.includes('{"message":')) {
        try {
          const match = errorMessage.match(/"message"\s*:\s*"([^"]+)"/);
          if (match && match[1]) {
            errorMessage = match[1];
          }
        } catch (e) {
          // If parsing fails, use the original message
        }
      }
      
      // Remove HTTP status codes and clean up the message
      errorMessage = errorMessage
        .replace(/^\d+:\s*/, '') // Remove status codes like "400: "
        .replace(/^{\s*"message"\s*:\s*"/, '') // Remove JSON wrapper start
        .replace(/"\s*}$/, '') // Remove JSON wrapper end
        .trim();
      
      // Show custom alert dialog with cleaned message
      setPasswordErrorAlert({
        isOpen: true,
        message: errorMessage
      });
    }
  });

  // Reset password handlers
  const handleResetPassword = () => {
    if (!newPassword.trim()) {
      setPasswordErrorAlert({
        isOpen: true,
        message: 'Please enter a new password'
      });
      return;
    }

    resetPasswordMutation.mutate({
      attenderId: resetPasswordDialog.attenderId!,
      newPassword: newPassword.trim()
    });
  };

  const openResetDialog = (attenderId: number, attenderName: string) => {
    setResetPasswordDialog({
      isOpen: true,
      attenderId,
      attenderName
    });
    setNewPassword('');
  };
  
  // Fetch clinic details
  const { 
    data: clinicData = {
      id: 0,
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '',
      email: '',
      openingHours: '',
    }, 
    isLoading: isClinicLoading, 
    isError: isClinicError 
  } = useQuery<Clinic>({ 
    queryKey: ['clinic', params?.id || user?.clinicId], 
    queryFn: async () => { 
      const clinicId = params?.id || user?.clinicId; 
      if (!clinicId) return null; 
      const res = await apiRequest('GET', `/api/clinics/${clinicId}`); 
      return await res.json(); 
    }, 
    enabled: !!(params?.id || user?.clinicId), 
  });

  // Fetch today's stats
  const { 
    data: todayStats = { scheduled: 0, completed: 0, cancelled: 0 }, 
    isLoading: isStatsLoading, 
    isError: isStatsError 
  } = useQuery<TodayStats>({ 
    queryKey: ['clinic-stats', params?.id || user?.clinicId], 
    queryFn: async () => { 
      const clinicId = params?.id || user?.clinicId; 
      if (!clinicId) return { scheduled: 0, completed: 0, cancelled: 0 }; 
      const res = await apiRequest('GET', `/api/clinics/${clinicId}/stats/today`); 
      return await res.json(); 
    }, 
    enabled: !!(params?.id || user?.clinicId), 
  });

  // Fetch doctors for this clinic
  const { 
    data: doctors = [], 
    isLoading: isDoctorsLoading, 
    isError: isDoctorsError 
  } = useQuery<Doctor[]>({ 
    queryKey: ['clinic-doctors', params?.id || user?.clinicId], 
    queryFn: async () => { 
      const clinicId = params?.id || user?.clinicId; 
      if (!clinicId) return []; 
      const res = await apiRequest('GET', `/api/clinics/${clinicId}/doctors`); 
      return await res.json(); 
    }, 
    enabled: !!(params?.id || user?.clinicId), 
    refetchOnMount: 'always',  // Always refetch when component mounts
    staleTime: 0,              // Consider data stale immediately
  });

  const { 
    data: attenderDoctors = [], 
    isLoading: isAttenderDoctorsLoading, 
    isError: isAttenderDoctorsError 
  } = useQuery<(AttenderDoctor & { doctor: User })[]>({ 
    queryKey: ['attender-doctors', attenderId], 
    queryFn: async () => { 
      if (!attenderId) return []; 
      const res = await apiRequest('GET', `/api/attender-doctor/${attenderId}`); 
      return await res.json(); 
    }, 
    enabled: !!attenderId, 
    refetchOnMount: 'always',  // Always refetch when component mounts
    staleTime: 0,              // Consider data stale immediately
  });

  console.log(attenderDoctors);
  // Fetch attenders for this clinic
  const { 
    data: attenders = [], 
    isLoading: isAttendersLoading, 
    isError: isAttendersError 
  } = useQuery<Attender[]>({ 
    queryKey: ['clinic-attenders', params?.id || user?.clinicId], 
    queryFn: async () => { 
      const clinicId = params?.id || user?.clinicId; 
      if (!clinicId) return []; 
      const res = await apiRequest('GET', `/api/attenders?clinicId=${clinicId}`); 
      return await res.json(); 
    }, 
    enabled: !!(params?.id || user?.clinicId), 
  });
  
  // Query to fetch all doctors in the clinic
  const { data: clinicDoctors = [] } = useQuery({
    queryKey: ['clinic-doctors', params?.id || user?.clinicId],
    queryFn: async () => { 
      const clinicId = params?.id || user?.clinicId; 
      if (!clinicId) return []; 
      const res = await apiRequest('GET', `/api/clinics/${clinicId}/doctors`); 
      return await res.json(); 
    },
    enabled: !!(params?.id || user?.clinicId),
  });

  // Fetch appointments for today
  const { 
    data: appointments = [], 
    isLoading: isAppointmentsLoading, 
    isError: isAppointmentsError 
  } = useQuery<Appointment[]>({ 
    queryKey: ['clinic-appointments', params?.id || user?.clinicId], 
    queryFn: async () => { 
      const clinicId = params?.id || user?.clinicId; 
      if (!clinicId) return []; 
      const res = await apiRequest('GET', `/api/clinics/${clinicId}/appointments/today`); 
      return await res.json(); 
    }, 
    enabled: !!(params?.id || user?.clinicId), 
    refetchOnMount: 'always',  // Always refetch when component mounts
    staleTime: 0,              // Consider data stale immediately
  });

  // // Query to fetch all doctors in the clinic
  // const { data: clinicDoctors = [] } = useQuery({
  //   queryKey: ['clinic-doctors', params?.id || user?.clinicId],
  //   queryFn: async () => { 
  //     const clinicId = params?.id || user?.clinicId; 
  //     if (!clinicId) return []; 
  //     const res = await apiRequest('GET', `/api/clinics/${clinicId}/doctors`); 
  //     return await res.json(); 
  //   }
  // });

  // Loading state
  if (isClinicLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading clinic information...</span>
      </div>
    );
  }

  // Critical error - only if clinic data fails to load
  if (isClinicError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600">Error loading clinic information</h2>
          <p className="mt-2">There was a problem fetching the data. Please try again later.</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }
  
  // No need for redirects as this component will only be rendered for clinic admins
  // from the home page

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Clinic Admin Dashboard</h1>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="doctor-dashboard">Doctor Dashboard</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
        </TabsList>

        {/* Clinic Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* {isStatsError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <p>Unable to load today's statistics. Some data may be missing.</p>
                  <Button variant="ghost" size="sm" onClick={() => window.location.reload()} className="ml-auto">Retry</Button>
                </div>
              </CardContent>
            </Card>
          )} */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Clinic Details Card */}
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {clinicData.name}
                  </CardTitle>
                  <CardDescription>Clinic Details</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{clinicData.address}, {clinicData.city}, {clinicData.state} {clinicData.zipCode}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{clinicData.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{clinicData.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{clinicData.openingHours}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Today's Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Today's Stats
                </CardTitle>
                <CardDescription>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Scheduled</span>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-600">{todayStats.scheduled}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">In Progress</span>
                    <Badge variant="outline" className="bg-green-50 text-green-600">{todayStats.completed}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Completed</span>
                    <Badge variant="outline" className="bg-green-50 text-green-600">{todayStats.completed}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Cancelled</span>
                    <Badge variant="outline" className="bg-red-50 text-red-600">{todayStats.cancelled}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Staff Management Tab */}
        <TabsContent value="staff" className="space-y-6">
          {isDoctorsError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <p>Unable to load doctors information. Please try again later.</p>
                  <Button variant="ghost" size="sm" onClick={() => window.location.reload()} className="ml-auto">Retry</Button>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Doctors
                </CardTitle>
                <Button size="sm" onClick={() => setIsAddDoctorDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Doctor
                </Button>
              </div>
              <CardDescription>Doctors associated with this clinic</CardDescription>
            </CardHeader>
            <CardContent>
              {isDoctorsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {doctors.map((doctor) => (
                    <div key={doctor.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={doctor.imageUrl || undefined} />
                          <AvatarFallback>{doctor.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{doctor.name}</p>
                          <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                        </div>
                      </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedDoctor(doctor);
                              editDoctorForm.reset({
                                name: doctor.name,
                                specialty: doctor.specialty,
                                phone: doctor.phone || '',
                                bio: doctor.bio || '',
                                imageUrl: doctor.imageUrl || '',
                              });
                              // Set existing image preview
                              setEditDoctorImagePreview(doctor.imageUrl || '');
                              setEditDoctorImageFile(null);
                              setIsEditDoctorDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" /> Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setSelectedDoctor(doctor);
                              setIsDeleteDoctorDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                          </Button>
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {isAttendersError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <p>Unable to load attenders information. Please try again later.</p>
                  <Button variant="ghost" size="sm" onClick={() => window.location.reload()} className="ml-auto">Retry</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Attenders Section */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Attenders
                </CardTitle>
                <Button size="sm" onClick={() => setIsAddAttenderDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Attender
                </Button>
              </div>
              <CardDescription>Attenders working at this clinic</CardDescription>
            </CardHeader>
            <CardContent>
              {isAttendersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {attenders.map((attender) => (
                    <div key={attender.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={attender.imageUrl || undefined} />
                          <AvatarFallback>{attender.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{attender.name}</p>
                          {/* <p className="text-sm text-muted-foreground">
                            Supporting {attender.assignedDoctors?.length || 0} doctor{(attender.assignedDoctors?.length || 0) !== 1 ? 's' : ''}
                          </p> */}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* {attender.isOnDuty === true ? (
                          <Badge variant="outline" className="bg-green-50 text-green-600">On Duty</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600">Off Duty</Badge>
                        )} */}
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedAttender(attender);
                              editAttenderForm.reset({
                                username: attender.username,
                                name: attender.name,
                                email: attender.email,
                                phone: attender.phone,
                                imageUrl: attender.imageUrl || '',
                                assignedDoctors: attender.assignedDoctors || [],
                              });
                              // Set existing image preview
                              setEditAttenderImagePreview(attender.imageUrl || '');
                              setEditAttenderImageFile(null);
                              setIsEditAttenderDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" /> Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setSelectedAttender(attender);
                              setIsDeleteAttenderDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                          </Button>
                          {/* <Button 
                            variant="outline" 
                            size="sm"
                            className="text-blue-600 hover:bg-blue-50"
                            onClick={() => {
                              setSelectedAttender(attender);
                              setAttenderId(attender.id);
                              setIsAssignDoctorDialogOpen(true);
                            }}
                          >
                            Assign Doctor
                          </Button> */}
                          {
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openResetDialog(attender.id, attender.name)}
                            >
                              Reset Password
                            </Button>
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        

        {/* Doctor Dashboard Tab */}
        <TabsContent value="doctor-dashboard" className="space-y-6">
          <DoctorDashboardContent />
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="space-y-6">
          <SchedulesContent />
        </TabsContent>
      </Tabs>
      
      {/* Add Doctor Dialog */}
      <Dialog open={isAddDoctorDialogOpen} onOpenChange={setIsAddDoctorDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Doctor</DialogTitle>
            <DialogDescription>
            Add a new doctor to this clinic. They will be able to login and manage appointments.
            </DialogDescription>
          </DialogHeader>
          <Form {...addDoctorForm}>
            <form onSubmit={addDoctorForm.handleSubmit(handleAddDoctor)} className="space-y-4">
              <FormField
                control={addDoctorForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Dr. John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addDoctorForm.control}
                name="specialty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialty</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a specialty" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {specialties.map((specialty) => (
                          <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addDoctorForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addDoctorForm.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of the doctor's qualifications and experience"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-4">
                <Label>Profile Image</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleDoctorImageUpload}
                      className="cursor-pointer"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload an image (JPEG, PNG, GIF, or WebP, max 5MB)
                    </p>
                  </div>
                  {doctorImagePreview && (
                    <div className="relative">
                      <img
                        src={doctorImagePreview}
                        alt="Preview"
                        className="w-16 h-16 object-cover rounded-full border"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={clearDoctorImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDoctorDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createDoctorMutation.isPending}
                >
                  {createDoctorMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Create Doctor
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Doctor Dialog */}
      <Dialog open={isEditDoctorDialogOpen} onOpenChange={setIsEditDoctorDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Doctor</DialogTitle>
            <DialogDescription>
              Update the doctor's information.
            </DialogDescription>
          </DialogHeader>
          <Form {...editDoctorForm}>
            <form onSubmit={editDoctorForm.handleSubmit(handleEditDoctor)} className="space-y-4">
              <FormField
                control={editDoctorForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editDoctorForm.control}
                name="specialty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialty</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a specialty" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {specialties.map((specialty) => (
                          <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editDoctorForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="+1 (555) 123-4567" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editDoctorForm.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of the doctor's qualifications and experience"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-4">
                <Label>Profile Image</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleEditDoctorImageUpload}
                      className="cursor-pointer"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload an image (JPEG, PNG, GIF, or WebP, max 5MB)
                    </p>
                  </div>
                  {editDoctorImagePreview && (
                    <div className="relative">
                      <img
                        src={editDoctorImagePreview}
                        alt="Preview"
                        className="w-16 h-16 object-cover rounded-full border"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={clearEditDoctorImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDoctorDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateDoctorMutation.isPending}
                >
                  {updateDoctorMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Update Doctor
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Doctor Dialog */}
      <Dialog open={isDeleteDoctorDialogOpen} onOpenChange={setIsDeleteDoctorDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Doctor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this doctor? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedDoctor && (
              <div className="rounded-md bg-muted p-4">
                <p><strong>Name:</strong> {selectedDoctor.name}</p>
                <p><strong>Username:</strong> {selectedDoctor.username}</p>
                <p><strong>Specialty:</strong> {selectedDoctor.specialty || 'Not specified'}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteDoctorDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              disabled={deleteDoctorMutation.isPending}
              onClick={handleDeleteDoctor}
            >
              {deleteDoctorMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Doctor
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Attender Dialog */}
      <Dialog open={isAddAttenderDialogOpen} onOpenChange={setIsAddAttenderDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Attender</DialogTitle>
            <DialogDescription>
              Add a new attender to this clinic. They will be able to login and assist doctors.
            </DialogDescription>
          </DialogHeader>
          <Form {...addAttenderForm}>
            <form onSubmit={addAttenderForm.handleSubmit(handleAddAttender)} className="space-y-4">
              <FormField
                control={addAttenderForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="attender_username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addAttenderForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addAttenderForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addAttenderForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john.smith@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addAttenderForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-4">
                <Label>Profile Image</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleAttenderImageUpload}
                      className="cursor-pointer"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload an image (JPEG, PNG, GIF, or WebP, max 5MB)
                    </p>
                  </div>
                  {attenderImagePreview && (
                    <div className="relative">
                      <img
                        src={attenderImagePreview}
                        alt="Preview"
                        className="w-16 h-16 object-cover rounded-full border"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={clearAttenderImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddAttenderDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createAttenderMutation.isPending}
                >
                  {createAttenderMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Create Attender
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Attender Dialog */}
      <Dialog open={isEditAttenderDialogOpen} onOpenChange={setIsEditAttenderDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Attender</DialogTitle>
            <DialogDescription>
              Update the attender's information.
            </DialogDescription>
          </DialogHeader>
          <Form {...editAttenderForm}>
            <form onSubmit={editAttenderForm.handleSubmit(handleEditAttender)} className="space-y-4">
              <FormField
                control={editAttenderForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editAttenderForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editAttenderForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editAttenderForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-4">
                <Label>Profile Image</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleEditAttenderImageUpload}
                      className="cursor-pointer"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload an image (JPEG, PNG, GIF, or WebP, max 5MB)
                    </p>
                  </div>
                  {editAttenderImagePreview && (
                    <div className="relative">
                      <img
                        src={editAttenderImagePreview}
                        alt="Preview"
                        className="w-16 h-16 object-cover rounded-full border"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={clearEditAttenderImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditAttenderDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateAttenderMutation.isPending}
                >
                  {updateAttenderMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Update Attender
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Attender Dialog */}
      <Dialog open={isDeleteAttenderDialogOpen} onOpenChange={setIsDeleteAttenderDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Attender</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this attender? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedAttender && (
              <div className="rounded-md bg-muted p-4">
                <p><strong>Name:</strong> {selectedAttender.name}</p>
                <p><strong>Username:</strong> {selectedAttender.username}</p>
                <p><strong>Email:</strong> {selectedAttender.email || 'Not specified'}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteAttenderDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              disabled={deleteAttenderMutation.isPending}
              onClick={handleDeleteAttender}
            >
              {deleteAttenderMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Attender
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Assign Doctor Dialog */}
      <Dialog open={isAssignDoctorDialogOpen} onOpenChange={setIsAssignDoctorDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Assign Doctors to Attender</DialogTitle>
            <DialogDescription>
              {selectedAttender && `Select doctors to assign to ${selectedAttender.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Available Doctors</h3>
              {clinicDoctors.length === 0 ? (
                <div className="text-sm text-muted-foreground">No doctors available in this clinic</div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {clinicDoctors.map((doctor: any) => {
                    // Check if doctor is already assigned to this attender using attenderDoctors array
                    const isAssigned = attenderDoctors.some((ad) => ad.doctorId === doctor.id);
                    
                    return (
                      <div 
                        key={doctor.id} 
                        className="flex items-center justify-between p-3 border rounded-md"
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={doctor.imageUrl || ''} alt={doctor.name} />
                            <AvatarFallback>{doctor.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{doctor.name}</p>
                            <p className="text-xs text-muted-foreground">{doctor.specialty || 'General'}</p>
                          </div>
                        </div>
                        {isAssigned ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (!selectedAttender) return;
                              removeDoctorMutation.mutate({
                                attenderId: selectedAttender.id,
                                doctorId: doctor.id
                              });
                            }}
                            disabled={removeDoctorMutation.isPending}
                          >
                            {removeDoctorMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Unassign'
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => {
                              const clinicId = params?.id || user?.clinicId;
                              if (!selectedAttender || !clinicId) return;
                              
                              assignDoctorMutation.mutate({
                                attenderId: selectedAttender.id,
                                doctorId: doctor.id,
                                clinicId: parseInt(clinicId.toString())
                              });
                            }}
                            disabled={assignDoctorMutation.isPending}
                          >
                            {assignDoctorMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Assign'
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              onClick={() => setIsAssignDoctorDialogOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialog.isOpen} onOpenChange={(open) => 
        setResetPasswordDialog({ isOpen: open, attenderId: null, attenderName: '' })
      }>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password for {resetPasswordDialog.attenderName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁️'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 8 characters, 1 number, 1 special character
              </p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setResetPasswordDialog({ isOpen: false, attenderId: null, attenderName: '' })}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleResetPassword}
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Reset Error Alert Dialog */}
      <Dialog open={passwordErrorAlert.isOpen} onOpenChange={(open) => 
        setPasswordErrorAlert({ isOpen: open, message: '' })
      }>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Password Reset Failed
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              There was an issue resetting the password. Please try again.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm leading-relaxed">
                {passwordErrorAlert.message}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setPasswordErrorAlert({ isOpen: false, message: '' })}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
