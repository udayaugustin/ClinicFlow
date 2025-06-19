import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, MapPin } from "lucide-react";
import { Link } from "wouter";
import React from "react";

interface ClinicCardProps {
  clinic: {
    id: string;
    name: string;
    address: string;
    imageUrl?: string;
    specialties?: string[];
  };
}

export function ClinicCard({ clinic }: ClinicCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="p-0">
        <div className="aspect-[3/2] relative">
          <img
            src={clinic.imageUrl || "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d"}
            alt={clinic.name}
            className="object-cover w-full h-full"
          />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{clinic.name}</h3>
            <div className="flex items-center mt-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mr-1" />
              <p>{clinic.address}</p>
            </div>
            {clinic.specialties && clinic.specialties.length > 0 && (
              <div className="mt-3">
                <div className="flex flex-wrap gap-1">
                  {clinic.specialties.slice(0, 3).map((specialty, index) => (
                    <span 
                      key={index} 
                      className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full"
                    >
                      {specialty}
                    </span>
                  ))}
                  {clinic.specialties.length > 3 && (
                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
                      +{clinic.specialties.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-6">
          <Button asChild className="w-full">
            <Link href={`/patient/clinics/${clinic.id}`}>
              <Building2 className="mr-2 h-4 w-4" />
              View Doctors
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
