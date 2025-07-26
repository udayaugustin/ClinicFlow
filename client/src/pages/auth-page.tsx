import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import React, { useState, useEffect } from "react";
import { Phone, Lock, User, Mail, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MobileLoginFirebase } from "@/components/mobile-login-firebase";

// Simple schema for login
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginData = z.infer<typeof loginSchema>;

// Simple schema for registration
const registerSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [_location, navigate] = useLocation();
  const { user } = useAuth();

  if (user) {
    // Redirect users based on their role
    // if (user.role === "attender") {
    //   navigate("/attender-dashboard");
    // } else if (user.role === "super_admin") {
    //   navigate("/super-admin-dashboard");
    // } else {
      navigate("/");
    // }
    return null;
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome to MedClinic</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="mobile-login">Mobile Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <LoginForm />
              </TabsContent>

              <TabsContent value="mobile-login">
                <MobileLoginFirebase />
              </TabsContent>

              <TabsContent value="register">
                <RegisterForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="hidden lg:block bg-[url('https://images.unsplash.com/photo-1600948836101-f9ffda59d250')] bg-cover bg-center">
        <div className="h-full w-full bg-primary/50 flex items-center justify-center p-8">
          <div className="max-w-md text-white">
            <h1 className="text-4xl font-bold mb-4">Your Health, Our Priority</h1>
            <p className="text-lg">Book appointments with top doctors, track your visits, and manage your healthcare journey all in one place.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const { loginMutation } = useAuth();
  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4 mt-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
          Login
        </Button>
      </form>
    </Form>
  );
}

function RegisterForm() {
  const { registerMutation } = useAuth();
  const form = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      name: "",
      phone: "",
      email: "",
    },
  });

  const onSubmit = (data: RegisterData) => {
    // Remove confirmPassword and add patient-specific fields
    const { confirmPassword, ...rest } = data;
    registerMutation.mutate({
      ...rest,
      role: "patient",
      specialty: null,
      bio: null,
      imageUrl: null,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number*</FormLabel>
              <FormControl>
                <Input type="tel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email (Optional)</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
          Register
        </Button>
      </form>
    </Form>
  );
}

// Mobile OTP Login schemas
const mobileLoginRequestSchema = z.object({
  phone: z.string().min(10, "Please enter a valid phone number"),
});

const mobileLoginVerifySchema = z.object({
  phone: z.string().min(10, "Please enter a valid phone number"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

type MobileLoginRequestData = z.infer<typeof mobileLoginRequestSchema>;
type MobileLoginVerifyData = z.infer<typeof mobileLoginVerifySchema>;

function MobileLoginForm() {
  const [_location, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && step === 'verify') {
      setCanResend(true);
    }
  }, [countdown, step]);

  // Request OTP Form
  const requestForm = useForm<MobileLoginRequestData>({
    resolver: zodResolver(mobileLoginRequestSchema),
    defaultValues: {
      phone: '',
    },
  });

  // Verify OTP Form
  const verifyForm = useForm<MobileLoginVerifyData>({
    resolver: zodResolver(mobileLoginVerifySchema),
    defaultValues: {
      phone: '',
      otp: '',
    },
  });

  const handleRequestOTP = async (data: MobileLoginRequestData) => {
    setIsLoading(true);
    try {
      const res = await apiRequest('POST', '/api/auth/request-otp', data);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'Failed to send OTP');
      }

      toast({
        title: "OTP Sent!",
        description: "Check your phone for the verification code",
      });

      setPhone(data.phone);
      verifyForm.setValue('phone', data.phone);
      setStep('verify');
      setCountdown(60); // 60 seconds until resend
      setCanResend(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (data: MobileLoginVerifyData) => {
    setIsLoading(true);
    try {
      const res = await apiRequest('POST', '/api/auth/verify-otp', data);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'Failed to verify OTP');
      }

      toast({
        title: "Success!",
        description: "Login successful",
      });

      // Navigate to home after successful login
      setTimeout(() => navigate('/'), 500);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to verify OTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest('POST', '/api/auth/request-otp', { phone });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'Failed to send OTP');
      }

      toast({
        title: "OTP Resent!",
        description: "Check your phone for the new verification code",
      });

      setCountdown(60);
      setCanResend(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to resend OTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'request') {
    return (
      <Form {...requestForm}>
        <form onSubmit={requestForm.handleSubmit(handleRequestOTP)} className="space-y-4 mt-4">
          <div className="text-center mb-4">
            <Phone className="mx-auto h-12 w-12 text-primary mb-2" />
            <p className="text-sm text-muted-foreground">
              Enter your registered phone number to receive an OTP
            </p>
          </div>

          <FormField
            control={requestForm.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="+1234567890"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending OTP...
              </>
            ) : (
              'Send OTP'
            )}
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              onClick={() => {
                const tabsList = document.querySelector('[role="tablist"]');
                const loginTab = tabsList?.querySelector('[value="login"]') as HTMLButtonElement;
                loginTab?.click();
              }}
            >
              Back to username login
            </Button>
          </div>
        </form>
      </Form>
    );
  }

  return (
    <Form {...verifyForm}>
      <form onSubmit={verifyForm.handleSubmit(handleVerifyOTP)} className="space-y-4 mt-4">
        <div className="text-center mb-4">
          <Lock className="mx-auto h-12 w-12 text-primary mb-2" />
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit OTP sent to {phone}
          </p>
        </div>

        <FormField
          control={verifyForm.control}
          name="otp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Verification Code</FormLabel>
              <FormControl>
                <InputOTP maxLength={6} {...field}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {countdown > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You can resend OTP in {countdown} seconds
            </AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify OTP'
          )}
        </Button>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleResendOTP}
            disabled={!canResend || isLoading}
            className="w-full"
          >
            Resend OTP
          </Button>

          <Button
            type="button"
            variant="link"
            onClick={() => {
              setStep('request');
              requestForm.reset();
              verifyForm.reset();
            }}
          >
            Change phone number
          </Button>
        </div>
      </form>
    </Form>
  );
}