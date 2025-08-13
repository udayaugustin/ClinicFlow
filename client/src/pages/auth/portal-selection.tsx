import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Stethoscope, Shield } from "lucide-react";

export default function PortalSelection() {
  const [, navigate] = useLocation();

  const portals = [
    {
      id: "patient",
      title: "Patient Portal",
      description: "Book appointments and manage your healthcare",
      icon: Users,
      path: "/patient-login",
      color: "bg-blue-500",
    },
    {
      id: "staff",
      title: "Staff Portal",
      description: "For clinic attenders and support staff",
      icon: Stethoscope,
      path: "/staff-login",
      color: "bg-green-500",
    },
    {
      id: "admin",
      title: "Administrator Portal",
      description: "For clinic and system administrators",
      icon: Shield,
      path: "/admin-login",
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome to ClinicFlow</h1>
          <p className="text-lg text-gray-600">Please select your portal to continue</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {portals.map((portal) => {
            const Icon = portal.icon;
            return (
              <Card
                key={portal.id}
                className="hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => navigate(portal.path)}
              >
                <CardHeader className="text-center">
                  <div className={`w-20 h-20 ${portal.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                  <CardTitle className="text-xl">{portal.title}</CardTitle>
                  <CardDescription className="mt-2">{portal.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">
                    Enter {portal.title}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Need help? Contact your clinic administrator</p>
        </div>
      </div>
    </div>
  );
}