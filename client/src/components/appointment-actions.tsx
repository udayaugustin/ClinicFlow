import React from 'react';
import { Button } from "@/components/ui/button";

type AppointmentActionsProps = {
  appointmentId: number;
  status: string;
  onStart: (id: number) => void;
  onComplete: (id: number) => void;
  onHold: (id: number) => void;
  onPause: (id: number) => void;
  onCancel: (id: number) => void;
};

export function AppointmentActions({ 
  appointmentId,
  status,
  onStart,
  onComplete,
  onHold,
  onPause,
  onCancel
}: AppointmentActionsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {status === "scheduled" && (
        <>
          <Button
            size="sm"
            onClick={() => onStart(appointmentId)}
          >
            Start
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onHold(appointmentId)}
          >
            Hold
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPause(appointmentId)}
          >
            Pause
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCancel(appointmentId)}
          >
            Cancel
          </Button>
        </>
      )}
      
      {status === "start" && (
        <>
          <Button
            size="sm"
            onClick={() => onComplete(appointmentId)}
          >
            Complete
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onHold(appointmentId)}
          >
            Hold
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPause(appointmentId)}
          >
            Pause
          </Button>
        </>
      )}
      
      {(status === "hold" || status === "pause") && (
        <Button
          size="sm"
          onClick={() => onStart(appointmentId)}
        >
          Resume
        </Button>
      )}
    </div>
  );
} 