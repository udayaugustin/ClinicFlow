import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard-header";
import { PlusCircle, Hospital, User, UserCog, Building2, Activity, Edit, Eye, Trash2, MapPin, Phone, Mail, Clock, Loader2, FileSpreadsheet, CreditCard, Search, Calendar, Stethoscope, RefreshCw } from "lucide-react";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import SuperAdminExportReports from "@/components/SuperAdminExportReports";
import RefundManagement from "@/components/RefundManagement";

// Clinic schema with admin user fields
const clinicSchema = z.object({
  // Clinic fields
  name: z.string().min(1, "Clinic name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "Zip code is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address"),
  openingHours: z.string().min(1, "Opening hours are required"),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  
  // Clinic admin user fields
  adminUsername: z.string().min(1, "Admin username is required"),
  adminPassword: z.string().min(6, "Admin password must be at least 6 characters"),
  adminName: z.string().min(1, "Admin full name is required"),
  adminPhone: z.string().min(1, "Admin phone number is required"),
  adminEmail: z.string().email("Invalid admin email address"),
});

// Edit clinic schema with optional admin fields
const editClinicSchema = z.object({
  // Clinic fields (required)
  name: z.string().min(1, "Clinic name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "Zip code is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address"),
  openingHours: z.string().min(1, "Opening hours are required"),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  
  // Clinic admin user fields (optional for updates)
  adminUsername: z.string().optional(),
  adminPassword: z.string().optional(),
  adminName: z.string().optional(),
  adminPhone: z.string().optional(),
  adminEmail: z.string().optional(),
});

type ClinicData = z.infer<typeof clinicSchema>;
type EditClinicData = z.infer<typeof editClinicSchema>;

// Patient Details Search Component
function PatientDetailsSearch() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const searchPatient = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone number required",
        description: "Please enter a phone number to search",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    try {
      const response = await apiRequest('GET', `/api/patients/search?phone=${encodeURIComponent(phoneNumber.trim())}`);
      const data = await response.json();
      setSearchResults(data);
      
      if (!data?.patient) {
        toast({
          title: "No patient found",
          description: "No patient found with this phone number",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error searching patient:', error);
      toast({
        title: "Search failed",
        description: "Failed to search for patient. Please try again.",
        variant: "destructive"
      });
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchPatient();
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Patient Details</h1>
        <p className="text-gray-600 mt-1">Search for patient information by phone number</p>
      </div>

      {/* Search Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Patient
          </CardTitle>
          <CardDescription>
            Enter the patient's phone number to view their complete profile and appointment history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter phone number (e.g., +1234567890)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full"
              />
            </div>
            <Button 
              onClick={searchPatient}
              disabled={isSearching}
              className="px-6"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {searchResults?.patient && (
        <div className="space-y-6">
          {/* Patient Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-lg font-semibold text-gray-900">{searchResults.patient.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone Number</label>
                  <p className="text-lg text-gray-900 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {searchResults.patient.phone}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-lg text-gray-900 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {searchResults.patient.email || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone Verified</label>
                  <Badge variant={searchResults.patient.phoneVerified ? "default" : "secondary"}>
                    {searchResults.patient.phoneVerified ? "Verified" : "Not Verified"}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Account Created</label>
                  <p className="text-lg text-gray-900 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(searchResults.patient.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">User ID</label>
                  <p className="text-lg text-gray-900">#{searchResults.patient.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appointment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Appointment History
              </CardTitle>
              <CardDescription>
                Total appointments: {searchResults.appointments?.length || 0}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {searchResults.appointments && searchResults.appointments.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Clinic</TableHead>
                        <TableHead>Token #</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults.appointments.map((appointment: any) => (
                        <TableRow key={appointment.id}>
                          <TableCell>
                            {new Date(appointment.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            {appointment.doctorName}
                          </TableCell>
                          <TableCell>
                            {appointment.clinicName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">#{appointment.tokenNumber}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                appointment.status === 'completed' ? 'default' :
                                appointment.status === 'no_show' ? 'destructive' :
                                appointment.status === 'cancel' ? 'secondary' :
                                'outline'
                              }
                            >
                              {appointment.status === 'no_show' ? 'No Show' :
                               appointment.status === 'token_started' ? 'Started' :
                               appointment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {appointment.statusNotes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Stethoscope className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No appointment history found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Results Message */}
      {searchResults && !searchResults.patient && (
        <Card>
          <CardContent className="text-center py-8">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Patient Found</h3>
            <p className="text-gray-500">No patient found with phone number: {phoneNumber}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const [selectedMenuItem, setSelectedMenuItem] = useState("dashboard");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form for creating clinics with admin
  const form = useForm<ClinicData>({
    resolver: zodResolver(clinicSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      email: "",
      openingHours: "",
      description: "",
      imageUrl: "",
      adminUsername: "",
      adminPassword: "",
      adminName: "",
      adminPhone: "",
      adminEmail: "",
    },
  });

  // Fetch all clinics
  const { data: clinics = [], isLoading, isError, error } = useQuery({
    queryKey: ['clinics'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/clinics');
      return await res.json();
    },
  });

  // Fetch dashboard metrics with auto-refresh
  const { data: dashboardMetrics, isLoading: isMetricsLoading, isError: isMetricsError, refetch: refetchMetrics } = useQuery({
    queryKey: ['super-admin-dashboard-metrics'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/super-admin/dashboard-metrics');
      return await res.json();
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    refetchIntervalInBackground: true, // Continue refreshing when tab is not active
    staleTime: 0, // Always consider data stale to force refresh
  });

  // Create clinic with admin mutation
  const createClinicMutation = useMutation({
    mutationFn: async (data: ClinicData) => {
      const res = await apiRequest("POST", "/api/clinics/with-admin", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Clinic and admin created successfully",
      });
      form.reset();
      setShowCreateForm(false);
      queryClient.invalidateQueries({ queryKey: ['clinics'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Edit clinic mutation
  const editClinicMutation = useMutation({
    mutationFn: async (data: ClinicData) => {
      const res = await apiRequest("PUT", `/api/clinics/${selectedClinic.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Clinic updated successfully",
      });
      form.reset();
      setShowEditForm(false);
      setSelectedClinic(null);
      queryClient.invalidateQueries({ queryKey: ['clinics'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete clinic mutation
  const deleteClinicMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/clinics/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Clinic deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedClinic(null);
      queryClient.invalidateQueries({ queryKey: ['clinics'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (clinic: any) => {
    setSelectedClinic(clinic);
    setIsDeleteDialogOpen(true);
  };

  const onDeleteConfirm = () => {
    if (selectedClinic) {
      deleteClinicMutation.mutate(selectedClinic.id);
    }
  };

  const onCreateSubmit = (data: ClinicData) => {
    createClinicMutation.mutate(data);
  };

  const onEditSubmit = (data: ClinicData) => {
    editClinicMutation.mutate(data);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Handler for Edit button
  const handleEdit = (clinic: any) => {
    setSelectedClinic(clinic);
    // Populate form with clinic data for editing
    form.setValue('name', clinic.name);
    form.setValue('address', clinic.address);
    form.setValue('city', clinic.city);
    form.setValue('state', clinic.state);
    form.setValue('zipCode', clinic.zipCode);
    form.setValue('phone', clinic.phone);
    form.setValue('email', clinic.email);
    form.setValue('openingHours', clinic.openingHours);
    form.setValue('description', clinic.description || '');
    form.setValue('imageUrl', clinic.imageUrl || '');
    // Reset admin fields for security
    form.setValue('adminUsername', '');
    form.setValue('adminPassword', '');
    form.setValue('adminName', '');
    form.setValue('adminPhone', '');
    form.setValue('adminEmail', '');
    setShowEditForm(true);
  };

  // Handler for View/Eye button
  const handleView = (clinic: any) => {
    setSelectedClinic(clinic);
    setShowViewDialog(true);
  };

  // Render main content based on selected menu item
  const renderMainContent = () => {
    if (selectedMenuItem === "clinic-management") {
      if (showCreateForm || showEditForm) {
        // Show create or edit form
        const isEditing = showEditForm;
        return (
          <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isEditing ? 'Edit Clinic' : 'Create New Clinic'}
                </h1>
                <p className="text-gray-600 mt-1">
                  {isEditing 
                    ? 'Update clinic details and administrator information' 
                    : 'Fill in the clinic details and administrator information'
                  }
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCreateForm(false);
                  setShowEditForm(false);
                  setSelectedClinic(null);
                  form.reset();
                }}
              >
                ← Back to Clinic List
              </Button>
            </div>

            {/* Clinic Creation Form */}
            <Card className="max-w-4xl">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Hospital className="mr-2 h-6 w-6" />
                  {showEditForm ? 'Edit Clinic & Administrator' : 'Create New Clinic & Administrator'}
                </CardTitle>
                <CardDescription>
                  {showEditForm 
                    ? 'Update the clinic details and administrator information' 
                    : 'Fill in the clinic details and administrator information to create a new clinic'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(showEditForm ? onEditSubmit : onCreateSubmit)} className="space-y-6">
                    {/* Clinic Information Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Clinic Information</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Clinic Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter clinic name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter phone number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter full address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input placeholder="City" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State</FormLabel>
                              <FormControl>
                                <Input placeholder="State" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="zipCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Zip Code</FormLabel>
                              <FormControl>
                                <Input placeholder="Zip Code" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="clinic@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="openingHours"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Opening Hours</FormLabel>
                              <FormControl>
                                <Input placeholder="9AM - 5PM" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                rows={3}
                                placeholder="Brief description of the clinic and services"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Administrator Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 flex items-center">
                        <UserCog className="mr-2 h-5 w-5" />
                        Administrator Account
                        {showEditForm && (
                          <span className="ml-3 text-sm font-normal text-amber-600 bg-amber-50 px-2 py-1 rounded">
                            Leave blank to keep existing admin
                          </span>
                        )}
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="adminUsername"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Username {showEditForm && <span className="text-gray-500">(optional)</span>}
                              </FormLabel>
                              <FormControl>
                                <Input placeholder="admin.username" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="adminPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Password {showEditForm && <span className="text-gray-500">(optional)</span>}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type="password" 
                                    placeholder="••••••••"
                                    className="pr-20"
                                    {...field}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 px-3 text-xs"
                                    onClick={() => {
                                      const newPassword = generatePassword();
                                      form.setValue('adminPassword', newPassword);
                                    }}
                                  >
                                    Generate
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="adminName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Administrator's full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="adminPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Admin phone number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="adminEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="admin@clinic.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 pt-6 border-t">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          form.reset();
                          setShowCreateForm(false);
                          setShowEditForm(false);
                          setSelectedClinic(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={createClinicMutation.isPending || editClinicMutation.isPending}
                      >
                        {(createClinicMutation.isPending || editClinicMutation.isPending) ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {showEditForm ? 'Updating...' : 'Creating...'}
                          </>
                        ) : (
                          <>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {showEditForm ? 'Update Clinic & Admin' : 'Create Clinic & Admin'}
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        );
      }

      // Show clinic list
      return (
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Clinic Management</h1>
              <p className="text-gray-600 mt-1">Manage all clinic locations and their administrators</p>
            </div>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                form.reset();
                setShowCreateForm(true);
                setShowEditForm(false);
                setSelectedClinic(null);
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Clinic & Admin
            </Button>
          </div>

          {/* Clinics List */}
          <Card>
            <CardHeader>
              <CardTitle>Clinics</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading clinics...</div>
              ) : clinics.length === 0 ? (
                <div className="text-center py-12">
                  <Hospital className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No clinics found</h3>
                  <p className="text-gray-500 mb-6">Get started by creating your first clinic</p>
                  <Button onClick={() => {
                    form.reset();
                    setShowCreateForm(true);
                    setShowEditForm(false);
                    setSelectedClinic(null);
                  }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Your First Clinic
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead className="w-[150px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clinics.map((clinic: any) => (
                        <TableRow key={clinic.id}>
                          <TableCell>
                            <div className="font-medium">{clinic.name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <MapPin className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                              <span className="text-sm">{clinic.city}, {clinic.state}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col space-y-1">
                              <div className="flex items-center text-sm">
                                <Phone className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                                <span>{clinic.phone}</span>
                              </div>
                              <div className="flex items-center text-sm">
                                <Mail className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                                <span>{clinic.email}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEdit(clinic)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-primary"
                                onClick={() => handleView(clinic)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive"
                                onClick={() => handleDelete(clinic)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    if (selectedMenuItem === "patient-details") {
      return <PatientDetailsSearch />;
    }

    if (selectedMenuItem === "export-reports") {
      return <SuperAdminExportReports />;
    }

    if (selectedMenuItem === "refund") {
      return <RefundManagement />;
    }

    // Default dashboard view
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}</h1>
            <p className="text-gray-600 mt-1">Overview of your clinic network and system activity</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetchMetrics()}
            disabled={isMetricsLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isMetricsLoading ? 'animate-spin' : ''}`} />
            {isMetricsLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {isMetricsLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading dashboard metrics...</p>
          </div>
        ) : isMetricsError ? (
          <div className="text-center py-12">
            <Activity className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-600 mb-2">Unable to load dashboard</h2>
            <p className="text-gray-500">There was an error loading the dashboard metrics. Please try again later.</p>
          </div>
        ) : (
          <>
            {/* Overview Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Clinics */}
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 text-sm font-medium">Total Clinics</p>
                      <p className="text-3xl font-bold text-blue-700">{dashboardMetrics?.totalClinics || 0}</p>
                    </div>
                    <Hospital className="h-10 w-10 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Total Doctors */}
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 text-sm font-medium">Total Doctors</p>
                      <p className="text-3xl font-bold text-green-700">{dashboardMetrics?.totalDoctors || 0}</p>
                    </div>
                    <Stethoscope className="h-10 w-10 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Total Patients */}
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-600 text-sm font-medium">Total Patients</p>
                      <p className="text-3xl font-bold text-purple-700">{dashboardMetrics?.totalPatients || 0}</p>
                    </div>
                    <User className="h-10 w-10 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Total Appointments */}
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-600 text-sm font-medium">Total Appointments</p>
                      <p className="text-3xl font-bold text-orange-700">{dashboardMetrics?.totalAppointments || 0}</p>
                      <p className="text-orange-500 text-xs mt-1">Last 6 months</p>
                    </div>
                    <Calendar className="h-10 w-10 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity & Staff Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Recent Activity Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    Recent Activity (Last 7 Days)
                  </CardTitle>
                  <CardDescription>Overview of recent system activity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">New Tokens</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{dashboardMetrics?.recentAppointments || 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Completed Tokens</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">{dashboardMetrics?.completedAppointments || 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">New Patient Registrations</span>
                    </div>
                    <span className="text-lg font-bold text-purple-600">{dashboardMetrics?.newRegistrations || 0}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Staff Management Cards */}
              <div className="space-y-6">
                {/* Total Clinic Admins */}
                <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-indigo-600 text-sm font-medium">Total Clinic Admins</p>
                        <p className="text-3xl font-bold text-indigo-700">{dashboardMetrics?.totalClinicAdmins || 0}</p>
                      </div>
                      <UserCog className="h-10 w-10 text-indigo-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* Total Attenders */}
                <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-teal-600 text-sm font-medium">Total Attenders</p>
                        <p className="text-3xl font-bold text-teal-700">{dashboardMetrics?.totalAttenders || 0}</p>
                      </div>
                      <User className="h-10 w-10 text-teal-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-blue-600" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50"
                    onClick={() => setSelectedMenuItem("clinic-management")}
                  >
                    <Hospital className="h-6 w-6 text-blue-600" />
                    <span className="text-sm font-medium">Manage Clinics</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50"
                    onClick={() => setSelectedMenuItem("patient-details")}
                  >
                    <Search className="h-6 w-6 text-purple-600" />
                    <span className="text-sm font-medium">Search Patients</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-green-300 hover:border-green-500 hover:bg-green-50"
                    onClick={() => setSelectedMenuItem("export-reports")}
                  >
                    <FileSpreadsheet className="h-6 w-6 text-green-600" />
                    <span className="text-sm font-medium">Export Reports</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-orange-300 hover:border-orange-500 hover:bg-orange-50"
                    onClick={() => setSelectedMenuItem("refund")}
                  >
                    <CreditCard className="h-6 w-6 text-orange-600" />
                    <span className="text-sm font-medium">Manage Refunds</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Gmail-style Left Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center">
            <Building2 className="h-7 w-7 text-white mr-3" />
            <div>
              <h1 className="text-lg font-bold text-white">MedClinic</h1>
              <p className="text-blue-100 text-xs">Super Admin</p>
            </div>
          </div>
        </div>

        {/* Welcome Section */}
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="ml-3">
              <p className="font-medium text-gray-900 text-sm">Welcome</p>
              <p className="text-xs text-gray-600 truncate">{user?.name}</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-3">
            {/* Dashboard Option */}
            <button
              onClick={() => setSelectedMenuItem("dashboard")}
              className={`w-full text-left px-3 py-3 rounded-lg mb-2 transition-all duration-200 flex items-center group ${
                selectedMenuItem === "dashboard"
                  ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className={`mr-3 ${selectedMenuItem === "dashboard" ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700"}`}>
                <Activity className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className={`font-medium text-sm ${selectedMenuItem === "dashboard" ? "text-blue-700" : ""}`}>
                  Dashboard
                </p>
                <p className={`text-xs ${selectedMenuItem === "dashboard" ? "text-blue-600" : "text-gray-500"}`}>
                  Overview
                </p>
              </div>
            </button>

            {/* Clinic Management Option */}
            <button
              onClick={() => setSelectedMenuItem("clinic-management")}
              className={`w-full text-left px-3 py-3 rounded-lg mb-2 transition-all duration-200 flex items-center group ${
                selectedMenuItem === "clinic-management"
                  ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className={`mr-3 ${selectedMenuItem === "clinic-management" ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700"}`}>
                <Hospital className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className={`font-medium text-sm ${selectedMenuItem === "clinic-management" ? "text-blue-700" : ""}`}>
                  Clinic Management
                </p>
                <p className={`text-xs ${selectedMenuItem === "clinic-management" ? "text-blue-600" : "text-gray-500"}`}>
                  Manage clinics
                </p>
              </div>
            </button>

            {/* Patient Details Option */}
            <button
              onClick={() => setSelectedMenuItem("patient-details")}
              className={`w-full text-left px-3 py-3 rounded-lg mb-2 transition-all duration-200 flex items-center group ${
                selectedMenuItem === "patient-details"
                  ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className={`mr-3 ${selectedMenuItem === "patient-details" ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700"}`}>
                <User className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className={`font-medium text-sm ${selectedMenuItem === "patient-details" ? "text-blue-700" : ""}`}>
                  Patient Details
                </p>
                <p className={`text-xs ${selectedMenuItem === "patient-details" ? "text-blue-600" : "text-gray-500"}`}>
                  Search patients
                </p>
              </div>
            </button>

            {/* Export Reports Option */}
            <button
              onClick={() => setSelectedMenuItem("export-reports")}
              className={`w-full text-left px-3 py-3 rounded-lg mb-2 transition-all duration-200 flex items-center group ${
                selectedMenuItem === "export-reports"
                  ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className={`mr-3 ${selectedMenuItem === "export-reports" ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700"}`}>
                <FileSpreadsheet className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className={`font-medium text-sm ${selectedMenuItem === "export-reports" ? "text-blue-700" : ""}`}>
                  Export Reports
                </p>
                <p className={`text-xs ${selectedMenuItem === "export-reports" ? "text-blue-600" : "text-gray-500"}`}>
                  Hospital reports
                </p>
              </div>
            </button>

            {/* Refund Option */}
            <button
              onClick={() => setSelectedMenuItem("refund")}
              className={`w-full text-left px-3 py-3 rounded-lg mb-2 transition-all duration-200 flex items-center group ${
                selectedMenuItem === "refund"
                  ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className={`mr-3 ${selectedMenuItem === "refund" ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700"}`}>
                <CreditCard className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className={`font-medium text-sm ${selectedMenuItem === "refund" ? "text-blue-700" : ""}`}>
                  Refund Management
                </p>
                <p className={`text-xs ${selectedMenuItem === "refund" ? "text-blue-600" : "text-gray-500"}`}>
                  Process refunds
                </p>
              </div>
            </button>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="text-center">
            <p className="text-xs text-gray-500">Super Admin Panel</p>
            <p className="text-xs text-gray-400">v1.0.0</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-gray-50">
        {renderMainContent()}
      </div>

      {/* View Clinic Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Clinic Details
            </DialogTitle>
            <DialogDescription>
              Complete information about {selectedClinic?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedClinic && (
            <div className="py-4 space-y-6">
              {/* Clinic Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Hospital className="h-4 w-4" />
                  Clinic Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-medium text-gray-500">Name</label>
                    <p className="text-gray-900">{selectedClinic.name}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-500">Phone</label>
                    <p className="text-gray-900 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedClinic.phone}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="font-medium text-gray-500">Address</label>
                    <p className="text-gray-900 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedClinic.address}
                    </p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-500">City</label>
                    <p className="text-gray-900">{selectedClinic.city}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-500">State</label>
                    <p className="text-gray-900">{selectedClinic.state}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-500">Zip Code</label>
                    <p className="text-gray-900">{selectedClinic.zipCode}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-500">Email</label>
                    <p className="text-gray-900 flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {selectedClinic.email}
                    </p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-500">Opening Hours</label>
                    <p className="text-gray-900 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {selectedClinic.openingHours}
                    </p>
                  </div>
                  {selectedClinic.description && (
                    <div className="md:col-span-2">
                      <label className="font-medium text-gray-500">Description</label>
                      <p className="text-gray-900">{selectedClinic.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => setShowViewDialog(false)}
            >
              Close
            </Button>
            <Button 
              onClick={() => {
                setShowViewDialog(false);
                handleEdit(selectedClinic);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Clinic
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Clinic Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Clinic</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this clinic? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {selectedClinic && (
              <div className="rounded-md bg-muted p-4">
                <p><strong>Name:</strong> {selectedClinic.name}</p>
                <p><strong>Location:</strong> {selectedClinic.city}, {selectedClinic.state}</p>
                <p><strong>Contact:</strong> {selectedClinic.phone}</p>
              </div>
            )}
            
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h4 className="text-sm font-semibold text-red-800 mb-2">⚠️ This will permanently delete:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• All clinic administrators and staff users</li>
                <li>• All doctor schedules for this clinic</li>
                <li>• All appointments associated with this clinic</li>
                <li>• All clinic-related data</li>
              </ul>
              <p className="text-xs text-red-600 mt-2 font-medium">This action cannot be undone!</p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              disabled={deleteClinicMutation.isPending}
              onClick={onDeleteConfirm}
            >
              {deleteClinicMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Clinic
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
