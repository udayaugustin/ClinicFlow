import { useState } from "react";
import { ClinicCard } from "@/components/clinic-card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import React from "react";

export default function PatientDashboard() {
  // Fetch clinics data from API
  const { data: clinics = [], isLoading, error } = useQuery({
    queryKey: ["clinics"],
    queryFn: async () => {
      const response = await fetch("/api/clinics");
      return response.json();
    }
  });

  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter clinics based on search term
  const filteredClinics = clinics.filter(clinic => 
    clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    clinic.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    clinic.specialties?.some(specialty => 
      specialty.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Find a Clinic</h1>
      
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search clinics by name, address, or specialty..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading clinics...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500">Error loading clinics. Please try again later.</p>
        </div>
      ) : filteredClinics.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No clinics found matching your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredClinics.map((clinic) => (
            <ClinicCard key={clinic.id} clinic={clinic} />
          ))}
        </div>
      )}
    </div>
  );
}