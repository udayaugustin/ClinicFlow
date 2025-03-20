import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Calendar, UserPlus, Clock } from "lucide-react";
import { NotificationPopover } from "./notifications/notification-popover";

export function NavHeader() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  // For attenders, don't show the navigation if they're on their dashboard
  const isAttenderDashboard = user?.role === "attender" && location === "/attender-dashboard";
  
  // Check if user can manage doctors (hospital_admin or attender)
  const canManageDoctors = user?.role === "hospital_admin" || user?.role === "attender";
  
  // Check if user can access schedules (hospital_admin, attender, or doctor)
  const canAccessSchedules = user?.role === "hospital_admin" || user?.role === "attender" || user?.role === "doctor";

  // Check if user can receive notifications (patients and doctors)
  const canReceiveNotifications = user?.role === "patient" || user?.role === "doctor";

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={user?.role === "attender" ? "/attender-dashboard" : "/"}>
          <a className="text-2xl font-bold text-primary">MedClinic</a>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              {!isAttenderDashboard && user.role !== "attender" && (
                <Button variant="ghost" asChild className="hidden md:flex">
                  <Link href="/appointments">
                    <Calendar className="mr-2 h-4 w-4" />
                    My Appointments
                  </Link>
                </Button>
              )}
              {canManageDoctors && (
                <Button variant="ghost" asChild className="hidden md:flex">
                  <Link href="/doctor-management">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Manage Doctors
                  </Link>
                </Button>
              )}
              {canAccessSchedules && (
                <Button variant="ghost" asChild className="hidden md:flex">
                  <Link href="/schedules">
                    <Clock className="mr-2 h-4 w-4" />
                    Schedules
                  </Link>
                </Button>
              )}
              
              {/* Show notification bell for patients and doctors */}
              {canReceiveNotifications && <NotificationPopover />}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.imageUrl || undefined} alt={user.name} />
                      <AvatarFallback>
                        {user.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="gap-2">
                    <User size={16} />
                    <span>{user.name}</span>
                  </DropdownMenuItem>
                  {!isAttenderDashboard && (
                    <DropdownMenuItem asChild>
                      {user.role === "attender" ? (
                        <Link href="/attender-dashboard" className="gap-2">
                          <Calendar size={16} />
                          <span>Doctor Dashboard</span>
                        </Link>
                      ) : (
                        <Link href="/appointments" className="gap-2">
                          <Calendar size={16} />
                          <span>My Appointments</span>
                        </Link>
                      )}
                    </DropdownMenuItem>
                  )}
                  {canManageDoctors && (
                    <DropdownMenuItem asChild>
                      <Link href="/doctor-management" className="gap-2">
                        <UserPlus size={16} />
                        <span>Manage Doctors</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {canAccessSchedules && (
                    <DropdownMenuItem asChild>
                      <Link href="/schedules" className="gap-2">
                        <Clock size={16} />
                        <span>Schedules</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="gap-2 text-red-600"
                    onClick={() => logoutMutation.mutate()}
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/auth">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/auth">Register</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}