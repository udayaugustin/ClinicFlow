import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Phone, Lock, User, AlertCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";

const patientRegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  mobileNumber: z.string()
    .min(10, "Mobile number must be 10 digits")
    .max(10, "Mobile number must be 10 digits")
    .regex(/^\d{10}$/, "Mobile number must contain only digits"),
  mpin: z.string()
    .length(4, "MPIN must be 4 digits")
    .regex(/^\d{4}$/, "MPIN must contain only digits"),
  confirmMpin: z.string()
    .length(4, "MPIN must be 4 digits")
    .regex(/^\d{4}$/, "MPIN must contain only digits"),
}).refine((data) => data.mpin === data.confirmMpin, {
  message: "MPINs don't match",
  path: ["confirmMpin"],
});

type PatientRegisterData = z.infer<typeof patientRegisterSchema>;

export default function PatientRegister() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showMpin, setShowMpin] = useState(false);

  const form = useForm<PatientRegisterData>({
    resolver: zodResolver(patientRegisterSchema),
    defaultValues: {
      name: "",
      mobileNumber: "",
      mpin: "",
      confirmMpin: "",
    },
  });

  const handleSubmit = async (data: PatientRegisterData) => {
    setIsLoading(true);
    try {
      // Remove confirmMpin from the data sent to server
      const { confirmMpin, ...registerData } = data;
      
      const response = await apiRequest("POST", "/api/auth/patient/register", registerData);
      const result = await response.json();

      if (!response.ok) {
        toast({
          title: "Registration Failed",
          description: result.message || "Failed to create account",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Registration Successful!",
        description: "Your account has been created. Redirecting to login...",
      });

      // Redirect to patient login page
      setTimeout(() => {
        navigate("/patient-login");
      }, 2000);
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
  const handleMpinInput = (field: "mpin" | "confirmMpin", digit: string) => {
    const currentValue = form.getValues(field);
    if (currentValue.length < 4) {
      form.setValue(field, currentValue + digit);
    }
  };

  const handleMpinClear = (field: "mpin" | "confirmMpin") => {
    form.setValue(field, "");
  };

  const handleMpinBackspace = (field: "mpin" | "confirmMpin") => {
    const currentValue = form.getValues(field);
    form.setValue(field, currentValue.slice(0, -1));
  };

  const nextStep = async () => {
    let isValid = false;
    
    if (currentStep === 1) {
      // Validate name and mobile number
      isValid = await form.trigger(["name", "mobileNumber"]);
    } else if (currentStep === 2) {
      // Validate MPIN
      isValid = await form.trigger("mpin");
      if (isValid && form.getValues("mpin").length !== 4) {
        form.setError("mpin", { message: "Please enter 4 digits" });
        isValid = false;
      }
    }
    
    if (isValid) {
      if (currentStep === 2) {
        // Copy MPIN to confirmMpin for step 3
        setCurrentStep(3);
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleFinalSubmit = async () => {
    const isValid = await form.trigger("confirmMpin");
    if (isValid) {
      form.handleSubmit(handleSubmit)();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Link href="/patient-login">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </Link>
          
          {/* Progress indicator */}
          <Progress value={(currentStep / 3) * 100} className="mb-4" />
          
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
              {currentStep === 1 && <User className="w-8 h-8 text-white" />}
              {currentStep === 2 && <Lock className="w-8 h-8 text-white" />}
              {currentStep === 3 && <Lock className="w-8 h-8 text-white" />}
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            {currentStep === 1 && "Your Details"}
            {currentStep === 2 && "Create MPIN"}
            {currentStep === 3 && "Confirm MPIN"}
          </CardTitle>
          <CardDescription className="text-center">
            {currentStep === 1 && "Enter your personal information"}
            {currentStep === 2 && "Choose a 4-digit PIN you'll remember"}
            {currentStep === 3 && "Re-enter your MPIN to confirm"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-4">
              {/* Step 1: Personal Details */}
              {currentStep === 1 && (
                <>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <Input
                              {...field}
                              type="text"
                              placeholder="Enter your full name"
                              className="pl-10"
                              autoFocus
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                        <FormDescription>
                          This will be your login ID
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="button" 
                    className="w-full" 
                    onClick={nextStep}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              )}

              {/* Step 2: Create MPIN */}
              {currentStep === 2 && (
                <>
                  <FormField
                    control={form.control}
                    name="mpin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Create Your 4-Digit MPIN</FormLabel>
                        <FormControl>
                          <div className="space-y-3">
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                              <Input
                                {...field}
                                type={showMpin ? "text" : "password"}
                                placeholder="Enter 4 digits"
                                className="pl-10 text-center text-2xl tracking-[0.5em] font-bold placeholder:text-sm placeholder:tracking-normal placeholder:font-normal"
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
                            
                            {/* Number pad */}
                            <div className="grid grid-cols-3 gap-2">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                                <Button
                                  key={digit}
                                  type="button"
                                  variant="outline"
                                  className="h-12 text-lg font-semibold"
                                  onClick={() => handleMpinInput("mpin", digit.toString())}
                                  disabled={field.value.length >= 4}
                                >
                                  {digit}
                                </Button>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                className="h-12 text-sm"
                                onClick={() => handleMpinClear("mpin")}
                              >
                                Clear
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-12 text-lg font-semibold"
                                onClick={() => handleMpinInput("mpin", "0")}
                                disabled={field.value.length >= 4}
                              >
                                0
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-12 text-sm"
                                onClick={() => handleMpinBackspace("mpin")}
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

                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline"
                      className="flex-1" 
                      onClick={prevStep}
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button 
                      type="button" 
                      className="flex-1" 
                      onClick={nextStep}
                      disabled={form.watch("mpin").length !== 4}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </>
              )}

              {/* Step 3: Confirm MPIN */}
              {currentStep === 3 && (
                <>
                  <FormField
                    control={form.control}
                    name="confirmMpin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Your MPIN</FormLabel>
                        <FormControl>
                          <div className="space-y-3">
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                              <Input
                                {...field}
                                type="password"
                                placeholder="Re-enter 4 digits"
                                className="pl-10 text-center text-2xl tracking-[0.5em] font-bold placeholder:text-sm placeholder:tracking-normal placeholder:font-normal"
                                maxLength={4}
                                readOnly
                              />
                            </div>
                            
                            {/* Number pad */}
                            <div className="grid grid-cols-3 gap-2">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                                <Button
                                  key={digit}
                                  type="button"
                                  variant="outline"
                                  className="h-12 text-lg font-semibold"
                                  onClick={() => handleMpinInput("confirmMpin", digit.toString())}
                                  disabled={field.value.length >= 4}
                                >
                                  {digit}
                                </Button>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                className="h-12 text-sm"
                                onClick={() => handleMpinClear("confirmMpin")}
                              >
                                Clear
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-12 text-lg font-semibold"
                                onClick={() => handleMpinInput("confirmMpin", "0")}
                                disabled={field.value.length >= 4}
                              >
                                0
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-12 text-sm"
                                onClick={() => handleMpinBackspace("confirmMpin")}
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
                      Remember your MPIN! You'll need it to login to your account.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline"
                      className="flex-1" 
                      onClick={prevStep}
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button 
                      type="button" 
                      className="flex-1" 
                      onClick={handleFinalSubmit}
                      disabled={isLoading || form.watch("confirmMpin").length !== 4}
                    >
                      {isLoading ? "Creating..." : "Create Account"}
                    </Button>
                  </div>
                </>
              )}

              {currentStep === 1 && (
                <div className="text-center text-sm mt-4">
                  <span className="text-gray-600">Already have an account? </span>
                  <Link href="/patient-login">
                    <Button variant="link" className="p-0 h-auto font-semibold">
                      Login here
                    </Button>
                  </Link>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}