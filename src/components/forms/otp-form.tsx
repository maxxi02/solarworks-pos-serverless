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

export function OTPForm({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Verify your email</CardTitle>
          <CardDescription>
            We sent a 6-digit code to your email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="otp">Enter code</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="123456"
                className="text-center text-lg tracking-[0.5em]"
                required
                autoFocus
              />
              <p className="text-center text-sm text-muted-foreground">
                Code expires in 10 minutes
              </p>
            </div>

            <Button type="submit">Verify</Button>

            <p className="text-center text-sm text-muted-foreground">
              Didn&#39;t receive code?{" "}
              <a href="#" className="underline">
                Resend
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
