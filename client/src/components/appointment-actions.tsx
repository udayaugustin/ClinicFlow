import React from 'react';
import { Button } from "@/components/ui/button";
import { Appointment } from "@shared/schema";

type AppointmentActionsProps = {
  appointment: Appointment & { patient?: any };
  onMarkAsStarted: () => void;
  onMarkAsCompleted: () => void;
  onHold: () => void;
  onPause: () => void;
  onCancel: () => void;
};

export function AppointmentActions({ 
  appointment,
  onMarkAsStarted,
  onMarkAsCompleted,
  onHold,
  onPause,
  onCancel
}: AppointmentActionsProps) {
  const status = appointment.status;
  
  return (
    <div className="flex gap-2 flex-wrap">
      {status === "scheduled" && (
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
            variant="outline"
            onClick={onPause}
          >
            Pause
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </>
      )}
      
      {status === "start" && (
        <>
          <Button
            size="sm"
            onClick={onMarkAsCompleted}
          >
            Complete
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
            variant="outline"
            onClick={onPause}
          >
            Pause
          </Button>
        </>
      )}
      
      {(status === "hold" || status === "pause") && (
        <Button
          size="sm"
          onClick={onMarkAsStarted}
        >
          Resume
        </Button>
      )}
    </div>
  );
} 