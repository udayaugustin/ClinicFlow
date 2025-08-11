import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { firebaseAuth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, Lock, Loader2, AlertCircle, Smartphone } from "lucide-react";

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

export function MobileLoginFirebase() {
  const [_location, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [useFirebase, setUseFirebase] = useState(false);

  // Check if Firebase is configured
  useEffect(() => {
    setUseFirebase(firebaseAuth.isConfigured());
    if (firebaseAuth.isConfigured()) {
      // Initialize reCAPTCHA container
      setTimeout(() => {
        firebaseAuth.initializeRecaptcha('recaptcha-container');
      }, 100);
    }
  }, []);

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
      let phoneNumber = data.phone;
      // Ensure phone number has country code
      if (!phoneNumber.startsWith('+')) {
        // Default to US if no country code
        phoneNumber = '+1' + phoneNumber.replace(/\D/g, '');
      }

      if (useFirebase) {
        // Use Firebase Auth
        await firebaseAuth.sendOTP(phoneNumber);
        toast({
          title: "OTP Sent!",
          description: "Check your phone for the verification code",
        });
      } else {
        // Use existing backend OTP service
        const res = await apiRequest('POST', '/api/auth/request-otp', { phone: phoneNumber });
        const result = await res.json();

        if (!res.ok) {
          throw new Error(result.message || 'Failed to send OTP');
        }

        toast({
          title: "OTP Sent!",
          description: "Check your phone for the verification code",
        });
      }

      setPhone(phoneNumber);
      verifyForm.setValue('phone', phoneNumber);
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
      if (useFirebase) {
        // Verify with Firebase
        const user = await firebaseAuth.verifyOTP(data.otp);
        const idToken = await firebaseAuth.getIdToken();

        // Send Firebase token to backend for verification and login
        const res = await apiRequest('POST', '/api/auth/firebase-verify', {
          idToken,
          phone: data.phone
        });

        if (!res.ok) {
          const result = await res.json();
          throw new Error(result.message || 'Failed to verify with backend');
        }
      } else {
        // Use existing backend verification
        const res = await apiRequest('POST', '/api/auth/verify-otp', data);
        const result = await res.json();

        if (!res.ok) {
          throw new Error(result.message || 'Failed to verify OTP');
        }
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
    await handleRequestOTP({ phone: phone.replace(/^\+\d/, '') });
  };

  if (step === 'request') {
    return (
      <>
        <Form {...requestForm}>
          <form onSubmit={requestForm.handleSubmit(handleRequestOTP)} className="space-y-4 mt-4">
            <div className="text-center mb-4">
              <Phone className="mx-auto h-12 w-12 text-primary mb-2" />
              <p className="text-sm text-muted-foreground">
                Enter your registered phone number to receive an OTP
              </p>
              {useFirebase && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Smartphone className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600">Firebase Auth Enabled</span>
                </div>
              )}
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
        {/* Invisible reCAPTCHA container for Firebase */}
        <div id="recaptcha-container"></div>
      </>
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