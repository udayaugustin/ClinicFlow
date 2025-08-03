import React from 'react';
import { Button } from "@/components/ui/button";
import { Appointment } from "@shared/schema";

type AppointmentActionsProps = {
  appointment: Appointment & { patient?: any };
  onMarkAsStarted: () => void;
  onMarkAsCompleted: () => void;
  onHold: () => void;
  onNoShow: () => void;
};

export function AppointmentActions({ 
  appointment,
  onMarkAsStarted,
  onMarkAsCompleted,
  onHold,
  onNoShow
}: AppointmentActionsProps) {
  const status = appointment.status;
  
  return (
    <div className="flex gap-2 flex-wrap">
      {(status === "scheduled" || status === "token_started") && (
        <>
          <Button
            size="sm"
            onClick={onMarkAsStarted}
          >
            Start
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onHold}
          >
            Hold
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onNoShow}
          >
            No Show
          </Button>
        </>
      )}
      
      {(status === "start" || status === "in_progress") && (
        <>
          <Button
            size="sm"
            onClick={onMarkAsCompleted}
          >
            Complete
          </Button>
        </>
      )}
      
      {status === "hold" && (
        <>
          <Button
            size="sm"
            onClick={onMarkAsStarted}
          >
            Start
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onNoShow}
          >
            No Show
          </Button>
        </>
      )}
    </div>
  );
} 