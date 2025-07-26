import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardHeader } from "@/components/dashboard-header";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Edit, Trash2, Plus, Loader2, Check, Eye, EyeOff, Copy } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import React from "react";

// Clinic Admin schema
const clinicAdminSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  clinicId: z.number().min(1, "Clinic selection is required"),
});

// Update schema (no password required for updates)
const clinicAdminUpdateSchema = clinicAdminSchema.omit({ password: true }).partial();

type ClinicAdminData = z.infer<typeof clinicAdminSchema>;
type ClinicAdminUpdateData = z.infer<typeof clinicAdminUpdateSchema>;

interface ClinicAdmin extends Omit<ClinicAdminData, 'password'> {
  id: number;
  role: string;
  clinic?: {
    id: number;
    name: string;
  };
}

export default function ClinicAdminCreation() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for managing clinic admin operations
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<ClinicAdmin | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{username: string; password: string} | null>(null);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  
  // Fetch all clinics
  const { data: clinics = [] } = useQuery({
    queryKey: ['clinics'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/clinics');
      return await res.json();
    },
  });

  // Fetch all clinic admins
  const { data: clinicAdmins = [], isLoading, isError, error } = useQuery({
    queryKey: ['clinic-admins'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/clinic-admins');
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

  // Form for creating clinic admins
  const form = useForm<ClinicAdminData>({
    resolver: zodResolver(clinicAdminSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      phone: "",
      email: "",
      clinicId: 0,
    },
  });
  
  // Form for editing clinic admins
  const editForm = useForm<ClinicAdminUpdateData>({
    resolver: zodResolver(clinicAdminUpdateSchema),
    defaultValues: {
      username: "",
      name: "",
      phone: "",
      email: "",
      clinicId: 0,
    },
  });

  // Create clinic admin mutation
  const createClinicAdminMutation = useMutation({
    mutationFn: async (data: ClinicAdminData) => {
      const res = await apiRequest("POST", "/api/clinic-admins", {
        ...data,
        role: "clinic_admin",
      });
      return await res.json();
    },
    onSuccess: (newAdmin) => {
      toast({
        title: "Success",
        description: "Clinic admin account created successfully",
      });
      
      // Show the credentials dialog
      setGeneratedCredentials({
        username: form.getValues('username'),
        password: form.getValues('password')
      });
      setShowCredentialsDialog(true);
      
      form.reset();
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['clinic-admins'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update clinic admin mutation
  const updateClinicAdminMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: ClinicAdminUpdateData }) => {
      const res = await apiRequest("PUT", `/api/clinic-admins/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Clinic admin updated successfully",
      });
      editForm.reset();
      setIsEditDialogOpen(false);
      setSelectedAdmin(null);
      queryClient.invalidateQueries({ queryKey: ['clinic-admins'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete clinic admin mutation
  const deleteClinicAdminMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/clinic-admins/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Clinic admin deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedAdmin(null);
      queryClient.invalidateQueries({ queryKey: ['clinic-admins'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate username based on clinic selection
  const handleClinicChange = (clinicId: string) => {
    const selectedClinic = clinics.find(c => c.id === parseInt(clinicId));
    if (selectedClinic && !form.getValues('username')) {
      const baseUsername = selectedClinic.name.toLowerCase().replace(/\s+/g, '');
      form.setValue('username', `${baseUsername}.admin`);
    }
  };

  // Generate random password
  const generatePassword = () => {
    const password = `admin${Math.floor(1000 + Math.random() * 9000)}`;
    form.setValue('password', password);
  };

  // Copy to clipboard function
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  // Form submission handlers
  const onCreateSubmit = (data: ClinicAdminData) => {
    createClinicAdminMutation.mutate(data);
  };
  
  const onEditSubmit = (data: ClinicAdminUpdateData) => {
    if (selectedAdmin) {
      updateClinicAdminMutation.mutate({ id: selectedAdmin.id, data });
    }
  };
  
  const onDeleteConfirm = () => {
    if (selectedAdmin) {
      deleteClinicAdminMutation.mutate(selectedAdmin.id);
    }
  };
  
  // Handler for opening the edit dialog
  const handleEdit = (admin: ClinicAdmin) => {
    setSelectedAdmin(admin);
    editForm.reset({
      username: admin.username,
      name: admin.name,
      phone: admin.phone || "",
      email: admin.email || "",
      clinicId: admin.clinicId,
    });
    setIsEditDialogOpen(true);
  };
  
  // Handler for opening the delete dialog
  const handleDelete = (admin: ClinicAdmin) => {
    setSelectedAdmin(admin);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader title="Clinic Admin Management" />
      
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
            Add New Clinic Admin
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading clinic admins...</span>
          </div>
        ) : isError ? (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="text-center text-destructive">
                <p>Error loading clinic admins: {error instanceof Error ? error.message : 'Unknown error'}</p>
                <Button 
                  variant="outline" 
                  className="mt-4" 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['clinic-admins'] })}
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Clinic Administrators</CardTitle>
            </CardHeader>
            <CardContent>
              {clinicAdmins.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No clinic admins found</p>
                  <Button 
                    variant="outline" 
                    className="mt-4" 
                    onClick={() => {
                      form.reset();
                      setIsCreateDialogOpen(true);
                    }}
                  >
                    Add Your First Clinic Admin
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Clinic</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="w-[150px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clinicAdmins.map((admin: ClinicAdmin) => (
                        <TableRow key={admin.id}>
                          <TableCell>{admin.name}</TableCell>
                          <TableCell>{admin.username}</TableCell>
                          <TableCell>
                            {admin.clinic ? (
                              <Badge variant="outline">{admin.clinic.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">No clinic assigned</span>
                            )}
                          </TableCell>
                          <TableCell>{admin.phone}</TableCell>
                          <TableCell>{admin.email || '-'}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleEdit(admin)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-destructive"
                                onClick={() => handleDelete(admin)}
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

        {/* Create Clinic Admin Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Clinic Admin</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new clinic administrator account.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="clinicId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clinic</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(parseInt(value));
                          handleClinicChange(value);
                        }}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a clinic" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clinics.map((clinic) => (
                            <SelectItem key={clinic.id} value={clinic.id.toString()}>
                              {clinic.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="clinic.admin" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Input 
                                type={showPassword ? "text" : "password"} 
                                {...field} 
                                placeholder="Enter password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={generatePassword}
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
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="John Doe" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="1234567890" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="admin@clinic.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                    disabled={createClinicAdminMutation.isPending}
                  >
                    {createClinicAdminMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Create Clinic Admin
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Edit Clinic Admin Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Clinic Admin</DialogTitle>
              <DialogDescription>
                Update the clinic administrator's information.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="clinicId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clinic</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a clinic" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clinics.map((clinic) => (
                            <SelectItem key={clinic.id} value={clinic.id.toString()}>
                              {clinic.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
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
                  control={editForm.control}
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
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
                    control={editForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
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
                    disabled={updateClinicAdminMutation.isPending}
                  >
                    {updateClinicAdminMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Update Clinic Admin
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Delete Clinic Admin Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Delete Clinic Admin</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this clinic administrator? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {selectedAdmin && (
                <div className="rounded-md bg-muted p-4">
                  <p><strong>Name:</strong> {selectedAdmin.name}</p>
                  <p><strong>Username:</strong> {selectedAdmin.username}</p>
                  <p><strong>Clinic:</strong> {selectedAdmin.clinic?.name || 'Not assigned'}</p>
                </div>
              )}
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
                disabled={deleteClinicAdminMutation.isPending}
                onClick={onDeleteConfirm}
              >
                {deleteClinicAdminMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Clinic Admin
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Credentials Display Dialog */}
        <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Clinic Admin Created Successfully!</DialogTitle>
              <DialogDescription>
                Please save these credentials. The password will not be shown again.
              </DialogDescription>
            </DialogHeader>
            {generatedCredentials && (
              <div className="space-y-4">
                <Alert>
                  <AlertTitle>Login Credentials</AlertTitle>
                  <AlertDescription className="mt-4 space-y-3">
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <p className="text-sm font-medium">Username</p>
                        <p className="font-mono">{generatedCredentials.username}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(generatedCredentials.username, "Username")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <p className="text-sm font-medium">Password</p>
                        <p className="font-mono">{generatedCredentials.password}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(generatedCredentials.password, "Password")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => {
                setShowCredentialsDialog(false);
                setGeneratedCredentials(null);
              }}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}