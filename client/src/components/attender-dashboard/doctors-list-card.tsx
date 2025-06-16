import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";

interface DoctorSummary {
  doctors: Array<{
    id: number;
    name: string;
    specialty: string;
    hasArrived: boolean;
    todayAppointments: number;
  }>;
  totalAssigned: number;
}

export function DoctorsListCard() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();

  const { data: doctorsSummary, isLoading, error } = useQuery<DoctorSummary>({
    queryKey: ["doctorsSummary", user.id],
    queryFn: async () => {
      const response = await fetch(`/api/attender/${user.id}/doctors-summary`);
      if (!response.ok) {
        throw new Error("Failed to fetch doctors summary");
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
          <p className="text-red-500">Failed to load doctors list</p>
        </CardContent>
      </Card>
    );
  }

  if (!doctorsSummary) return null;

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="mr-2 h-6 w-6" />
          Doctors List
        </CardTitle>
        <CardDescription>
          View assigned doctors and their status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {doctorsSummary.doctors.slice(0, 5).map((doctor) => (
            <div key={doctor.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{doctor.name}</p>
                <p className="text-sm text-gray-600">{doctor.specialty}</p>
              </div>
              <div className="text-right">
                <Badge variant={doctor.hasArrived ? "success" : "secondary"}>
                  {doctor.hasArrived ? "Present" : "Away"}
                </Badge>
                <p className="text-sm text-gray-600 mt-1">
                  {doctor.todayAppointments} appointments
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <p className="text-sm text-gray-600">
          {doctorsSummary.totalAssigned} total doctors
        </p>
        <Button 
          variant="ghost"
          size="sm"
          className="text-primary" 
          onClick={() => navigate("/attender-dashboard")}
        >
          View All
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
