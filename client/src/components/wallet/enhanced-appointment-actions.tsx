import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Play, 
  Pause, 
  Square, 
  CheckCircle, 
  XCircle, 
  UserX,
  DollarSign,
  RefreshCw
} from 'lucide-react';

interface EnhancedAppointmentActionsProps {
  appointment: {
    id: number;
    status: string;
    patientId: number | null;
    guestName?: string;
    doctorId: number;
    scheduleId: number;
    clinicId: number;
    consultationFee: string;
    isPaid: boolean;
    isRefundEligible: boolean;
    hasBeenRefunded: boolean;
  };
  onStatusUpdate?: () => void;
}

export function EnhancedAppointmentActions({ 
  appointment, 
  onStatusUpdate 
}: EnhancedAppointmentActionsProps) {
  const { toast } = useToast();
  const [cancelReason, setCancelReason] = useState('');
  const [noShowNotes, setNoShowNotes] = useState('');

  // Mutation for updating appointment status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, statusNotes }: { status: string; statusNotes?: string }) => {
      const res = await apiRequest('PATCH', `/api/appointments/${appointment.id}/status`, {
        status,
        statusNotes
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      onStatusUpdate?.();
      toast({
        title: 'Success',
        description: 'Appointment status updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update status',
        variant: 'destructive',
      });
    },
  });

  // Mutation for marking patient as no-show
  const noShowMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/appointments/${appointment.id}/no-show`, {
        notes: noShowNotes
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      onStatusUpdate?.();
      setNoShowNotes('');
      toast({
        title: 'Success',
        description: 'Patient marked as no-show - no refund will be processed',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to mark as no-show',
        variant: 'destructive',
      });
    },
  });

  // Mutation for cancelling schedule with refunds
  const cancelScheduleWithRefundsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/schedules/${appointment.scheduleId}/cancel-with-refunds`, {
        cancelReason
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      onStatusUpdate?.();
      setCancelReason('');
      toast({
        title: 'Schedule Cancelled',
        description: `${data.refundedAppointments} appointments refunded. Total: ₹${data.totalRefundAmount}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to cancel schedule',
        variant: 'destructive',
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'token_started': return 'bg-blue-500';
      case 'in_progress': return 'bg-green-500';
      case 'hold': return 'bg-yellow-500';
      case 'pause': return 'bg-orange-500';
      case 'completed': return 'bg-purple-500';
      case 'cancel': return 'bg-red-500';
      case 'no_show': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const canUpdateStatus = !['completed', 'cancel', 'no_show'].includes(appointment.status);
  const isWalkIn = !appointment.patientId;
  const consultationFee = parseFloat(appointment.consultationFee);

  return (
    <div className="space-y-2">
      {/* Current Status */}
      <div className="flex items-center gap-2">
        <Badge className={`text-white ${getStatusColor(appointment.status)}`}>
          {appointment.status.replace('_', ' ').toUpperCase()}
        </Badge>
        {appointment.isPaid && (
          <Badge variant="outline" className="text-green-600 border-green-600">
            PAID ₹{consultationFee}
          </Badge>
        )}
        {appointment.hasBeenRefunded && (
          <Badge variant="outline" className="text-blue-600 border-blue-600">
            REFUNDED
          </Badge>
        )}
      </div>

      {/* Action Buttons */}
      {canUpdateStatus && (
        <div className="flex flex-wrap gap-2">
          {appointment.status === 'token_started' && (
            <Button
              size="sm"
              onClick={() => updateStatusMutation.mutate({ status: 'in_progress' })}
              disabled={updateStatusMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-3 w-3 mr-1" />
              Start
            </Button>
          )}

          {appointment.status === 'in_progress' && (
            <>
              <Button
                size="sm"
                onClick={() => updateStatusMutation.mutate({ status: 'hold' })}
                disabled={updateStatusMutation.isPending}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                <Pause className="h-3 w-3 mr-1" />
                Hold
              </Button>
              
              <Button
                size="sm"
                onClick={() => updateStatusMutation.mutate({ status: 'completed' })}
                disabled={updateStatusMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Complete
              </Button>
            </>
          )}

          {appointment.status === 'hold' && (
            <Button
              size="sm"
              onClick={() => updateStatusMutation.mutate({ status: 'in_progress' })}
              disabled={updateStatusMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-3 w-3 mr-1" />
              Resume
            </Button>
          )}

          {/* No Show Button (only for registered patients) */}
          {!isWalkIn && (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-500 text-gray-700 hover:bg-gray-100"
                >
                  <UserX className="h-3 w-3 mr-1" />
                  No Show
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Mark Patient as No-Show</DialogTitle>
                  <DialogDescription>
                    This will mark the patient as not present. No refund will be processed as per policy.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="noShowNotes">Notes (Optional)</Label>
                    <Textarea
                      id="noShowNotes"
                      value={noShowNotes}
                      onChange={(e) => setNoShowNotes(e.target.value)}
                      placeholder="Add any additional notes about the no-show..."
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button
                    onClick={() => noShowMutation.mutate()}
                    disabled={noShowMutation.isPending}
                    className="bg-gray-600 hover:bg-gray-700"
                  >
                    {noShowMutation.isPending && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                    Mark No Show
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Cancel Individual Appointment */}
          <Button
            size="sm"
            onClick={() => updateStatusMutation.mutate({ status: 'cancel', statusNotes: 'Cancelled by attender' })}
            disabled={updateStatusMutation.isPending}
            variant="outline"
            className="border-red-500 text-red-700 hover:bg-red-50"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        </div>
      )}

      {/* Schedule-wide Actions */}
      <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground mb-2">Schedule Actions:</p>
        
        {/* Cancel Entire Schedule with Refunds */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="border-red-500 text-red-700 hover:bg-red-50"
            >
              <DollarSign className="h-3 w-3 mr-1" />
              Cancel Schedule + Refunds
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Schedule with Automatic Refunds</DialogTitle>
              <DialogDescription>
                This will cancel the entire schedule and automatically process refunds for all eligible appointments.
                Patients who have already been seen (completed) will not receive refunds.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="cancelReason">Cancellation Reason *</Label>
                <Textarea
                  id="cancelReason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g., Doctor emergency, Equipment failure, etc."
                  className="mt-1"
                  required
                />
              </div>
              
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-800 mb-1">⚠️ Important</p>
                <p className="text-xs text-yellow-700">
                  • All eligible patients will receive automatic wallet refunds<br/>
                  • Completed appointments will not be refunded<br/>
                  • Walk-in patients (cash payments) need manual processing<br/>
                  • Patients will receive notifications about the cancellation and refunds
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                onClick={() => cancelScheduleWithRefundsMutation.mutate()}
                disabled={cancelScheduleWithRefundsMutation.isPending || !cancelReason.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                {cancelScheduleWithRefundsMutation.isPending && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                Cancel Schedule & Process Refunds
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}