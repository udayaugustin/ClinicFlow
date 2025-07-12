import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Timer } from "lucide-react";
import React from "react";

interface ETADisplayProps {
  appointmentId: number;
  tokenNumber: number;
  className?: string;
  showDetails?: boolean;
}

export function ETADisplay({ appointmentId, tokenNumber, className = "", showDetails = false }: ETADisplayProps) {
  const { data: eta, isLoading } = useQuery({
    queryKey: [`/api/appointments/${appointmentId}/eta`],
    refetchInterval: 10000, // Refresh every 10 seconds for more responsive updates
    retry: 1,
    staleTime: 5000 // Consider data stale after 5 seconds
  });

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <Timer className="h-4 w-4 animate-pulse" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!eta || !eta.estimatedStartTime) {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <Timer className="h-4 w-4" />
        <span>ETA pending...</span>
      </div>
    );
  }

  const etaDate = new Date(eta.estimatedStartTime);
  
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <Timer className="h-4 w-4 text-muted-foreground" />
      <div>
        <span className="font-medium">
          ETA: {format(etaDate, "h:mm a")}
        </span>
        {showDetails && (
          <div className="text-xs text-muted-foreground mt-1">
            {eta.currentAppointmentStatus === 'completed' ? (
              // For completed appointments, only show your token and avg time
              `Your Token: ${eta.tokenNumber} | Avg time: ${eta.avgConsultationTime} min`
            ) : (
              // For active appointments, show current, completed, and your token
              `Current Token: ${eta.currentConsultingToken || '-'} | Completed: ${eta.completedTokenCount || '-'}  | Avg time: ${eta.avgConsultationTime} min`
            )}
          </div>
        )}
      </div>
    </div>
  );
}