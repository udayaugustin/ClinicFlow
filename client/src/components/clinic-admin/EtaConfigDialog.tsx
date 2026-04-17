// Dialog for clinic admin to set avg consultation time per doctor
import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EtaConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor: { id: number; name: string } | null;
  clinicId: number;
}

const QUICK_OPTIONS = [5, 10, 15, 20, 30];

export function EtaConfigDialog({ open, onOpenChange, doctor, clinicId }: EtaConfigDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [minutes, setMinutes] = useState<number | "">(15);
  const [error, setError] = useState("");
  const prevOpen = useRef(false);

  const { data: details, isLoading } = useQuery({
    queryKey: ["doctor-details", doctor?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/doctors/${doctor!.id}/details`);
      return res.json();
    },
    enabled: open && !!doctor,
  });

  useEffect(() => {
    if (open && !prevOpen.current) {
      // Reset to saved value each time dialog opens
      setMinutes(details?.consultationDuration ?? 15);
      setError("");
    }
    prevOpen.current = open;
  }, [open, details]);

  const mutation = useMutation({
    mutationFn: async (consultationMinutes: number) => {
      const res = await apiRequest(
        "PATCH",
        `/api/clinics/${clinicId}/doctors/${doctor!.id}/consultation-time`,
        { consultationMinutes }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update");
      }
      return res.json();
    },
    onSuccess: (_, consultationMinutes) => {
      toast({
        title: "ETA updated",
        description: `${doctor?.name} set to ${consultationMinutes} min/patient`,
      });
      queryClient.invalidateQueries({ queryKey: ["doctor-details", doctor?.id] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to update",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const val = Number(minutes);
    if (!minutes || isNaN(val) || val < 1 || val > 120) {
      setError("Please enter a valid time between 1 and 120 minutes.");
      return;
    }
    setError("");
    mutation.mutate(val);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-blue-500" />
            Set Consultation Time — {doctor?.name}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">
                Avg consultation time (minutes)
              </Label>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                This sets the base ETA for all patients in this doctor's queue today and future schedules.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={minutes}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const parsed = parseInt(raw);
                    setMinutes(raw === "" ? "" : isNaN(parsed) ? "" : parsed);
                    setError("");
                  }}
                  className="w-24"
                  placeholder="e.g. 15"
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
              {error && <p className="text-xs text-destructive mt-1">{error}</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Quick select</Label>
              <div className="flex gap-2 mt-2">
                {QUICK_OPTIONS.map((opt) => (
                  <Button
                    key={opt}
                    variant={minutes === opt ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMinutes(opt)}
                  >
                    {opt}m
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={mutation.isPending || isLoading}>
            {mutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
