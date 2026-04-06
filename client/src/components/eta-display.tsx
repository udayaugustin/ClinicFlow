import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import React from "react";

interface ETADisplayProps {
  appointmentId: number;
  tokenNumber: number;
  className?: string;
  showDetails?: boolean;
}

function getStageInfo(status: string) {
  switch (status) {
    case "token_started":
      return { label: "Scheduled", variant: "outline" as const, description: "Based on scheduled start time" };
    case "in_progress":
      return { label: "Updated", variant: "secondary" as const, description: "Updated for doctor arrival" };
    default:
      return { label: "Live", variant: "default" as const, description: "Real-time estimate" };
  }
}

export function ETADisplay({ appointmentId, tokenNumber, className = "", showDetails = false }: ETADisplayProps) {
  const { data: eta, isLoading } = useQuery({
    queryKey: [`/api/appointments/${appointmentId}/eta`],
    refetchInterval: 10000,
    retry: 1,
    staleTime: 5000,
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
  const stageInfo = getStageInfo(eta.currentAppointmentStatus || "token_started");

  return (
    <div className={`flex flex-col gap-1 p-3 bg-gray-50 rounded-lg border ${className}`}>
      <div className="flex items-center gap-2 text-sm">
        <Timer className="h-4 w-4 text-blue-500" />
        <span className="font-medium">ETA: {format(etaDate, "h:mm a")}</span>
        <Badge variant={stageInfo.variant}>{stageInfo.label}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">{stageInfo.description}</p>
      {showDetails && (
        <div className="text-xs text-muted-foreground mt-1">
          {eta.currentAppointmentStatus === "completed" ? (
            `Your Token: ${eta.tokenNumber} | Avg time: ${eta.avgConsultationTime} min`
          ) : (
            `Current Token: ${eta.currentConsultingToken || "-"} | Completed: ${eta.completedTokenCount || "-"} | Avg time: ${eta.avgConsultationTime} min`
          )}
        </div>
      )}
    </div>
  );
}
