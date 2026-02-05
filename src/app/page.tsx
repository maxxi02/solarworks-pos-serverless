import { Coffee } from "lucide-react";
import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a className="text-xl flex items-center gap-2 self-center font-bold text-foreground">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <Coffee className="size-4" />
          </div>
          RENDEZVOUS CAFÉ
        </a>
        <LoginForm />
      </div>
    </div>
  );
}
