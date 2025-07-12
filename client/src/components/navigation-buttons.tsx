import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface NavigationButtonsProps {
  showHome?: boolean;
  showBack?: boolean;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  customBackPath?: string; // Optional custom back path instead of browser history
}

export function NavigationButtons({
  showHome = true,
  showBack = true,
  className = "",
  variant = "outline",
  size = "default",
  customBackPath
}: NavigationButtonsProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // Get home path based on user role
  const getHomePath = () => {
    if (!user) return "/";
    
    switch (user.role) {
      case "patient":
        return "/";
      case "doctor":
        return "/doctor";
      case "attender":
        return "/";
      case "clinic_admin":
      case "clinicadmin":
        return "/";
      case "hospital_admin":
        return "/clinic-admin-dashboard";
      case "super_admin":
        return "/super-admin-dashboard";
      default:
        return "/";
    }
  };

  const handleHomeClick = () => {
    navigate(getHomePath());
  };

  const handleBackClick = () => {
    if (customBackPath) {
      navigate(customBackPath);
    } else {
      // Use browser history if available, otherwise fallback to home
      if (window.history.length > 1) {
        window.history.back();
      } else {
        navigate(getHomePath());
      }
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showBack && (
        <Button
          variant={variant}
          size={size}
          onClick={handleBackClick}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {size !== "icon" && "Back"}
        </Button>
      )}
      
      {showHome && (
        <Button
          variant={variant}
          size={size}
          onClick={handleHomeClick}
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          {size !== "icon" && "Home"}
        </Button>
      )}
    </div>
  );
}

// Alternative compact version for headers/tight spaces
export function CompactNavigationButtons({
  showHome = true,
  showBack = true,
  className = ""
}: Pick<NavigationButtonsProps, 'showHome' | 'showBack' | 'className'>) {
  return (
    <NavigationButtons
      showHome={showHome}
      showBack={showBack}
      className={className}
      variant="ghost"
      size="icon"
    />
  );
}