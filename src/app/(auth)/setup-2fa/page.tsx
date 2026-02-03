"use client";

import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Copy, Check, AlertCircle } from "lucide-react";

export default function Setup2FA() {
  const router = useRouter();
  const [step, setStep] = useState<"loading" | "password" | "setup" | "verify">(
    "loading",
  );
  const [password, setPassword] = useState("");
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [backupKey, setBackupKey] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data, error } = await authClient.getSession();

        if (error || !data?.user) {
          console.error("No session found:", error);
          router.push("/login");
          return;
        }

        setUserEmail(data.user.email || "");

        // Check if 2FA is already enabled
        if (data.user.twoFactorEnabled) {
          console.log("2FA already enabled, redirecting to dashboard");
          router.push("/dashboard");
          return;
        }

        // User is authenticated and 2FA is not enabled
        setStep("password");
      } catch (err) {
        console.error("Auth check failed:", err);
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  // CORRECTED FLOW: Enable TOTP first, then get URI
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!password || password.length < 1) {
      setError("Please enter your password");
      setLoading(false);
      return;
    }

    try {
      console.log("Step 1: Enabling TOTP...");

      // FIRST: Enable 2FA - this generates the secret
      const { error: enableError } = await authClient.twoFactor.enable({
        password,
      });

      if (enableError) {
        console.error("Enable error:", enableError);

        if (enableError.message?.includes("password")) {
          setError("Incorrect password. Please try again.");
        } else if (enableError.message?.includes("session")) {
          setError("Session expired. Please log in again.");
          setTimeout(() => router.push("/login"), 2000);
        } else {
          setError(
            enableError.message || "Failed to enable 2FA. Please try again.",
          );
        }
        setLoading(false);
        return;
      }

      console.log("Step 2: Getting TOTP URI...");

      // SECOND: Get the TOTP URI (now that it's enabled)
      const { data, error: uriError } = await authClient.twoFactor.getTotpUri({
        password,
      });

      if (uriError) {
        console.error("getTotpUri error:", uriError);
        setError(
          uriError.message || "Failed to generate QR code. Please try again.",
        );
        setLoading(false);
        return;
      }

      if (!data?.totpURI) {
        setError("Failed to generate QR code. Please try again.");
        setLoading(false);
        return;
      }

      console.log("TOTP URI received successfully");
      setQrUri(data.totpURI);

      // Extract the secret from the URI for backup
      const secretMatch = data.totpURI.match(/secret=([^&]+)/);
      if (secretMatch) {
        setBackupKey(secretMatch[1]);
      }

      setStep("setup");
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Verify the OTP code
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (otp.length !== 6) {
      setError("Please enter a 6-digit code");
      setLoading(false);
      return;
    }

    try {
      console.log("Verifying OTP...");

      const { error: verifyError } = await authClient.twoFactor.verifyTotp({
        code: otp,
      });

      if (verifyError) {
        console.error("Verify error:", verifyError);
        setError(
          "Invalid code. Please check your authenticator app and try again.",
        );
        setOtp("");
        setLoading(false);
        return;
      }

      console.log("2FA verified successfully!");

      // Success! Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error("Unexpected error during verification:", err);
      setError("Verification failed. Please try again.");
      setLoading(false);
    }
  };

  const copyBackupKey = () => {
    if (backupKey) {
      navigator.clipboard.writeText(backupKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Loading state
  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        {step === "password" && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl">
                Enable Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Confirm your password to set up 2FA for {userEmail}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the password you use to log in
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Setting up 2FA..." : "Continue"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => router.push("/dashboard")}
                >
                  Skip for now
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "setup" && qrUri && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Scan QR Code</CardTitle>
              <CardDescription>
                Use an authenticator app like Google Authenticator or Authy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* QR Code */}
              <div className="flex justify-center bg-white p-6 rounded-lg border">
                <QRCode value={qrUri} size={200} />
              </div>

              {/* Instructions */}
              <Alert>
                <AlertDescription className="text-sm space-y-2">
                  <p className="font-semibold">How to scan:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Open your authenticator app</li>
                    <li>Tap the + or scan button</li>
                    <li>Point your camera at this QR code</li>
                    <li>Save the account in your app</li>
                  </ol>
                </AlertDescription>
              </Alert>

              {/* Backup Key */}
              {backupKey && (
                <div className="space-y-2">
                  <Label>Backup Key (Save this!)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={backupKey}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={copyBackupKey}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Save this key in a secure place. You'll need it to
                    recover your account if you lose access to your
                    authenticator app.
                  </p>
                </div>
              )}

              <Button onClick={() => setStep("verify")} className="w-full">
                I've Scanned the QR Code
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "verify" && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Verify Code</CardTitle>
              <CardDescription>
                Enter the 6-digit code from your authenticator app
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="text-center text-2xl tracking-widest"
                    required
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    The code changes every 30 seconds
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? "Verifying..." : "Verify & Complete Setup"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setStep("setup");
                      setOtp("");
                      setError(null);
                    }}
                  >
                    Back to QR Code
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
