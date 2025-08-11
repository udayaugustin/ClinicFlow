import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Download, Calendar, Hospital, FileSpreadsheet } from "lucide-react";
import React from "react";

interface Clinic {
  id: number;
  name: string;
  city: string;
  state: string;
}

interface ExportData {
  serialNumber: number;
  hospitalName: string;
  doctorName: string;
  scheduleDate: string;
  scheduleTime: string;
  patientName: string;
  inTime: string;
  outTime: string;
  tokenStatus: string;
}

export function SuperAdminExportReports() {
  const [selectedClinic, setSelectedClinic] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(""); // Start empty like clinic admin
  const [endDate, setEndDate] = useState<string>(""); // Start empty like clinic admin
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Fetch all clinics
  const { data: clinics = [], isLoading: loadingClinics } = useQuery<Clinic[]>({
    queryKey: ['clinics'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/clinics');
      return await res.json();
    },
  });

  // Function to fetch export data for selected clinic
  const fetchExportData = async (clinicId: string, startDate: string, endDate: string): Promise<ExportData[]> => {
    try {
      const response = await apiRequest('GET', `/api/super-admin/export-reports/${clinicId}?startDate=${startDate}&endDate=${endDate}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching export data:', error);
      throw new Error('Failed to fetch export data');
    }
  };

  const generateExcelFile = async () => {
    if (!selectedClinic) {
      toast({
        title: "Error",
        description: "Please select a hospital",
        variant: "destructive",
      });
      return;
    }

    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: "Error",
        description: "Start date cannot be after end date",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      console.log('Generating export for clinic:', selectedClinic, 'from', startDate, 'to', endDate);
      
      // Fetch export data
      const exportData = await fetchExportData(selectedClinic, startDate, endDate);
      console.log('Received export data:', exportData);
      
      if (exportData.length === 0) {
        toast({
          title: "No Data Found",
          description: `No appointment data found for the selected hospital and date range (${startDate} to ${endDate}). Try selecting a different date range or hospital.`,
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Prepare worksheet data
      const worksheetData: any[][] = [];

      // Add header row
      worksheetData.push([
        "S.No",
        "Hospital Name",
        "Doctor Name", 
        "Date of Schedule",
        "Schedule Time",
        "Patient Name",
        "In-Time",
        "Out-Time",
        "Token Status"
      ]);

      // Add appointment data
      exportData.forEach((appointment, index) => {
        worksheetData.push([
          index + 1, // S.No
          appointment.hospitalName,
          appointment.doctorName,
          appointment.scheduleDate,
          appointment.scheduleTime,
          appointment.patientName,
          appointment.inTime || "Not checked in",
          appointment.outTime || "Not checked out",
          appointment.tokenStatus
        ]);
      });

      console.log('Generated worksheet data rows:', worksheetData.length);

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Set column widths
      worksheet["!cols"] = [
        { width: 8 },   // S.No
        { width: 20 },  // Hospital Name
        { width: 20 },  // Doctor Name
        { width: 15 },  // Date of Schedule
        { width: 15 },  // Schedule Time
        { width: 25 },  // Patient Name
        { width: 12 },  // In-Time
        { width: 12 },  // Out-Time
        { width: 15 }   // Token Status
      ];

      // Style the header row
      for (let col = 0; col < 9; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = {
            font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4472C4" } },
            alignment: { horizontal: "center" }
          };
        }
      }

      XLSX.utils.book_append_sheet(workbook, worksheet, "Hospital Report");

      // Generate filename
      const selectedClinicData = clinics.find(c => c.id.toString() === selectedClinic);
      const hospitalName = selectedClinicData?.name.replace(/\s+/g, '_') || 'Hospital';
      const filename = `${hospitalName}_Report_${startDate}_to_${endDate}.xlsx`;
      
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
        
        toast({
          title: "Success",
          description: `Excel file exported successfully: ${filename}`,
        });
        
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
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Set default dates (last 30 days) - same as clinic admin
  const setDefaultDates = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Export Reports</h1>
        <p className="text-gray-600 mt-1">Export detailed hospital reports including appointments, schedules, and patient data</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileSpreadsheet className="mr-2 h-6 w-6" />
            Hospital Report Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hospital Selection */}
          <div className="space-y-2">
            <Label htmlFor="clinic-select">Select Hospital</Label>
            <Select
              value={selectedClinic}
              onValueChange={setSelectedClinic}
              disabled={loadingClinics}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingClinics ? "Loading hospitals..." : "Choose a hospital"} />
              </SelectTrigger>
              <SelectContent>
                {clinics.map((clinic) => (
                  <SelectItem key={clinic.id} value={clinic.id.toString()}>
                    <div className="flex items-center">
                      <Hospital className="mr-2 h-4 w-4" />
                      <span>{clinic.name}</span>
                      <span className="text-sm text-gray-500 ml-2">({clinic.city}, {clinic.state})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Selection */}
          <div className="space-y-4">
            <Label>Date Range</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Select start date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="Select end date"
                />
              </div>
            </div>
            
            {!startDate || !endDate ? (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  📅 Please select a date range or use the quick buttons below to populate dates
                </p>
              </div>
            ) : null}
            
            {/* Quick Date Options */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={setDefaultDates}
                className="flex items-center"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Set Last 30 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const weekAgo = new Date();
                  weekAgo.setDate(today.getDate() - 7);
                  setStartDate(weekAgo.toISOString().split('T')[0]);
                  setEndDate(today.toISOString().split('T')[0]);
                }}
              >
                Last 7 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const monthsAgo = new Date();
                  monthsAgo.setMonth(today.getMonth() - 3);
                  setStartDate(monthsAgo.toISOString().split('T')[0]);
                  setEndDate(today.toISOString().split('T')[0]);
                }}
              >
                Last 3 Months
              </Button>
            </div>
          </div>

          {/* Export Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">📊 Export includes:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• S.No, Hospital Name, Doctor Name</li>
              <li>• Date of Schedule, Schedule Time</li>
              <li>• Patient Name, In-Time, Out-Time</li>
              <li>• Token Status (Scheduled, Completed, etc.)</li>
              <li>• <strong>Note:</strong> Cancelled schedules excluded (handled separately for refunds)</li>
            </ul>
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <Button
              onClick={generateExcelFile}
              disabled={isExporting || !selectedClinic || !startDate || !endDate}
              className="bg-green-600 hover:bg-green-700"
            >
              {isExporting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export Excel Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SuperAdminExportReports;
