import { User } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
import { Link } from "wouter";

interface DoctorCardProps {
  doctor: User;
}

export function DoctorCard({ doctor }: DoctorCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-0">
        <div className="aspect-[3/2] relative">
          <img
            src={doctor.imageUrl || "https://images.unsplash.com/photo-1504813184591-01572f98c85f"}
            alt={doctor.name}
            className="object-cover w-full h-full"
          />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={doctor.imageUrl} alt={doctor.name} />
            <AvatarFallback>
              {doctor.name.split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{doctor.name}</h3>
            <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
            {doctor.bio && (
              <p className="mt-2 text-sm line-clamp-2">{doctor.bio}</p>
            )}
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <Button asChild className="flex-1">
            <Link href={`/doctors/${doctor.id}`}>View Profile</Link>
          </Button>
          <Button variant="secondary" asChild className="flex-1">
            <Link href={`/book/${doctor.id}`}>
              <CalendarDays className="mr-2 h-4 w-4" />
              Book
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
