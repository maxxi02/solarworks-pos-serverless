"use client";

import * as React from "react";
import { authClient } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail,
  Phone,
  Edit,
  User,
  ShieldCheck,
  CalendarDays,
  Clock,
  Hash,
  KeyRound,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { ExtendedUser } from "@/lib/auth";
import { EditProfileDialog } from "@/components/edit-profile-dialog";
import { SecuritySettings } from "@/components/security-settings";
import { ModeToggle } from "@/components/mode-toggle";
import { Moon, Sun } from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";


function getUserInitials(name?: string | null): string {
  if (!name?.trim()) return "U";
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfilePage() {
  const { data: session, isPending } = authClient.useSession();
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);

  // ── Attendance PIN state (staff/manager only) ─────────────────────────────
  const [hasPin, setHasPin] = React.useState<boolean | null>(null);
  const [pinDigits, setPinDigits] = React.useState(["", "", "", ""]);
  const [confirmDigits, setConfirmDigits] = React.useState(["", "", "", ""]);
  const [pinSaving, setPinSaving] = React.useState(false);
  const pinRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const confirmRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const pinValue = pinDigits.join("");
  const confirmValue = confirmDigits.join("");

  React.useEffect(() => {
    if (!session?.user) return;
    const role = (session.user as ExtendedUser).role;
    if (role === "staff" || role === "manager") {
      fetch("/api/user/attendance-pin")
        .then((r) => r.json())
        .then((d) => { if (d.success) setHasPin(d.hasPin); })
        .catch(() => {});
    }
  }, [session]);

  const handlePinDigit = (
    idx: number,
    val: string,
    arr: string[],
    setArr: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
  ) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...arr]; next[idx] = val; setArr(next);
    if (val && idx < 3) refs.current[idx + 1]?.focus();
  };

  const handlePinKeyDown = (
    idx: number,
    e: React.KeyboardEvent,
    arr: string[],
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
  ) => {
    if (e.key === "Backspace" && !arr[idx] && idx > 0) refs.current[idx - 1]?.focus();
  };

  const handleSavePin = async () => {
    if (pinValue.length !== 4) { toast.error("PIN must be exactly 4 digits"); return; }
    if (pinValue !== confirmValue) { toast.error("PINs do not match"); return; }
    setPinSaving(true);
    try {
      const res = await fetch("/api/user/attendance-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinValue }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Attendance PIN saved!");
        setHasPin(true);
        setPinDigits(["", "", "", ""]);
        setConfirmDigits(["", "", "", ""]);
      } else toast.error(data.message || "Failed to save PIN");
    } catch { toast.error("Network error"); }
    finally { setPinSaving(false); }
  };

  const handleRemovePin = async () => {
    setPinSaving(true);
    try {
      const res = await fetch("/api/user/attendance-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: null }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Attendance PIN removed");
        setHasPin(false);
        setPinDigits(["", "", "", ""]);
        setConfirmDigits(["", "", "", ""]);
      } else toast.error(data.message || "Failed to remove PIN");
    } catch { toast.error("Network error"); }
    finally { setPinSaving(false); }
  };

  if (isPending) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-10">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <Skeleton className="h-44 w-44 rounded-full" />
            <div className="flex-1 space-y-4 text-center sm:text-left">
              <Skeleton className="mx-auto h-10 w-64 sm:mx-0" />
              <Skeleton className="mx-auto h-6 w-48 sm:mx-0" />
              <Skeleton className="mx-auto h-10 w-40 sm:mx-0" />
            </div>
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-muted-foreground">
        Please sign in to view your profile
      </div>
    );
  }

  const user = session.user as ExtendedUser;
  const initials = getUserInitials(user.name);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-14">

          {/* ─── Profile Header ──────────────────────────────────────── */}
          <section className="flex flex-col items-center gap-10 sm:flex-row sm:items-start sm:gap-12">
            {/* Clickable avatar with zoom trigger */}
            <Dialog>
              <DialogTrigger asChild>
                <div className="group relative cursor-pointer">
                  <Avatar className="h-44 w-44 border-4 border-background shadow-2xl transition-transform duration-300 group-hover:scale-105 sm:h-52 sm:w-52">
                    {user.image ? (
                      <AvatarImage
                        src={user.image}
                        alt={`${user.name || "User"}'s profile picture`}
                      />
                    ) : (
                      <AvatarFallback className="bg-linear-to-br from-primary/80 to-primary text-5xl font-semibold">
                        {initials}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  {/* Hover overlay hint */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="rounded bg-black/60 px-3 py-1.5 text-sm font-medium text-white">
                      Click to enlarge
                    </span>
                  </div>
                </div>
              </DialogTrigger>

              <DialogContent className="max-w-[95vw] max-h-[95vh] border-none bg-transparent p-0 sm:p-2">
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black/95 shadow-2xl backdrop-blur-sm">
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={`${user.name || "User"}'s profile picture (zoomed)`}
                      fill
                      className="object-contain"
                      quality={90}
                      priority
                      sizes="(max-width: 768px) 95vw, 90vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white/70">
                      No profile picture set
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Name, username, badges, edit button */}
            <div className="flex-1 space-y-6 text-center sm:text-left">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  {user.name || "Your Name"}
                </h1>
                <p className="text-xl text-muted-foreground">
                  @{user.email?.split("@")[0] || "username"}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <Badge variant="secondary" className="px-4 py-1.5 text-base capitalize">
                  {user.role || "User"}
                </Badge>

                {user.emailVerified && (
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1.5 border-green-600 px-4 py-1.5 text-green-600"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Verified
                  </Badge>
                )}

                {user.twoFactorEnabled && (
                  <Badge variant="outline" className="px-4 py-1.5">
                    2FA Enabled
                  </Badge>
                )}
              </div>

              <Button
                size="lg"
                className="gap-2 px-8"
                onClick={() => setEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
            </div>
          </section>

          <hr className="border-border/50" />

          {/* ─── Contact Information ─────────────────────────────────── */}
          <section className="space-y-8">
            <h2 className="text-2xl font-semibold tracking-tight">Contact Information</h2>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex items-start gap-4 rounded-xl border bg-muted/40 p-6">
                <Mail className="mt-1 h-6 w-6 text-primary" />
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-lg font-medium">{user.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-xl border bg-muted/40 p-6">
                <Phone className="mt-1 h-6 w-6 text-primary" />
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Phone Number</p>
                  <p className="text-lg font-medium">
                    {user.phoneNumber || "Not provided"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <hr className="border-border/50" />

          {/* ─── Account Details ─────────────────────────────────────── */}
          <section className="space-y-8">
            <h2 className="text-2xl font-semibold tracking-tight">Account Details</h2>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: User, label: "Account ID", value: user.id, mono: true },
                {
                  icon: User,
                  label: "Role",
                  value: user.role || "User",
                  capitalize: true,
                },
                {
                  icon: ShieldCheck,
                  label: "Email Verified",
                  value: user.emailVerified ? "Verified" : "Not Verified",
                  badge: user.emailVerified,
                },
                {
                  icon: ShieldCheck,
                  label: "Two-Factor Auth",
                  value: user.twoFactorEnabled ? "Enabled" : "Disabled",
                  badge: user.twoFactorEnabled,
                },
                {
                  icon: CalendarDays,
                  label: "Member Since",
                  value: new Date(user.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }),
                },
                {
                  icon: Clock,
                  label: "Last Updated",
                  value: new Date(user.updatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }),
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-xl border bg-muted/40 p-6"
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <item.icon className="h-4 w-4" />
                    <span className="text-sm">{item.label}</span>
                  </div>

                  {item.badge !== undefined ? (
                    <Badge
                      variant={item.badge ? "default" : "secondary"}
                      className="mt-1"
                    >
                      {item.value}
                    </Badge>
                  ) : (
                    <p
                      className={`text-lg font-medium ${item.mono ? "font-mono break-all" : ""} ${item.capitalize ? "capitalize" : ""
                        }`}
                    >
                      {item.value}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <hr className="border-border/50" />

          {/* ─── Appearance ──────────────────────────────────────────── */}
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">Appearance</h2>
                <p className="text-sm text-muted-foreground">
                  Customize how your dashboard looks.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-6 sm:flex-row">
              <div className="flex flex-1 items-start gap-4 rounded-xl border bg-muted/40 p-6">
                <div className="mt-1 rounded-full bg-primary/10 p-2 text-primary">
                  <Moon className="h-5 w-5 dark:hidden" />
                  <Sun className="hidden h-5 w-5 dark:block" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-medium">Dark Mode</p>
                      <p className="text-sm text-muted-foreground">
                        Switch between light and dark themes.
                      </p>
                    </div>
                    <ModeToggle />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <hr className="border-border/50" />

          {/* ─── Attendance PIN (staff / manager only) ────────────────── */}
          {(user.role === "staff" || user.role === "manager") && (
            <section className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                  <KeyRound className="h-6 w-6 text-primary" />
                  Attendance PIN
                  {hasPin !== null && (
                    <Badge variant={hasPin ? "default" : "secondary"} className="text-sm">
                      {hasPin ? "PIN Set" : "No PIN"}
                    </Badge>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Set a 4–6 digit PIN for quick clock-in / clock-out on the Attendance page.
                  If no PIN is set, your account password will be used instead.
                </p>
              </div>

              <div className="rounded-xl border bg-muted/40 p-6 space-y-6">
                {/* New PIN */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <Hash className="h-3.5 w-3.5" />
                    {hasPin ? "Change PIN" : "New PIN"} (4 digits)
                  </Label>
                  <div className="flex gap-2">
                    {pinDigits.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => { pinRefs.current[i] = el; }}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={(e) => handlePinDigit(i, e.target.value, pinDigits, setPinDigits, pinRefs)}
                        onKeyDown={(e) => handlePinKeyDown(i, e, pinDigits, pinRefs)}
                        className="h-12 w-11 rounded-lg border bg-background text-center text-xl font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    ))}
                  </div>
                </div>

                {/* Confirm PIN */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <Hash className="h-3.5 w-3.5" />
                    Confirm PIN
                  </Label>
                  <div className="flex gap-2">
                    {confirmDigits.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => { confirmRefs.current[i] = el; }}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={(e) => handlePinDigit(i, e.target.value, confirmDigits, setConfirmDigits, confirmRefs)}
                        onKeyDown={(e) => handlePinKeyDown(i, e, confirmDigits, confirmRefs)}
                        className="h-12 w-11 rounded-lg border bg-background text-center text-xl font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    ))}
                  </div>
                </div>

                {pinValue && confirmValue && pinValue !== confirmValue && (
                  <p className="text-xs text-destructive">PINs do not match</p>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={handleSavePin}
                    disabled={pinSaving || pinValue.length < 4 || pinValue !== confirmValue}
                  >
                    {pinSaving ? "Saving…" : "Save PIN"}
                  </Button>
                  {hasPin && (
                    <Button
                      variant="outline"
                      onClick={handleRemovePin}
                      disabled={pinSaving}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove PIN
                    </Button>
                  )}
                </div>
              </div>
            </section>
          )}

          <hr className="border-border/50" />

          {/* ─── Security Settings ───────────────────────────────────── */}
          <SecuritySettings user={user} />

        </div>
      </div>

      {/* Edit Profile Dialog */}
      <EditProfileDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={user}
      />
    </div>
  );
}