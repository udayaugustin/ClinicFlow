import { useState } from "react";
import { ClinicCard } from "@/components/clinic-card";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Calendar, User, Stethoscope, ChevronDown, ChevronRight, Clock, Phone, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocation } from "wouter";
import React from "react";
import PatientFooter from "@/components/PatientFooter";

export default function PatientDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("all");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();

  // Fetch default data (all clinics) when page loads
  const { data: defaultClinics = [], isLoading: isLoadingDefault } = useQuery({
    queryKey: ["clinics"],
    queryFn: async () => {
      const response = await fetch("/api/clinics");
      if (!response.ok) throw new Error('Failed to fetch clinics');
      return response.json();
    }
  });

  // Fetch search results based on search term and type
  const { data: searchResults = [], isLoading: isLoadingSearch, error } = useQuery({
    queryKey: ["search", searchTerm, searchType],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];
      
      const params = new URLSearchParams({
        q: searchTerm,
        type: searchType
      });
      
      const response = await fetch(`/api/search?${params}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      return response.json();
    },
    enabled: !!searchTerm.trim(),
  });

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getSearchPlaceholder = () => {
    switch (searchType) {
      case "city":
        return "Enter your city (e.g., Chennai, Mumbai, Delhi)...";
      case "hospital":
        return "Search hospital or clinic name...";
      case "doctor":
        return "Find doctors by name...";
      case "specialty":
        return "Search by medical specialty (e.g., Cardiology, Dermatology)...";
      default:
        return "Search doctors, hospitals, specialties, or locations...";
    }
  };

  const handleBookAppointment = (doctorId: number, scheduleId: number, clinicId: number) => {
    setLocation(`/book/${doctorId}?scheduleId=${scheduleId}&clinicId=${clinicId}`);
  };

  const ScheduleCard = ({ schedule, doctorId, doctorName }: { 
    schedule: any; 
    doctorId: number; 
    doctorName: string; 
  }) => (
    <div className="p-3 bg-gray-50 rounded text-sm">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-gray-600" />
            <span className="font-medium">{schedule.startTime} - {schedule.endTime}</span>
            <Badge 
              size="sm" 
              variant={schedule.bookingStatus === 'open' ? 'default' : 'secondary'}
            >
              {schedule.bookingStatus}
            </Badge>
          </div>
          
          {schedule.clinicName && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Building2 className="h-3 w-3" />
              <span>{schedule.clinicName}</span>
            </div>
          )}
          
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span>Max: {schedule.maxTokens || 'Unlimited'}</span>
            {schedule.availableSlots !== null && (
              <span>Available: {schedule.availableSlots}</span>
            )}
            <span>Time: {schedule.averageConsultationTime || 15} min</span>
          </div>
        </div>
        
        <Button 
          size="sm" 
          className="ml-3"
          onClick={() => handleBookAppointment(doctorId, schedule.id, schedule.clinicId)}
          disabled={schedule.bookingStatus !== 'open' || schedule.availableSlots === 0}
        >
          Book Token
        </Button>
      </div>
    </div>
  );

  const ClinicDoctorsView = ({ clinicId }: { clinicId: number }) => {
    const { data: doctors = [], isLoading } = useQuery({
      queryKey: ["clinic-doctors", clinicId],
      queryFn: async () => {
        const response = await fetch(`/api/clinics/${clinicId}/doctors-with-schedules`);
        if (!response.ok) throw new Error('Failed to fetch doctors');
        return response.json();
      }
    });

    if (isLoading) {
      return <p className="text-gray-500 text-sm">Loading doctors...</p>;
    }

    if (doctors.length === 0) {
      return (
        <div className="text-center py-8">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium mb-2">No Doctors Available</p>
          <p className="text-sm text-gray-400">This hospital currently has no doctors with available schedules</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {doctors.map((doctor: any) => (
          <Card key={doctor.id} className="border-l-4 border-l-blue-500 cursor-pointer hover:bg-gray-50"
            onClick={() => toggleExpanded(`clinic-doctor-${doctor.id}`)}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <User className="h-8 w-8 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium">{doctor.name}</p>
                  <p className="text-sm text-gray-600">{doctor.specialty}</p>
                </div>
              </div>
              {expandedItems.has(`clinic-doctor-${doctor.id}`) && doctor.schedules?.length > 0 && (
                <div className="mt-3 space-y-2">
                  {doctor.schedules.map((schedule: any) => (
                    <ScheduleCard 
                      key={schedule.id} 
                      schedule={schedule} 
                      doctorId={doctor.id} 
                      doctorName={doctor.name}
                    />
                  ))}
                </div>
              )}
              {expandedItems.has(`clinic-doctor-${doctor.id}`) && (!doctor.schedules || doctor.schedules.length === 0) && (
                <div className="mt-3 text-center py-4 text-gray-500">
                  <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium">No Schedules Today</p>
                  <p className="text-xs text-gray-400">This doctor has no available schedules for today</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderSearchResults = () => {
    if (!searchResults?.length) return null;

    return searchResults.map((result: any) => {
      const isExpanded = expandedItems.has(result.id);
      
      if (result.type === 'city') {
        return (
          <Card key={result.id} className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">{result.city}</CardTitle>
                  <Badge variant="secondary">{result.hospitalCount} hospitals</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded(result.id)}
                >
                  {isExpanded ? <ChevronDown /> : <ChevronRight />}
                </Button>
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent className="pt-0">
                <ClinicDoctorsView clinicId={result.clinicId} />
              </CardContent>
            )}
          </Card>
        );
      }

      if (result.type === 'hospital' || result.type === 'specialty') {
        return (
          <Card key={result.id} className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {result.type === 'specialty' ? (
                    <Stethoscope className="h-5 w-5 text-purple-600" />
                  ) : (
                    <Building2 className="h-5 w-5 text-green-600" />
                  )}
                  <CardTitle className="text-lg">{result.name}</CardTitle>
                  {result.type === 'specialty' && (
                    <Badge variant="secondary">{result.specialty} specialists</Badge>
                  )}
                  {result.doctors && (
                    <Badge variant="secondary">{result.doctors.length} doctors</Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded(result.id)}
                >
                  {isExpanded ? <ChevronDown /> : <ChevronRight />}
                </Button>
              </div>
            </CardHeader>
            {isExpanded && result.doctors && (
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.doctors.map((doctor: any) => (
                    <Card key={doctor.id} className="border-l-4 border-l-blue-500 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleExpanded(`doctor-${doctor.id}`)}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <User className="h-8 w-8 text-blue-600" />
                          <div className="flex-1">
                            <p className="font-medium">{doctor.name}</p>
                            <p className="text-sm text-gray-600">{doctor.specialty}</p>
                          </div>
                        </div>
                        {expandedItems.has(`doctor-${doctor.id}`) && doctor.schedules?.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {doctor.schedules.map((schedule: any) => (
                              <ScheduleCard 
                                key={schedule.id} 
                                schedule={schedule} 
                                doctorId={doctor.id} 
                                doctorName={doctor.name}
                              />
                            ))}
                          </div>
                        )}
                        {expandedItems.has(`doctor-${doctor.id}`) && (!doctor.schedules || doctor.schedules.length === 0) && (
                          <div className="mt-3 text-center py-4 text-gray-500">
                            <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm font-medium">No Schedules Today</p>
                            <p className="text-xs text-gray-400">This doctor has no available schedules for today</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      }

      if (result.type === 'doctor') {
        return (
          <Card key={result.id} className="mb-4 cursor-pointer hover:bg-gray-50"
            onClick={() => toggleExpanded(result.id)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="h-10 w-10 text-blue-600" />
                  <div>
                    <CardTitle className="text-lg">{result.name}</CardTitle>
                    <p className="text-sm text-gray-600">{result.specialty}</p>
                    {result.hospitalName && (
                      <p className="text-sm text-gray-500">at {result.hospitalName}</p>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  {isExpanded ? <ChevronDown /> : <ChevronRight />}
                  Schedules
                </Button>
              </div>
            </CardHeader>
            {isExpanded && result.schedules?.length > 0 && (
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {result.schedules.map((schedule: any) => (
                    <ScheduleCard 
                      key={schedule.id} 
                      schedule={schedule} 
                      doctorId={result.doctorId} 
                      doctorName={result.name}
                    />
                  ))}
                </div>
              </CardContent>
            )}
            {isExpanded && (!result.schedules || result.schedules.length === 0) && (
              <CardContent className="pt-0">
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="font-medium mb-2">No Schedules Today</p>
                  <p className="text-sm text-gray-400">This doctor has no available schedules for today</p>
                </div>
              </CardContent>
            )}
          </Card>
        );
      }

      return null;
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <div className="flex-1">
        <div className="container mx-auto py-8 px-4">
          <h1 className="text-3xl font-bold mb-6">Find Healthcare Near You</h1>
      
      {/* Enhanced Search Section */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={getSearchPlaceholder()}
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={searchType} onValueChange={setSearchType}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Search type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="city">By City</SelectItem>
            <SelectItem value="hospital">By Hospital</SelectItem>
            <SelectItem value="doctor">By Doctor</SelectItem>
            <SelectItem value="specialty">By Specialty</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Search Results or Default Content */}
      {isLoadingSearch && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Searching...</p>
        </div>
      )}
      
      {error && (
        <div className="text-center py-12">
          <p className="text-red-500">Search failed. Please try again.</p>
        </div>
      )}
      
      {!searchTerm.trim() ? (
        // Default content - show all clinics
        <>
          {isLoadingDefault ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading clinics...</p>
            </div>
          ) : defaultClinics.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No clinics found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {defaultClinics.map((clinic) => (
                <ClinicCard key={clinic.id} clinic={clinic} />
              ))}
            </div>
          )}
        </>
      ) : searchResults?.length > 0 ? (
        // Search results
        <div className="space-y-4">
          {renderSearchResults()}
        </div>
      ) : !isLoadingSearch && searchTerm.trim() && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No results found for "{searchTerm}"</p>
        </div>
      )}
        </div>
      </div>
      
      {/* Footer */}
      <PatientFooter />
    </div>
  );
}