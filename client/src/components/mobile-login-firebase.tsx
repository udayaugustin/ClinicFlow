import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { firebaseAuth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"; // used by request form only
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, Lock, Loader2, AlertCircle, Smartphone } from "lucide-react";

// Mobile OTP Login schemas
const mobileLoginRequestSchema = z.object({
  phone: z.string().length(10, "Enter a valid 10-digit phone number").regex(/^\d+$/, "Only digits allowed"),
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
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

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
      // Always prepend +91 — user enters 10 digits only
      const phoneNumber = `+91${data.phone}`;

      if (useFirebase) {
        // Check registration before sending via Firebase
        const checkRes = await apiRequest('POST', '/api/auth/check-phone', { phone: phoneNumber });
        if (!checkRes.ok) {
          const checkResult = await checkRes.json();
          throw new Error(checkResult.message || 'No account found with this phone number');
        }
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
      verifyForm.setValue('otp', '');
      setOtpDigits(['', '', '', '', '', '']);
      setStep('verify');
      setCountdown(60);
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

  const handleVerifyOTP = async () => {
    const otp = otpDigits.join('');
    if (otp.length !== 6) {
      setOtpError('OTP must be 6 digits');
      return;
    }
    setOtpError('');
    setIsLoading(true);
    try {
      if (useFirebase) {
        const user = await firebaseAuth.verifyOTP(otp);
        const idToken = await firebaseAuth.getIdToken();
        const res = await apiRequest('POST', '/api/auth/firebase-verify', { idToken, phone });
        if (!res.ok) {
          const result = await res.json();
          throw new Error(result.message || 'Failed to verify with backend');
        }
      } else {
        const res = await apiRequest('POST', '/api/auth/verify-otp', { phone, otp });
        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.message || 'Failed to verify OTP');
        }
        queryClient.setQueryData(["/api/user"], result);
      }

      toast({ title: "Success!", description: "Login successful" });
      navigate('/');
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
                    <div className="flex">
                      <span className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-sm text-muted-foreground select-none">+91</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter 10-digit number"
                        className="rounded-l-none"
                        maxLength={10}
                        {...field}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          field.onChange(val);
                        }}
                        disabled={isLoading}
                      />
                    </div>
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
    <div className="space-y-4 mt-4">
      <form onSubmit={e => { e.preventDefault(); handleVerifyOTP(); }} className="space-y-4">
        <div className="text-center mb-4">
          <Lock className="mx-auto h-12 w-12 text-primary mb-2" />
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit OTP sent to {phone}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Verification Code</label>
          <div className="flex gap-2 justify-center">
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={el => { otpRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                autoComplete="off"
                value={digit}
                className="w-10 h-10 text-center border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(-1);
                  const next = [...otpDigits];
                  next[idx] = val;
                  setOtpDigits(next);
                  setOtpError('');
                  if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
                }}
                onKeyDown={e => {
                  if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
                    otpRefs.current[idx - 1]?.focus();
                  }
                }}
                onPaste={e => {
                  e.preventDefault();
                  const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                  const next = ['', '', '', '', '', ''];
                  pasted.split('').forEach((ch, i) => { if (i < 6) next[i] = ch; });
                  setOtpDigits(next);
                  setOtpError('');
                  const focusIdx = Math.min(pasted.length, 5);
                  otpRefs.current[focusIdx]?.focus();
                }}
              />
            ))}
          </div>
          {otpError && <p className="text-sm text-red-500">{otpError}</p>}
        </div>

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
              setOtpDigits(['', '', '', '', '', '']);
            }}
          >
            Change phone number
          </Button>
        </div>
      </form>
    </div>
  );
}