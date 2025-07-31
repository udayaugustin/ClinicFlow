import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard-header";
import { PlusCircle, Hospital, User, UserCog, Building2, Activity, Edit, Eye, Trash2, MapPin, Phone, Mail, Clock, Loader2, FileSpreadsheet, CreditCard } from "lucide-react";
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

type ClinicData = z.infer<typeof clinicSchema>;

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const [selectedMenuItem, setSelectedMenuItem] = useState("dashboard");
  const [showCreateForm, setShowCreateForm] = useState(false);
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

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Render main content based on selected menu item
  const renderMainContent = () => {
    if (selectedMenuItem === "clinic-management") {
      if (showCreateForm) {
        // Show create form
        return (
          <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create New Clinic</h1>
                <p className="text-gray-600 mt-1">Fill in the clinic details and administrator information</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateForm(false)}
              >
                ← Back to Clinic List
              </Button>
            </div>

            {/* Clinic Creation Form */}
            <Card className="max-w-4xl">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Hospital className="mr-2 h-6 w-6" />
                  Create New Clinic & Administrator
                </CardTitle>
                <CardDescription>
                  Fill in the clinic details and administrator information to create a new clinic
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-6">
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
                      </h3>
                      
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
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={createClinicMutation.isPending}
                      >
                        {createClinicMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create Clinic & Admin
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
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-primary">
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

    if (selectedMenuItem === "export-reports") {
      return <SuperAdminExportReports />;
    }

    if (selectedMenuItem === "refund") {
      return <RefundManagement />;
    }

    // Default dashboard view
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Welcome, {user.name}</h1>
        <div className="text-center py-12">
          <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Super Admin Dashboard</h2>
          <p className="text-gray-500">Select "Clinic Management" from the sidebar to get started</p>
        </div>
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
