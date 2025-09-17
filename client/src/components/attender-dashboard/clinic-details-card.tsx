import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hospital, Edit,ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import React from "react";

interface ClinicOverview {
  clinic: {
    id: number;
    name: string;
    address: string;
    phone: string;
    openingHours: string;
  };
  todayStats: {
    totalDoctors: number;
    activeDoctors: number;
    totalAppointments: number;
  };
}

export function ClinicDetailsCard() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();

  const { data: clinicOverview, isLoading, error } = useQuery<ClinicOverview>({
    queryKey: ["clinicOverview", user.id],
    queryFn: async () => {
      const response = await fetch(`/api/attender/${user.id}/clinic-overview`);
      if (!response.ok) {
        throw new Error("Failed to fetch clinic overview");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-md">
        <CardContent className="p-6">
          <p className="text-red-500">Failed to load clinic details</p>
        </CardContent>
      </Card>
    );
  }

  if (!clinicOverview) return null;

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow h-[400px] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center">
          <Hospital className="mr-2 h-6 w-6" />
          Clinic Details
        </CardTitle>
        <CardDescription>
          View and manage clinic information
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col space-y-4">
        <div className="flex-grow space-y-4">
          <div>
            <h3 className="font-semibold text-lg">{clinicOverview.clinic.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{clinicOverview.clinic.address}</p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-sm">Phone:</span>
              <span className="text-sm">{clinicOverview.clinic.phone}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-sm">Hours:</span>
              <span className="text-sm">{clinicOverview.clinic.openingHours}</span>
            </div>
          </div>

         
        
        </div>
      </CardContent>
      <CardFooter className="flex-shrink-0">
        <Button 
          className="w-full"
          onClick={() => navigate("/attender-dashboard")}
        >
          Manage Tokens
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
