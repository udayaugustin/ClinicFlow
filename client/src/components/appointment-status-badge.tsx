import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger,
  TooltipProvider 
} from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";

type AppointmentStatusBadgeProps = {
  status: string;
  statusNotes?: string;
};

export function AppointmentStatusBadge({ status, statusNotes }: AppointmentStatusBadgeProps) {
  const getVariant = () => {
    switch (status) {
      case "scheduled":
        return "default";
      case "completed":
        return "outline";
      case "start":
        return "secondary";
      case "hold":
      case "pause":
        return "warning";
      case "cancel":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <div className="flex items-center">
      <Badge variant={getVariant()}>
        {status === "start" ? "In Progress" : 
          status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
      
      {statusNotes && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-1 h-5 w-5">
                <InfoIcon className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{statusNotes}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
} 