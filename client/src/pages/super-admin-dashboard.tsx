import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard-header";
import { PlusCircle, Hospital, User } from "lucide-react";
import React from "react";

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  
  // No need for redirects as this component will only be rendered for super admins
  // from the home page

  return (
    <div className="min-h-screen bg-gray-50">
      {/* <DashboardHeader title="Super Admin Dashboard" /> */}
      
      <main className="container mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold mb-6">Welcome, {user.name}</h1>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-6 w-6" />
                Doctor Management
              </CardTitle>
              <CardDescription>
                Create and manage doctor accounts in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Add new doctors to the clinic system with their specialties and details.</p>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={() => navigate("/doctor-creation")}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Doctor
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Hospital className="mr-2 h-6 w-6" />
                Clinic Management
              </CardTitle>
              <CardDescription>
                Create and manage clinic locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Add new clinic locations with their address, contact details, and operating hours.</p>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={() => navigate("/clinic-creation")}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Clinic
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
