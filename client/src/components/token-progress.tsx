import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";

type TokenProgressProps = {
  doctorId: number;
  patientToken?: number;
};

export function TokenProgress({ doctorId, patientToken }: TokenProgressProps) {
  const { data: availability, isLoading } = useQuery({
    queryKey: [`/api/doctors/${doctorId}/availability`],
    // Polling every 30 seconds to keep token status up to date
    refetchInterval: 30000,
  });

  if (isLoading) {
    return <Skeleton className="h-24" />;
  }

  if (!availability?.isAvailable) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-muted-foreground text-center">
            Doctor is currently not available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Current Token: {String(availability.currentToken).padStart(3, '0')}</span>
        </div>
        {patientToken && (
          <div className="mt-2">
            <div className="text-sm text-muted-foreground">
              Your Token: {String(patientToken).padStart(3, '0')}
            </div>
            <div className="text-sm text-muted-foreground">
              {patientToken > availability.currentToken ? (
                `Tokens ahead: ${patientToken - availability.currentToken}`
              ) : patientToken === availability.currentToken ? (
                <span className="text-primary font-medium">It's your turn!</span>
              ) : (
                <span className="text-muted-foreground">Consultation completed</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
