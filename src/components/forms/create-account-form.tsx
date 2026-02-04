"use client";

import { useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function CreateAccountForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    if (!formData.email.trim()) {
      setError("Email is required");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // Create user using admin.createUser
      const { data: newUser, error: createError } =
        await authClient.admin.createUser({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: "user", // Default role
          data: {
            // Add any custom fields here
            createdAt: new Date().toISOString(),
            accountType: "standard",
          },
        });

      if (createError) {
        console.error("Create user error:", createError);
        setError(createError.message || "Failed to create account");
        setLoading(false);
        return;
      }

      console.log("User created successfully:", newUser);
      setSuccess(true);

      // Auto-login after successful registration
      setTimeout(async () => {
        const { error: signInError } = await authClient.signIn.email({
          email: formData.email,
          password: formData.password,
        });

        if (signInError) {
          console.error("Auto sign-in error:", signInError);
          // Redirect to login page if auto-login fails
          router.push("/login");
          return;
        }

        // Check if user needs to set up 2FA
        const { data } = await authClient.getSession();

        if (data?.user && !data.user.twoFactorEnabled) {
          router.push("/setup-2fa");
        } else {
          router.push("/dashboard");
        }
      }, 1500);
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create account</CardTitle>
          <CardDescription>
            Enter your details to create a new account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Juan Dela Cruz"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading || success}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="juandelacruz@gmail.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading || success}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Minimum 8 characters"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading || success}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters long
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading || success}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 text-green-900 border-green-200">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Account created successfully! Redirecting...
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={loading || success}
              className="w-full"
            >
              {loading
                ? "Creating account..."
                : success
                  ? "Success!"
                  : "Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="px-6 text-center text-sm text-muted-foreground">
        By creating an account, you agree to our{" "}
        <a href="/terms" className="underline underline-offset-4">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy" className="underline underline-offset-4">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
