import React, { useState } from 'react';
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
  Plus
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '../hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

// Doctor schema for validation
const doctorSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  specialty: z.string().min(1, "Specialty is required"),
  phone: z.string().min(1, "Phone number is required"),
  bio: z.string().optional(),
  imageUrl: z.string().optional(),
});

// Attender schema for validation
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
const editDoctorSchema = doctorSchema.omit({ password: true });
const editAttenderSchema = attenderSchema.omit({ password: true });

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
  // Form hooks
  const addDoctorForm = useForm<z.infer<typeof doctorSchema>>({ 
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      username: "",
      password: "",
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
      username: "",
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
  const handleAddDoctor = (data: z.infer<typeof doctorSchema>) => {
    const clinicId = params?.id || user?.clinicId;
    if (!clinicId) return;
    
    createDoctorMutation.mutate({
      ...data,
      role: "doctor",
      clinicIds: [parseInt(clinicId.toString())]
    });
  };
  
  const handleEditDoctor = (data: z.infer<typeof editDoctorSchema>) => {
    if (!selectedDoctor) return;
    updateDoctorMutation.mutate({
      id: selectedDoctor.id,
      ...data
    });
  };
  
  const handleDeleteDoctor = () => {
    if (!selectedDoctor) return;
    deleteDoctorMutation.mutate(selectedDoctor.id);
  };
  
  const handleAddAttender = (data: z.infer<typeof attenderSchema>) => {
    const clinicId = params?.id || user?.clinicId;
    if (!clinicId) return;
    
    createAttenderMutation.mutate({
      ...data,
      role: "attender",
      clinicId: parseInt(clinicId.toString())
    });
  };
  
  const handleEditAttender = (data: z.infer<typeof editAttenderSchema>) => {
    if (!selectedAttender) return;
    updateAttenderMutation.mutate({
      id: selectedAttender.id,
      ...data
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
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-doctors', params?.id || user?.clinicId] });
      setIsAddDoctorDialogOpen(false);
      addDoctorForm.reset();
      toast({
        title: "Success",
        description: "Doctor added successfully",
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
      // There doesn't appear to be a dedicated endpoint for creating attenders
      // Display a message explaining the issue
      toast({
        title: "Feature Not Available",
        description: "The attender creation feature is not available in this version. Please contact your system administrator.",
        variant: "destructive",
      });
      
      // Close the dialog
      setIsAddAttenderDialogOpen(false);
      
      // Return a rejected promise to trigger the onError callback
      return Promise.reject(new Error("Attender creation endpoint not available"));
      
      // Original code (commented out):
      // const res = await apiRequest('POST', '/api/users', attenderData);
      // return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-attenders', params?.id || user?.clinicId] });
      setIsAddAttenderDialogOpen(false);
      addAttenderForm.reset();
      toast({
        title: "Success",
        description: "Attender added successfully",
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
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
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Edit className="h-4 w-4" /> Edit
                </Button>
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
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Appointments</p>
                          <p className="font-medium">{doctor.appointmentsToday || 0}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Completed</p>
                          <p className="font-medium">{doctor.completedToday || 0}</p>
                        </div>
                        {doctor.isPresent ? (
                          <Badge variant="outline" className="bg-green-50 text-green-600">Present</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-600">Absent</Badge>
                        )}
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedDoctor(doctor);
                              editDoctorForm.reset({
                                username: doctor.username,
                                name: doctor.name,
                                specialty: doctor.specialty,
                                phone: doctor.phone || '',
                                bio: doctor.bio || '',
                                imageUrl: doctor.imageUrl || '',
                              });
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
                          <p className="text-sm text-muted-foreground">
                            Supporting {attender.assignedDoctors?.length || 0} doctor{(attender.assignedDoctors?.length || 0) !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {attender.isOnDuty === true ? (
                          <Badge variant="outline" className="bg-green-50 text-green-600">On Duty</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600">Off Duty</Badge>
                        )}
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
                          <Button 
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
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="space-y-6">
          {isAppointmentsError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <p>Unable to load appointment information. Please try again later.</p>
                  <Button variant="ghost" size="sm" onClick={() => window.location.reload()} className="ml-auto">Retry</Button>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Today's Appointments
                </CardTitle>
                <Button size="sm">Add Walk-in</Button>
              </div>
              <CardDescription>Manage today's appointments and walk-ins</CardDescription>
            </CardHeader>
            <CardContent>
              {isAppointmentsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{appointment.patientName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{appointment.patientName}</p>
                            {appointment.isWalkIn && (
                              <Badge variant="outline" className="text-purple-600 bg-purple-50">Walk-in</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Token #{appointment.tokenNumber} • {appointment.time} • {appointment.doctorName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {appointment.status === 'completed' && (
                          <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Completed
                          </Badge>
                        )}
                        {appointment.status === 'in-progress' && (
                          <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 text-blue-600">
                            <Clock className="h-3.5 w-3.5" />
                            In Progress
                          </Badge>
                        )}
                        {appointment.status === 'scheduled' && (
                          <Badge variant="outline" className="flex items-center gap-1 bg-yellow-50 text-yellow-600">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Scheduled
                          </Badge>
                        )}
                        {appointment.status === 'cancelled' && (
                          <Badge variant="outline" className="flex items-center gap-1 bg-red-50 text-red-600">
                            <XCircle className="h-3.5 w-3.5" />
                            Cancelled
                          </Badge>
                        )}
                        <Button variant="outline" size="sm">Manage</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="doctor_username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addDoctorForm.control}
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
              
              <FormField
                control={addDoctorForm.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/doctor-image.jpg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
              
              <FormField
                control={editDoctorForm.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile Image URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com/doctor-image.jpg" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
              
              <FormField
                control={addAttenderForm.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/attender-image.jpg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
              
              <FormField
                control={editAttenderForm.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile Image URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com/attender-image.jpg" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
    </div>
  );
}
