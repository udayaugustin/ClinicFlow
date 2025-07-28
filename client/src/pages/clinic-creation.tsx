import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DashboardHeader } from "@/components/dashboard-header";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Clock, Edit, Trash2, Plus, Search, X, Check, Loader2, MapPin, Phone, Mail, Building, Eye, UserCog } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from "react";

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

// Update schema (all fields optional for partial updates)
const clinicUpdateSchema = clinicSchema.partial();

type ClinicData = z.infer<typeof clinicSchema>;
type ClinicUpdateData = z.infer<typeof clinicUpdateSchema>;

interface Clinic extends ClinicData {
  id: number;
}

export default function ClinicCreation() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for managing clinic operations
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  
  // Fetch all clinics
  const { data: clinics = [], isLoading, isError, error } = useQuery({
    queryKey: ['clinics'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/clinics');
      return await res.json();
    },
  });

  // Redirect if not logged in or not a super admin
  if (!user) {
    navigate("/auth");
    return null;
  }

  if (user.role !== "super_admin") {
    navigate("/");
    return null;
  }

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
  
  // Form for editing clinics
  const editForm = useForm<ClinicUpdateData>({
    resolver: zodResolver(clinicUpdateSchema),
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
    },
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
      setIsCreateDialogOpen(false);
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
  
  // Update clinic mutation
  const updateClinicMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: ClinicUpdateData }) => {
      const res = await apiRequest("PUT", `/api/clinics/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Clinic updated successfully",
      });
      editForm.reset();
      setIsEditDialogOpen(false);
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

  // Form submission handlers
  const onCreateSubmit = (data: ClinicData) => {
    createClinicMutation.mutate(data);
  };
  
  const onEditSubmit = (data: ClinicUpdateData) => {
    if (selectedClinic) {
      updateClinicMutation.mutate({ id: selectedClinic.id, data });
    }
  };
  
  const onDeleteConfirm = () => {
    if (selectedClinic) {
      deleteClinicMutation.mutate(selectedClinic.id);
    }
  };
  
  // Handler for opening the edit dialog
  const handleEdit = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    editForm.reset({
      name: clinic.name,
      address: clinic.address,
      city: clinic.city,
      state: clinic.state,
      zipCode: clinic.zipCode,
      phone: clinic.phone,
      email: clinic.email,
      openingHours: clinic.openingHours,
      description: clinic.description || '',
      imageUrl: clinic.imageUrl || '',
    });
    setIsEditDialogOpen(true);
  };
  
  // Handler for opening the delete dialog
  const handleDelete = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setIsDeleteDialogOpen(true);
  };

  const handleView = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    navigate(`/clinic/${clinic.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader title="Clinic Management" />
      
      <main className="container mx-auto py-6 px-4">
        <div className="flex justify-between items-center mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <Button 
            onClick={() => {
              form.reset();
              setIsCreateDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Clinic & Admin
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading clinics...</span>
          </div>
        ) : isError ? (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="text-center text-destructive">
                <p>Error loading clinics: {error instanceof Error ? error.message : 'Unknown error'}</p>
                <Button 
                  variant="outline" 
                  className="mt-4" 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['clinics'] })}
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Clinics</CardTitle>
            </CardHeader>
            <CardContent>
              {clinics.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No clinics found</p>
                  <Button 
                    variant="outline" 
                    className="mt-4" 
                    onClick={() => {
                      form.reset();
                      setIsCreateDialogOpen(true);
                    }}
                  >
                    Add Your First Clinic & Admin
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
                      {clinics.map((clinic: Clinic) => (
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
        )}
        
        {/* Create Clinic Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Clinic & Admin</DialogTitle>
              <DialogDescription>
                Fill in the clinic details and create the clinic administrator account.  
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
                {/* Clinic Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center mb-4">
                    <Building className="h-5 w-5 mr-2" />
                    <h3 className="text-lg font-semibold">Clinic Information</h3>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Clinic Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                            <Input {...field} />
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
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                            <Input type="email" {...field} />
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
                          <FormLabel className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            Opening Hours
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Mon-Fri: 9am-5pm, Sat: 10am-2pm" 
                              {...field} 
                            />
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
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter clinic description and facilities"
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
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Clinic Image</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    // Create a preview URL for the selected image
                                    const reader = new FileReader();
                                    reader.onload = (e) => {
                                      const result = e.target?.result as string;
                                      field.onChange(result);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="cursor-pointer"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  field.onChange("");
                                }}
                              >
                                Clear
                              </Button>
                            </div>
                            
                            {/* Image Preview */}
                            {field.value && (
                              <div className="mt-4">
                                <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                                <div className="border rounded-lg p-2 bg-muted/50">
                                  <img
                                    src={field.value}
                                    alt="Clinic preview"
                                    className="max-w-full h-32 object-cover rounded"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          Select an image file (JPG, PNG, GIF) for your clinic
                        </p>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Clinic Admin Section */}
                <div className="border-t pt-6 mt-6 space-y-4">
                  <div className="flex items-center mb-4">
                    <UserCog className="h-5 w-5 mr-2" />
                    <h3 className="text-lg font-semibold">Clinic Administrator</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="adminUsername"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
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
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type="password" 
                                placeholder="•••••••••" 
                                {...field} 
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 px-3"
                                onClick={() => {
                                  const generatePassword = () => {
                                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
                                    let password = '';
                                    for (let i = 0; i < 12; i++) {
                                      password += chars.charAt(Math.floor(Math.random() * chars.length));
                                    }
                                    return password;
                                  };
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
                          <Input placeholder="John Doe" {...field} />
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
                            <Input placeholder="1234567890" {...field} />
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
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createClinicMutation.isPending}
                  >
                    {createClinicMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Create Clinic & Admin
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Edit Clinic Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Clinic</DialogTitle>
              <DialogDescription>
                Update the clinic's information.  
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clinic Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={editForm.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zip Code</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
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
                    control={editForm.control}
                    name="openingHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          Opening Hours
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Mon-Fri: 9am-5pm, Sat: 10am-2pm" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter clinic description and facilities"
                          className="resize-none"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clinic Image</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  // Create a preview URL for the selected image
                                  const reader = new FileReader();
                                  reader.onload = (e) => {
                                    const result = e.target?.result as string;
                                    field.onChange(result);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="cursor-pointer"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                field.onChange("");
                              }}
                            >
                              Clear
                            </Button>
                          </div>
                          
                          {/* Image Preview */}
                          {field.value && (
                            <div className="mt-4">
                              <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                              <div className="border rounded-lg p-2 bg-muted/50">
                                <img
                                  src={field.value}
                                  alt="Clinic preview"
                                  className="max-w-full h-32 object-cover rounded"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Select an image file (JPG, PNG, GIF) for your clinic
                      </p>
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateClinicMutation.isPending}
                  >
                    {updateClinicMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Update Clinic
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Delete Clinic Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Delete Clinic</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this clinic? This will permanently delete:
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
                <h4 className="text-sm font-semibold text-red-800 mb-2">⚠️ This will also delete:</h4>
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
      </main>
    </div>
  );
}
