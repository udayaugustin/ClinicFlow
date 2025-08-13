import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Phone, Lock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const patientLoginSchema = z.object({
  mobileNumber: z.string()
    .min(10, "Mobile number must be 10 digits")
    .max(10, "Mobile number must be 10 digits")
    .regex(/^\d{10}$/, "Mobile number must contain only digits"),
  mpin: z.string()
    .length(4, "MPIN must be 4 digits")
    .regex(/^\d{4}$/, "MPIN must contain only digits"),
});

type PatientLoginData = z.infer<typeof patientLoginSchema>;

export default function PatientLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showMpin, setShowMpin] = useState(false);

  const form = useForm<PatientLoginData>({
    resolver: zodResolver(patientLoginSchema),
    defaultValues: {
      mobileNumber: "",
      mpin: "",
    },
  });

  const handleSubmit = async (data: PatientLoginData) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/auth/patient/login", data);
      const result = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 423) {
          toast({
            title: "Account Locked",
            description: result.message,
            variant: "destructive",
          });
        } else if (response.status === 429) {
          toast({
            title: "Too Many Attempts",
            description: result.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login Failed",
            description: result.message || "Invalid credentials",
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });

      // Redirect to home page (will show patient dashboard)
      setTimeout(() => navigate("/home"), 500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Custom MPIN input with number buttons
  const handleMpinInput = (digit: string) => {
    const currentMpin = form.getValues("mpin");
    if (currentMpin.length < 4) {
      form.setValue("mpin", currentMpin + digit);
    }
  };

  const handleMpinClear = () => {
    form.setValue("mpin", "");
  };

  const handleMpinBackspace = () => {
    const currentMpin = form.getValues("mpin");
    form.setValue("mpin", currentMpin.slice(0, -1));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Portal Selection
            </Button>
          </Link>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
              <Phone className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Patient Login</CardTitle>
          <CardDescription className="text-center">
            Enter your mobile number and MPIN to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                          {...field}
                          type="tel"
                          placeholder="10 digit mobile number"
                          className="pl-10"
                          maxLength={10}
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mpin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MPIN</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input
                            {...field}
                            type={showMpin ? "text" : "password"}
                            placeholder="4-digit MPIN"
                            className="pl-10 text-center text-2xl tracking-widest"
                            maxLength={4}
                            readOnly
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2"
                            onClick={() => setShowMpin(!showMpin)}
                          >
                            {showMpin ? "Hide" : "Show"}
                          </Button>
                        </div>
                        
                        {/* Number pad for MPIN input */}
                        <div className="grid grid-cols-3 gap-2">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                            <Button
                              key={digit}
                              type="button"
                              variant="outline"
                              className="h-12 text-lg font-semibold"
                              onClick={() => handleMpinInput(digit.toString())}
                              disabled={field.value.length >= 4}
                            >
                              {digit}
                            </Button>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            className="h-12 text-sm"
                            onClick={handleMpinClear}
                          >
                            Clear
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-12 text-lg font-semibold"
                            onClick={() => handleMpinInput("0")}
                            disabled={field.value.length >= 4}
                          >
                            0
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-12 text-sm"
                            onClick={handleMpinBackspace}
                          >
                            ←
                          </Button>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  If you've forgotten your MPIN, please contact your clinic administrator for assistance.
                </AlertDescription>
              </Alert>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}