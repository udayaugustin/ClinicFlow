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
import { LogOut, User, Calendar } from "lucide-react";

export function NavHeader() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  // For attenders, don't show the navigation if they're on their dashboard
  const isAttenderDashboard = user?.role === "attender" && location === "/attender-dashboard";

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