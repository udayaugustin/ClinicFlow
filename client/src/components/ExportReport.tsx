import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { useToast } from "../hooks/use-toast";
import { Download, Calendar, User } from "lucide-react";

interface Doctor {
  id: number;
  name: string;
  specialty?: string;
}

interface Schedule {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  maxTokens: number;
  status: string;
  scheduleStatus: string;
  clinicId: number;
  clinicName?: string;
  cancelReason?: string;
  isCompleted?: boolean;
  isCancelled?: boolean;
}

interface AppointmentExportData {
  serialNumber: number;
  id: number;
  date: string;
  tokenNumber: number;
  status: string;
  scheduleTime: string;
  inTime: string;
  outTime: string;
  doctorName: string;
  patientName: string;
  isWalkIn: boolean;
  statusNotes?: string;
}

export function ExportReport() {
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [selectedSchedule, setSelectedSchedule] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [exportMode, setExportMode] = useState<"schedule" | "daterange">("schedule");
  const { toast } = useToast();

  // Fetch doctors managed by current attender/clinic admin
  const { data: doctors = [], isLoading: loadingDoctors } = useQuery<Doctor[]>({
    queryKey: ["/api/export/doctors"],
    queryFn: async () => {
      const response = await fetch("/api/export/doctors", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch doctors");
      return response.json();
    },
  });

  // Fetch schedules for selected doctor
  const { data: schedules = [], isLoading: loadingSchedules } = useQuery<Schedule[]>({
    queryKey: ["/api/doctors", selectedDoctor, "schedules"],
    queryFn: async () => {
      if (!selectedDoctor || selectedDoctor === "loading" || selectedDoctor === "no-doctors") {
        return [];
      }
      const response = await fetch(`/api/doctors/${selectedDoctor}/schedules`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch schedules");
      const data = await response.json();
      
      // Add clinic name to schedules and filter for past/present schedules with data
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      
      return data
      .filter((schedule: any) => {
        const scheduleDate = new Date(schedule.date);
        const isRelevantDate = scheduleDate <= today; // Only past and present schedules
        
        // Exclude cancelled schedules from export dropdown
        const isNotCancelled = !schedule.cancelReason;
        
        // Include schedules that have potential appointment data:
        const hasReportableData = 
          schedule.isActive || // Currently active schedules
          schedule.scheduleStatus === 'completed'; // Completed by attender/clinic admin
        
        return isRelevantDate && isNotCancelled && hasReportableData;
      })
        .map((schedule: any) => ({
          id: schedule.id,
          date: schedule.date,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          maxTokens: schedule.maxTokens,
          status: schedule.status,
          scheduleStatus: schedule.scheduleStatus,
          clinicId: schedule.clinicId,
          clinicName: schedule.clinic?.name || 'Clinic',
          cancelReason: schedule.cancelReason,
          isCompleted: schedule.scheduleStatus === 'completed',
          isCancelled: !!schedule.cancelReason
        }))
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date descending (most recent first)
    },
    enabled: !!selectedDoctor && selectedDoctor !== "loading" && selectedDoctor !== "no-doctors"
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async (params: {
      doctorId: string;
      scheduleId?: string;
      startDate?: string;
      endDate?: string;
    }) => {
      let url: string;
      let queryParams: URLSearchParams;
      
      if (exportMode === "schedule" && params.scheduleId) {
        // Schedule-specific export
        queryParams = new URLSearchParams({
          doctorId: params.doctorId,
          scheduleId: params.scheduleId,
        });
        url = `/api/export/appointments/schedule?${queryParams}`;
      } else if (exportMode === "daterange" && params.startDate && params.endDate) {
        // Date range export
        queryParams = new URLSearchParams({
          doctorId: params.doctorId,
          startDate: params.startDate,
          endDate: params.endDate,
        });
        url = `/api/export/appointments?${queryParams}`;
      } else {
        throw new Error("Invalid export parameters");
      }
      
      const response = await fetch(url, {
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to export data");
      }
      
      return response.json();
    },
    onSuccess: (data: AppointmentExportData[]) => {
      generateExcelFile(data);
      toast({
        title: "Success",
        description: "Report exported successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateExcelFile = (appointments: AppointmentExportData[]) => {
    if (appointments.length === 0) {
      toast({
        title: "No Data",
        description: "No appointments found for the selected criteria",
      });
      return;
    }

    try {
      console.log('Starting Excel generation with', appointments.length, 'appointments');
      
      const workbook = XLSX.utils.book_new();
      
      const worksheetData: any[] = [];

      // Add column headers with Doctor and Date as separate columns
      worksheetData.push([
        "S.No",
        "Date", 
        "Doctor Name",
        "Token No",
        "Schedule Time",
        "Patient Name",
        "Status",
        "In-Time",
        "Out-Time",
        "Notes"
      ]);

      // Add appointment data (no grouping needed since date and doctor are columns)
      appointments.forEach((appointment) => {
        const formattedDate = new Date(appointment.date).toLocaleDateString();
        const doctorName = appointment.doctorName || "Unknown Doctor";
        
        worksheetData.push([
          appointment.serialNumber,
          formattedDate,
          doctorName,
          appointment.tokenNumber,
          appointment.scheduleTime,
          appointment.patientName + (appointment.isWalkIn ? " (Walk-in)" : ""),
          appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1),
          appointment.inTime,
          appointment.outTime,
          appointment.statusNotes || ""
        ]);
      });

      console.log('Generated worksheet data rows:', worksheetData.length);

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Set column widths - updated for new column structure
      worksheet["!cols"] = [
        { width: 8 },   // S.No
        { width: 12 },  // Date
        { width: 20 },  // Doctor Name
        { width: 10 },  // Token No
        { width: 18 },  // Schedule Time
        { width: 25 },  // Patient Name
        { width: 12 },  // Status
        { width: 12 },  // In-Time
        { width: 12 },  // Out-Time
        { width: 20 }   // Notes
      ];

      // Style the header row (make it bold with background color)
      const headerRow = 1; // First row (0-indexed)
      for (let col = 0; col < 10; col++) { // 10 columns total
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = {
            font: { bold: true, sz: 12 },
            fill: { fgColor: { rgb: "E6E6FA" } },
            alignment: { horizontal: "center" }
          };
        }
      }

      XLSX.utils.book_append_sheet(workbook, worksheet, "Appointments Report");

      // Generate filename
      const selectedDoctorName = doctors.find(d => d.id.toString() === selectedDoctor)?.name || "Doctor";
      let filename: string;
      
      if (exportMode === "schedule") {
        const selectedScheduleData = schedules.find(s => s.id.toString() === selectedSchedule);
        const scheduleDate = selectedScheduleData ? new Date(selectedScheduleData.date).toISOString().split('T')[0] : 'schedule';
        filename = `${selectedDoctorName.replace(/\s+/g, '_')}_Schedule_${scheduleDate}_${selectedScheduleData?.startTime}-${selectedScheduleData?.endTime}.xlsx`;
      } else {
        filename = `${selectedDoctorName.replace(/\s+/g, '_')}_Appointments_${startDate}_to_${endDate}.xlsx`;
      }
      
      console.log('Generated filename:', filename);
      
      // Export file
      try {
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        console.log('Excel buffer generated, size:', excelBuffer.length);
        
        const blob = new Blob([excelBuffer], { 
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
        });
        console.log('Blob created, size:', blob.size);
        
        // Use file-saver to download the file
        saveAs(blob, filename);
        console.log('File download initiated successfully');
        
      } catch (writeError) {
        console.error('Error writing Excel file:', writeError);
        toast({
          title: "Error",
          description: "Failed to generate Excel file",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error('Error in generateExcelFile:', error);
      toast({
        title: "Error", 
        description: "Failed to generate Excel file: " + (error instanceof Error ? error.message : 'Unknown error'),
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    if (!selectedDoctor || selectedDoctor === "loading" || selectedDoctor === "no-doctors") {
      toast({
        title: "Error",
        description: "Please select a doctor",
        variant: "destructive",
      });
      return;
    }

    if (exportMode === "schedule") {
      if (!selectedSchedule || selectedSchedule === "loading" || selectedSchedule === "no-schedules") {
        toast({
          title: "Error",
          description: "Please select a schedule",
          variant: "destructive",
        });
        return;
      }
      
      exportMutation.mutate({
        doctorId: selectedDoctor,
        scheduleId: selectedSchedule,
      });
    } else if (exportMode === "daterange") {
      if (!startDate || !endDate) {
        toast({
          title: "Error",
          description: "Please select both start and end dates",
          variant: "destructive",
        });
        return;
      }

      // Validate date range (max 6 months)
      const start = new Date(startDate);
      const end = new Date(endDate);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      if (start < sixMonthsAgo) {
        toast({
          title: "Error",
          description: "Start date cannot be more than 6 months ago",
          variant: "destructive",
        });
        return;
      }

      if (start > end) {
        toast({
          title: "Error", 
          description: "Start date must be before end date",
          variant: "destructive",
        });
        return;
      }

      exportMutation.mutate({
        doctorId: selectedDoctor,
        startDate,
        endDate,
      });
    }
  };

  // Set default date range (last 30 days)
  const setDefaultDateRange = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Appointments Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Mode Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Choose Export Method</Label>
          <RadioGroup
            value={exportMode}
            onValueChange={(value: "schedule" | "daterange") => {
              setExportMode(value);
              // Reset selections when switching modes
              setSelectedSchedule("");
              setStartDate("");
              setEndDate("");
            }}
            className="flex flex-col space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="schedule" id="schedule-mode" />
              <Label htmlFor="schedule-mode" className="cursor-pointer">
                Export specific schedule (recommended for detailed reports)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="daterange" id="daterange-mode" />
              <Label htmlFor="daterange-mode" className="cursor-pointer">
                Export date range (for broader analysis across multiple schedules)
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Doctor Selection - Always visible */}
        <div className="space-y-2">
          <Label htmlFor="doctor-select" className="flex items-center gap-1">
            <User className="h-4 w-4" />
            Select Doctor *
          </Label>
          <Select value={selectedDoctor} onValueChange={(value) => {
            setSelectedDoctor(value);
            setSelectedSchedule(""); // Reset schedule when doctor changes
          }}>
            <SelectTrigger id="doctor-select">
              <SelectValue placeholder="Choose a doctor" />
            </SelectTrigger>
            <SelectContent>
              {loadingDoctors ? (
                <SelectItem value="loading" disabled>Loading doctors...</SelectItem>
              ) : doctors.length === 0 ? (
                <SelectItem value="no-doctors" disabled>No doctors found</SelectItem>
              ) : (
                doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id.toString()}>
                    {doctor.name}
                    {doctor.specialty && ` - ${doctor.specialty}`}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Schedule-specific mode */}
        {exportMode === "schedule" && (
          <div className="space-y-2">
            <Label htmlFor="schedule-select" className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Select Schedule *
            </Label>
            <Select 
              value={selectedSchedule} 
              onValueChange={setSelectedSchedule}
              disabled={!selectedDoctor || selectedDoctor === "loading" || selectedDoctor === "no-doctors"}
            >
              <SelectTrigger id="schedule-select">
                <SelectValue placeholder="Choose a schedule" />
              </SelectTrigger>
              <SelectContent>
                {loadingSchedules ? (
                  <SelectItem value="loading" disabled>Loading schedules...</SelectItem>
                ) : schedules.length === 0 ? (
                  <SelectItem value="no-schedules" disabled>No schedules found</SelectItem>
                ) : (
                  schedules.map((schedule) => {
                    const date = new Date(schedule.date).toLocaleDateString();
                    const timeSlot = `${schedule.startTime} to ${schedule.endTime}`;
                    const clinic = schedule.clinicName;
                    
                    // Add status indicator
                    let statusIndicator = "";
                    if (schedule.isCancelled) {
                      statusIndicator = " [Cancelled]";
                    } else if (schedule.isCompleted) {
                      statusIndicator = " [Completed]";
                    } else {
                      statusIndicator = " [Active]";
                    }
                    
                    return (
                      <SelectItem key={schedule.id} value={schedule.id.toString()}>
                        {date} - {timeSlot} ({clinic}){statusIndicator}
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Date range mode */}
        {exportMode === "daterange" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="start-date">From Date *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label htmlFor="end-date">To Date *</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {/* Quick Set Date Range */}
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                onClick={setDefaultDateRange}
                className="w-full max-w-xs"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Set Last 30 Days
              </Button>
            </div>
          </div>
        )}

        {/* Export Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleExport}
            disabled={
              exportMutation.isPending || 
              !selectedDoctor || 
              selectedDoctor === "loading" || 
              selectedDoctor === "no-doctors" ||
              (exportMode === "schedule" && (!selectedSchedule || selectedSchedule === "loading" || selectedSchedule === "no-schedules")) ||
              (exportMode === "daterange" && (!startDate || !endDate))
            }
            className="min-w-[200px]"
          >
            {exportMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </>
            )}
          </Button>
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          {exportMode === "schedule" ? (
            <>
              <p>• <strong>Schedule Export:</strong> Get appointments for a specific schedule session</p>
              <p>• Shows active, completed, and cancelled schedules with appointment data</p>
              <p>• Perfect for detailed session reports and token tracking</p>
            </>
          ) : (
            <>
              <p>• <strong>Date Range Export:</strong> Get all appointments within a date period</p>
              <p>• Maximum range: 6 months from current date</p>
              <p>• Perfect for broader analysis across multiple schedules</p>
              <p>• Data is grouped by date with daily token numbers</p>
            </>
          )}
          <p>• Walk-in patients are clearly marked in all reports</p>
        </div>
      </CardContent>
    </Card>
  );
}
