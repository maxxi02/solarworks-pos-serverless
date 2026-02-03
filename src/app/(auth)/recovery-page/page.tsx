"use client";

import * as React from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { ShieldAlert } from "lucide-react";

export default function RecoveryPage() {
  const router = useRouter();
  const [recoveryCode, setRecoveryCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Note: You'll need to implement this in your auth setup
      // This is a placeholder for the recovery flow
      const { error } = await authClient.twoFactor.verifyTotp({
        code: recoveryCode,
      });

      if (error) {
        setError("Invalid recovery code. Please check and try again.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setError(
        "Recovery failed. Please contact support if you continue to have issues.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <ShieldAlert className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle className="text-xl">Account Recovery</CardTitle>
            <CardDescription>
              Enter your backup key to regain access to your account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleRecovery} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recovery">Backup Key</Label>
                <Input
                  id="recovery"
                  type="text"
                  value={recoveryCode}
                  onChange={(e) =>
                    setRecoveryCode(
                      e.target.value.replace(/\s/g, "").toUpperCase(),
                    )
                  }
                  placeholder="ABCD-EFGH-IJKL-MNOP"
                  className="font-mono"
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  This is the backup key you saved when setting up 2FA
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Verifying..." : "Recover Account"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => router.push("/login")}
                >
                  Back to Login
                </Button>
              </div>

              <Alert>
                <AlertDescription className="text-xs">
                  Can't find your backup key?{" "}
                  <a href="/contact-support" className="underline font-medium">
                    Contact Support
                  </a>
                </AlertDescription>
              </Alert>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
