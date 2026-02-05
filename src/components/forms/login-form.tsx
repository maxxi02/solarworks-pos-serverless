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
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner"; // ← import this
import { useNotificationSound } from "@/lib/use-notification-sound";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();

  const [step, setStep] = React.useState<"login" | "verify-2fa">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [otpCode, setOtpCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const { playError, playSuccess } = useNotificationSound();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await authClient.signIn.email(
        {
          email,
          password,
        },
        {
          async onSuccess(context) {
            if (context.data?.twoFactorRedirect) {
              setStep("verify-2fa");
              setLoading(false);
              return;
            } else {
              toast.success("Login successful! Setting up 2FA...");
              router.replace("/setup-2fa");
            }
          },
          async onError(context) {
            toast.error(context.error.message ?? "Invalid email or password.");
            playError();
            setLoading(false);
            return;
          },
        },
      );
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
      playError();
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
        toast.error(
          "Invalid code. Please check your authenticator app and try again.",
        );
        setOtpCode("");
        setLoading(false);
        return;
      }

      toast.success("2FA verified! Welcome back.");
      router.replace("/dashboard");
    } catch (err) {
      toast.error("Verification failed. Please try again.");
      setLoading(false);
    }
  };

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
