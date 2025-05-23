import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Link } from "wouter";

interface DashboardHeaderProps {
  title: string;
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  const { user, logoutMutation } = useAuth();

  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {user && <p className="text-sm text-gray-500">Logged in as {user.name}</p>}
        </div>
        
        <div className="flex items-center gap-4">
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            Home
          </Link>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
