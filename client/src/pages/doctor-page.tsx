import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { User } from "@shared/schema";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DoctorPage() {
  const { id } = useParams();

  const { data: doctors, isLoading } = useQuery<User[]>({
    queryKey: ["/api/doctors"],
  });

  const doctor = doctors?.find(d => d.id === Number(id));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavHeader />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-[600px]" />
        </main>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavHeader />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-6">
              <h1 className="text-2xl font-bold text-red-600">Doctor Not Found</h1>
              <p className="mt-2 text-gray-600">The requested doctor could not be found.</p>
              <Button className="mt-4" asChild>
                <Link href="/">Return to Home</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  <img
                    src={doctor.imageUrl || "https://images.unsplash.com/photo-1504813184591-01572f98c85f"}
                    alt={doctor.name}
                    className="w-32 h-32 rounded-full object-cover"
                  />
                  <div>
                    <h1 className="text-2xl font-bold">{doctor.name}</h1>
                    <p className="text-lg text-primary">{doctor.specialty}</p>
                    <div className="mt-4 flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Available Mon-Fri, 9:00 AM - 5:00 PM</span>
                    </div>
                    {doctor.address && (
                      <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{doctor.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8">
                  <h2 className="text-xl font-semibold mb-4">About</h2>
                  <p className="text-muted-foreground">{doctor.bio || "No bio available."}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Book Appointment</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Select a convenient time slot and book your appointment with {doctor.name}.
                </p>
                <Button asChild className="w-full">
                  <Link href={`/book/${doctor.id}`}>
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Book Appointment
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}