import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Checkbox } from "./ui/checkbox";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, Hospital, Calendar, RefreshCw, CheckCircle } from "lucide-react";
import { invalidateWalletQueries } from "@/utils/wallet-utils";

interface Clinic {
  id: number;
  name: string;
  city: string;
  state: string;
}

interface CancelledSchedule {
  id: number;
  doctorName: string;
  date: string;
  startTime: string;
  endTime: string;
  cancelReason: string;
  appointmentCount: number;
}

interface CancelledAppointment {
  id: number;
  patientId: number;
  consultationFee: string;
  hasBeenRefunded?: boolean;
  refundAmount?: string;
  isEligibleForRefund?: boolean;
  serialNumber: number;
  patientName: string;
  mobileNumber: string;
  hospitalName: string;
  doctorName: string;
  scheduleDate: string;
  cancelReason: string;
  tokenStatus: string;
}

export function RefundManagement() {
  const [selectedClinic, setSelectedClinic] = useState<string>("");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");
  const [selectedSchedule, setSelectedSchedule] = useState<string>("");
  const [selectedAppointments, setSelectedAppointments] = useState<Set<number>>(new Set());
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all clinics
  const { data: clinics = [], isLoading: loadingClinics } = useQuery<Clinic[]>({
    queryKey: ['clinics'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/clinics');
      return await res.json();
    },
  });

  // Fetch cancelled schedules based on clinic and date filter
  const { data: cancelledSchedules = [], isLoading: loadingSchedules } = useQuery<CancelledSchedule[]>({
    queryKey: ['cancelled-schedules', selectedClinic, selectedDateFilter],
    queryFn: async () => {
      if (!selectedClinic || !selectedDateFilter) return [];
      const res = await apiRequest('GET', `/api/super-admin/cancelled-schedules/${selectedClinic}?dateFilter=${selectedDateFilter}`);
      return await res.json();
    },
    enabled: !!(selectedClinic && selectedDateFilter),
  });

  // Fetch cancelled appointments for selected schedule
  const { data: cancelledAppointments = [], isLoading: loadingAppointments, refetch } = useQuery<CancelledAppointment[]>({
    queryKey: ['cancelled-appointments', selectedSchedule],
    queryFn: async () => {
      if (!selectedSchedule) return [];
      const res = await apiRequest('GET', `/api/super-admin/cancelled-schedule-appointments/${selectedSchedule}`);
      return await res.json();
    },
    enabled: !!selectedSchedule,
  });

  // Date filter options
  const getDateFilterValue = (filter: string) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    switch (filter) {
      case 'today':
        return today.toISOString().split('T')[0];
      case 'yesterday':
        return yesterday.toISOString().split('T')[0];
      case 'last7days':
        return `${sevenDaysAgo.toISOString().split('T')[0]},${today.toISOString().split('T')[0]}`;
      default:
        return '';
    }
  };

  // Handle appointment selection
  const handleAppointmentSelect = (appointmentId: number, checked: boolean) => {
    const newSelection = new Set(selectedAppointments);
    if (checked) {
      newSelection.add(appointmentId);
    } else {
      newSelection.delete(appointmentId);
    }
    setSelectedAppointments(newSelection);
  };

  // Handle select all - only select appointments that are eligible for refund
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Only select appointments that are marked as eligible for refund
      const eligibleAppointments = cancelledAppointments
        .filter(appointment => appointment.isEligibleForRefund)
        .map(a => a.id);
      setSelectedAppointments(new Set(eligibleAppointments));
    } else {
      setSelectedAppointments(new Set());
    }
  };

  // Process refunds
  const handleProcessRefunds = async () => {
    if (selectedAppointments.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one appointment to process refunds",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingRefund(true);
    
    try {
      // Process refunds for each selected appointment using admin wallet transaction endpoint
      const refundPromises = Array.from(selectedAppointments).map(async (appointmentId) => {
        const appointment = cancelledAppointments.find(a => a.id === appointmentId);
        if (!appointment || !appointment.patientId) return; // Skip walk-in appointments (no patientId)
        
        const refundAmount = parseFloat(appointment.consultationFee || '21'); // Use actual fee or default to ₹21
        
        // Call admin wallet transaction API to credit consultation fee back to patient
        const response = await apiRequest('POST', '/api/admin/wallet/transaction', {
          patientId: appointment.patientId, // Use correct patient ID
          amount: refundAmount, // Use actual consultation fee amount
          isCredit: true,
          reason: `Refund for cancelled appointment - Schedule: ${selectedSchedule}`
        });
        
        if (!response.ok) {
          throw new Error(`Failed to process refund for appointment ${appointmentId}`);
        }
        
        // Mark appointment as refunded in database
        const markRefundedResponse = await apiRequest('PATCH', `/api/appointments/${appointmentId}/mark-refunded`, {
          refundAmount: refundAmount
        });
        
        if (!markRefundedResponse.ok) {
          console.warn(`Failed to mark appointment ${appointmentId} as refunded, but wallet transaction succeeded`);
        }
        
        return response.json();
      });
      
      await Promise.all(refundPromises);
      
      toast({
        title: "Refund Success",
        description: `Successfully processed refunds for ${selectedAppointments.size} cancelled appointment(s)`,
        variant: "default",
      });
      
      // Invalidate wallet queries to refresh wallet balance across the app
      invalidateWalletQueries(queryClient);
      
      // Clear selections and refresh data
      setSelectedAppointments(new Set());
      refetch();
      
    } catch (error) {
      console.error('Error processing refunds:', error);
      toast({
        title: "Error",
        description: "Failed to process refunds. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingRefund(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Refund Management</h1>
        <p className="text-gray-600 mt-1">Process refunds for cancelled schedules and appointments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filter Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Hospital className="mr-2 h-5 w-5" />
                Filter Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Hospital Selection */}
              <div className="space-y-2">
                <Label htmlFor="clinic-select">Select Hospital</Label>
                <Select
                  value={selectedClinic}
                  onValueChange={setSelectedClinic}
                  disabled={loadingClinics}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingClinics ? "Loading..." : "Choose hospital"} />
                  </SelectTrigger>
                  <SelectContent>
                    {clinics.map((clinic) => (
                      <SelectItem key={clinic.id} value={clinic.id.toString()}>
                        <div className="flex items-center">
                          <Hospital className="mr-2 h-4 w-4" />
                          <span>{clinic.name}</span>
                          <span className="text-sm text-gray-500 ml-2">({clinic.city})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Filter */}
              <div className="space-y-2">
                <Label>Date Filter</Label>
                <div className="space-y-2">
                  <Button
                    variant={selectedDateFilter === 'today' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedDateFilter('today');
                      setSelectedSchedule(""); // Reset schedule selection
                      setSelectedAppointments(new Set()); // Reset appointment selection
                    }}
                    className="w-full justify-start"
                    disabled={!selectedClinic}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Today
                  </Button>
                  <Button
                    variant={selectedDateFilter === 'yesterday' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedDateFilter('yesterday');
                      setSelectedSchedule(""); // Reset schedule selection
                      setSelectedAppointments(new Set()); // Reset appointment selection
                    }}
                    className="w-full justify-start"
                    disabled={!selectedClinic}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Yesterday
                  </Button>
                  <Button
                    variant={selectedDateFilter === 'last7days' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedDateFilter('last7days');
                      setSelectedSchedule(""); // Reset schedule selection
                      setSelectedAppointments(new Set()); // Reset appointment selection
                    }}
                    className="w-full justify-start"
                    disabled={!selectedClinic}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Last 7 Days
                  </Button>
                </div>
              </div>

              {/* Schedule Selection */}
              {selectedDateFilter && (
                <div className="space-y-2">
                  <Label htmlFor="schedule-select">Select Cancelled Schedule</Label>
                  <Select
                    value={selectedSchedule}
                    onValueChange={(value) => {
                      setSelectedSchedule(value);
                      setSelectedAppointments(new Set()); // Reset appointment selection
                    }}
                    disabled={loadingSchedules || cancelledSchedules.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {selectedSchedule ? (
                          <div className="flex flex-col text-left">
                            <div className="font-medium">
                              {cancelledSchedules.find(s => s.id.toString() === selectedSchedule)?.doctorName} - {new Date(cancelledSchedules.find(s => s.id.toString() === selectedSchedule)?.date || '').toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              {cancelledSchedules.find(s => s.id.toString() === selectedSchedule)?.startTime} - {cancelledSchedules.find(s => s.id.toString() === selectedSchedule)?.endTime}
                            </div>
                          </div>
                        ) : (
                          loadingSchedules 
                            ? "Loading schedules..." 
                            : cancelledSchedules.length === 0 
                            ? "No cancelled schedules found"
                            : "Choose cancelled schedule"
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-w-[400px]">
                      {cancelledSchedules.map((schedule) => (
                        <SelectItem key={schedule.id} value={schedule.id.toString()}>
                          <div className="flex flex-col py-1 w-full">
                            <div className="font-medium text-sm">
                              {schedule.doctorName} - {new Date(schedule.date).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {schedule.startTime} - {schedule.endTime} • {schedule.appointmentCount} appointments
                            </div>
                            <div className="text-xs text-orange-600 mt-1 break-words">
                              <span className="font-medium">Reason:</span> {schedule.cancelReason}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Refund Actions */}
              {selectedAppointments.size > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>Selected: {selectedAppointments.size} appointment(s)</Label>
                  <Button
                    onClick={handleProcessRefunds}
                    disabled={isProcessingRefund}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isProcessingRefund ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Process Refunds
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cancelled Appointments Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Cancelled Appointments - Refund Processing
                </div>
                {cancelledAppointments.length > 0 && (
                  <div className="text-sm text-gray-600">
                    {cancelledAppointments.length} cancelled appointment(s) found
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedClinic || !selectedDateFilter || !selectedSchedule ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                  <div className="space-y-2">
                    {!selectedClinic && <p>1. Please select a hospital</p>}
                    {selectedClinic && !selectedDateFilter && <p>2. Please select a date filter</p>}
                    {selectedClinic && selectedDateFilter && !selectedSchedule && <p>3. Please select a cancelled schedule</p>}
                  </div>
                </div>
              ) : loadingAppointments ? (
                <div className="text-center py-8">
                  <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-500 mb-4" />
                  <p className="text-gray-500">Loading appointments for refund processing...</p>
                </div>
              ) : cancelledAppointments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="mx-auto h-12 w-12 mb-4 text-green-400" />
                  <p>No appointments found for the selected cancelled schedule</p>
                  <p className="text-sm">This schedule might not have any booked appointments.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Select All Option */}
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all"
                        checked={
                          cancelledAppointments.length > 0 && 
                          cancelledAppointments.filter(a => a.isEligibleForRefund).length > 0 &&
                          selectedAppointments.size === cancelledAppointments.filter(a => a.isEligibleForRefund).length
                        }
                        onCheckedChange={handleSelectAll}
                      />
                      <Label htmlFor="select-all" className="text-sm font-medium">
                        Select All Eligible ({cancelledAppointments.filter(a => a.isEligibleForRefund).length})
                      </Label>
                      {cancelledAppointments.filter(a => !a.isEligibleForRefund).length > 0 && (
                        <span className="text-xs text-gray-500">
                          • {cancelledAppointments.filter(a => a.tokenStatus === 'completed').length} completed, {cancelledAppointments.filter(a => a.tokenStatus === 'no_show').length} no-show, {cancelledAppointments.filter(a => a.hasBeenRefunded).length} already refunded (not eligible)
                        </span>
                      )}
                    </div>
                    {selectedAppointments.size > 0 && (
                      <div className="text-sm text-blue-600 font-medium">
                        {selectedAppointments.size} appointment(s) selected for refund
                      </div>
                    )}
                  </div>

                  {/* Appointments Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Select</TableHead>
                          <TableHead className="w-16">S.No</TableHead>
                          <TableHead className="min-w-[150px]">Patient Name</TableHead>
                          <TableHead className="min-w-[120px]">Mobile Number</TableHead>
                          <TableHead className="min-w-[150px]">Hospital Name</TableHead>
                          <TableHead className="min-w-[150px]">Doctor Name</TableHead>
                          <TableHead className="min-w-[120px]">Date of Schedule</TableHead>
                          <TableHead className="min-w-[200px]">Reason for Cancellation</TableHead>
                          <TableHead className="min-w-[120px]">Token Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cancelledAppointments.map((appointment) => (
                          <TableRow 
                            key={appointment.id} 
                            className={`hover:bg-gray-50 ${
                              !appointment.isEligibleForRefund
                                ? 'bg-gray-50 opacity-60' 
                                : ''
                            }`}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedAppointments.has(appointment.id)}
                                onCheckedChange={(checked) => handleAppointmentSelect(appointment.id, checked as boolean)}
                                disabled={!appointment.isEligibleForRefund}
                              />
                            </TableCell>
                            <TableCell className="font-medium text-center">{appointment.serialNumber}</TableCell>
                            <TableCell className="font-medium">{appointment.patientName}</TableCell>
                            <TableCell className="font-mono">{appointment.mobileNumber}</TableCell>
                            <TableCell>{appointment.hospitalName}</TableCell>
                            <TableCell>{appointment.doctorName}</TableCell>
                            <TableCell className="font-medium">{new Date(appointment.scheduleDate).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="text-sm max-w-[200px] truncate" title={appointment.cancelReason}>
                                {appointment.cancelReason}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  appointment.tokenStatus === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                  appointment.tokenStatus === 'completed' ? 'bg-green-100 text-green-800' :
                                  appointment.tokenStatus === 'cancel' ? 'bg-red-100 text-red-800' :
                                  appointment.tokenStatus === 'no_show' ? 'bg-orange-100 text-orange-800' :
                                  appointment.tokenStatus === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {appointment.tokenStatus === 'cancel' ? 'Cancelled' :
                                   appointment.tokenStatus === 'no_show' ? 'No Show' :
                                   appointment.tokenStatus ? appointment.tokenStatus.charAt(0).toUpperCase() + appointment.tokenStatus.slice(1) : 'Unknown'}
                                </span>
                                {appointment.tokenStatus === 'completed' && (
                                  <span className="text-xs text-gray-500">
                                    (Service delivered - no refund)
                                  </span>
                                )}
                                {appointment.tokenStatus === 'no_show' && (
                                  <span className="text-xs text-gray-500">
                                    (Patient fault - not eligible)
                                  </span>
                                )}
                                {appointment.isEligibleForRefund && (
                                  <span className="text-xs text-green-600">
                                    (Eligible for refund)
                                  </span>
                                )}
                                {appointment.hasBeenRefunded && (
                                  <span className="text-xs text-blue-600">
                                    (Already refunded: ₹{parseFloat(appointment.refundAmount || '0').toFixed(2)})
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default RefundManagement;
