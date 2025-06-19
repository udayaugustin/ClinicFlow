import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard-header";
import { Hospital, Users, Calendar } from "lucide-react";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ClinicDetailsCard } from "@/components/attender-dashboard/clinic-details-card";
import { DoctorsListCard } from "@/components/attender-dashboard/doctors-list-card";
import { SchedulesTodayCard } from "@/components/attender-dashboard/schedules-today-card";

export default function SimpleAttenderDashboard() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold mb-6">Welcome, {user.name}</h1>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ClinicDetailsCard />
          <DoctorsListCard />
          <SchedulesTodayCard />
        </div>
      </main>
    </div>
  );
}
