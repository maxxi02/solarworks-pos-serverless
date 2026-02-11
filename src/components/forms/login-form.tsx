"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useNotificationSound } from "@/lib/use-notification-sound";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();

  const [step, setStep] = React.useState<"login" | "verify-2fa" | "email-sent">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [otpCode, setOtpCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const { playError, playSuccess } = useNotificationSound();

  const autoSendVerificationEmail = async (userEmail: string) => {
    try {
      await authClient.sendVerificationEmail({
        email: userEmail,
        callbackURL: "/?verified=true",
      });

      toast.success("Verification email sent! Please check your inbox.");
      playSuccess();
      setStep("email-sent");
    } catch (err) {
      // We log but don't use the error variable → use _err or just log directly
      console.error("Auto-send verification error:", err);
      toast.error("Failed to send verification email. Please try again.");
      playError();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authClient.signIn.email(
        { email, password },
        {
          async onSuccess(context) {
            if (context.data?.twoFactorRedirect) {
              setStep("verify-2fa");
              setLoading(false);
              return;
            }
            toast.success("Login successful! Setting up 2FA...");
            playSuccess();
            router.replace("/setup-2fa");
          },
          async onError(context) {
            const errorMessage = context.error.message ?? "Login failed";

            if (
              errorMessage.toLowerCase().includes("verify") ||
              errorMessage.toLowerCase().includes("not verified") ||
              errorMessage.toLowerCase().includes("email verification") ||
              context.error.status === 400
            ) {
              toast.info("Email not verified. Sending verification link...");
              setLoading(false);
              await autoSendVerificationEmail(email);
              return;
            }

            toast.error(errorMessage);
            playError();
            setLoading(false);
          },
        }
      );

      // ────────────────────────────────────────
      // Most common fix for: 'error' is assigned but never used
      // Either:
      //    1. Remove it if you don't need it (recommended here)
      //    2. Or prefix with _   →   const { error: _error }
      // ────────────────────────────────────────

      // Option chosen: we already handle everything in onError → ignore top-level error
    } catch (err: unknown) {
      console.error("Login error:", err);
      toast.error("An unexpected error occurred. Please try again.");
      playError();
      setLoading(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);

    try {
      await authClient.sendVerificationEmail({
        email,
        callbackURL: "/?verified=true",
      });

      toast.success("Verification email sent! Check your inbox.");
      playSuccess();
      setStep("email-sent");
    } catch (err: unknown) {
      console.error("Resend verification error:", err);
      toast.error("Failed to send verification email. Please try again.");
      playError();
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await authClient.twoFactor.verifyTotp({
        code: otpCode,
      });

      if (error) {
        toast.error("Invalid code. Please check your authenticator app and try again.");
        playError();
        setOtpCode("");
        setLoading(false);
        return;
      }

      toast.success("2FA verified! Welcome back.");
      playSuccess();
      router.replace("/dashboard");
    } catch (err: unknown) {
      console.error("2FA verification failed:", err);
      toast.error("Verification failed. Please try again.");
      playError();
      setLoading(false);
    }
  };

  // Check for verification success from URL params
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "true") {
      toast.success("Email verified successfully! You can now log in.");
      playSuccess();
      // Clean up URL
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {step === "login" ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>Enter your credentials to login</CardDescription>
          </CardHeader>

          <CardContent>
            <form className="grid gap-4" onSubmit={handleLogin}>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="juandelacruz@gmail.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a
                    href="/forgot-password"
                    className="text-sm underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    placeholder="•••••••••••"
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : step === "email-sent" ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Check your email</CardTitle>
            <CardDescription>
              We sent a verification link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-950">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="mb-2 font-semibold text-green-900 dark:text-green-100">
                Verification Email Sent!
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200">
                Please check your inbox and click the verification link to
                continue.
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg bg-muted p-4">
                <h4 className="mb-2 text-sm font-medium">What happens next?</h4>
                <ol className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="font-bold">1.</span>
                    <span>
                      Check your email inbox for our verification link
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">2.</span>
                    <span>Click the link to verify your email address</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">3.</span>
                    <span>You'll be redirected back here to log in</span>
                  </li>
                </ol>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Didn't receive the email?
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSendVerificationEmail}
                disabled={loading}
              >
                {loading ? "Sending..." : "Resend verification email"}
              </Button>
            </div>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setStep("login");
                setEmail("");
                setPassword("");
              }}
            >
              Back to login
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Two-Factor Authentication</CardTitle>
            <CardDescription>
              Enter the 6-digit code from your authenticator app
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="grid gap-4" onSubmit={handleVerify2FA}>
              <div className="grid gap-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) =>
                    setOtpCode(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest"
                  required
                  autoFocus
                />
                <p className="text-center text-xs text-muted-foreground">
                  Code refreshes every 30 seconds
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || otpCode.length !== 6}
                >
                  {loading ? "Verifying..." : "Verify"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep("login");
                    setOtpCode("");
                  }}
                >
                  Back to Login
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Lost access to your authenticator?{" "}
                <a href="/recovery" className="underline">
                  Use recovery code
                </a>
              </p>
            </form>
          </CardContent>
        </Card>
      )}

      <p className="px-6 text-center text-sm text-muted-foreground">
        By continuing, you agree to our{" "}
        <a href="/terms" className="underline">
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" className="underline">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
