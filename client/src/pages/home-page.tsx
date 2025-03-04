import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { NavHeader } from "@/components/nav-header";
import { SearchFilters } from "@/components/search-filters";
import { DoctorCard } from "@/components/doctor-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [specialty, setSpecialty] = useState("");

  const { data: doctors, isLoading } = useQuery<User[]>({
    queryKey: [specialty ? `/api/doctors/${specialty}` : "/api/doctors"],
  });

  const filteredDoctors = doctors?.filter(doctor =>
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader />
      <SearchFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        specialty={specialty}
        onSpecialtyChange={setSpecialty}
      />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-[400px]" />
            ))
          ) : filteredDoctors?.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-lg text-muted-foreground">No doctors found</p>
            </div>
          ) : (
            filteredDoctors?.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
