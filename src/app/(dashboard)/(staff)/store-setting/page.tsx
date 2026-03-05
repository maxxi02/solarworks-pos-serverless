"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Bell,
  Volume2,
  VolumeX,
  Vibrate,
  Save,
  Settings,
  Smartphone,
  Check,
  PlayCircle,
  Hash,
  KeyRound,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Settings shape ────────────────────────────────────────────────────────

interface PortalNotifSettings {
  sound: boolean;
  vibration: boolean;
}


const DEFAULT_SETTINGS: PortalNotifSettings = {
  sound: true,
  vibration: true,
};

// ─── Toggle switch ─────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${checked ? "bg-primary" : "bg-muted"
        }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"
          }`}
      />
    </button>
  );
}

// ─── Sound preview ─────────────────────────────────────────────────────────

function previewSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    toast.error("Audio not available in this browser context");
  }
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function StoreSettingPage() {
  const [settings, setSettings] = useState<PortalNotifSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // ── PIN state ────────────────────────────────────────────────────────────
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [pinDigits, setPinDigits] = useState(["", "", "", ""]);
  const [confirmDigits, setConfirmDigits] = useState(["", "", "", ""]);
  const [pinSaving, setPinSaving] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmRefs = useRef<(HTMLInputElement | null)[]>([]);

  const pinValue = pinDigits.join("");
  const confirmValue = confirmDigits.join("");

  // Load from DB on mount — both requests fire in parallel
  useEffect(() => {
    Promise.all([
      fetch("/api/user/notif-settings").then((r) => r.json()).catch(() => null),
      fetch("/api/user/attendance-pin").then((r) => r.json()).catch(() => null),
    ]).then(([notif, pin]) => {
      if (notif?.success) setSettings(notif.settings);
      if (pin?.success) setHasPin(pin.hasPin);
    }).finally(() => setSettingsLoading(false));
  }, []);

  const handlePinDigitChange = (
    idx: number,
    val: string,
    arr: string[],
    setArr: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
  ) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...arr];
    next[idx] = val;
    setArr(next);
    if (val && idx < 3) refs.current[idx + 1]?.focus();
  };

  const handlePinDigitKeyDown = (
    idx: number,
    e: React.KeyboardEvent,
    arr: string[],
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
  ) => {
    if (e.key === "Backspace" && !arr[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
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
      } else {
        toast.error(data.message || "Failed to save PIN");
      }
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
      } else {
        toast.error(data.message || "Failed to remove PIN");
      }
    } catch { toast.error("Network error"); }
    finally { setPinSaving(false); }
  };


  const updateSetting = <K extends keyof PortalNotifSettings>(
    key: K,
    value: PortalNotifSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      const res = await fetch("/api/user/notif-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        toast.success("Settings saved!");
        setTimeout(() => setSaved(false), 2000);
      } else {
        toast.error("Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Store Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage notifications and customer portal behavior
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          {saved ? (
            <>
              <Check className="h-4 w-4" />
              Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      <Separator />

      {/* Customer Portal Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Customer Portal Notifications</CardTitle>
              <CardDescription>
                Settings applied when customer order status changes to &ldquo;Serving&rdquo;
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-1">
          {/* Sound */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${settings.sound ? "bg-primary/10" : "bg-muted"}`}>
                {settings.sound ? (
                  <Volume2 className="h-4 w-4 text-primary" />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">Sound Alert</p>
                <p className="text-xs text-muted-foreground">
                  Play a chime when order status changes to Serving
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {settings.sound && (
                <button
                  onClick={previewSound}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  title="Preview sound"
                >
                  <PlayCircle className="h-4 w-4" />
                  Preview
                </button>
              )}
              <Toggle
                checked={settings.sound}
                onChange={(v) => updateSetting("sound", v)}
              />
            </div>
          </div>

          {/* Vibration */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${settings.vibration ? "bg-primary/10" : "bg-muted"}`}>
                <Vibrate className={`h-4 w-4 ${settings.vibration ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="font-medium text-sm">Vibration</p>
                <p className="text-xs text-muted-foreground">
                  Vibrate the customer&#39;s phone when order is being served
                </p>
              </div>
            </div>
            <Toggle
              checked={settings.vibration}
              onChange={(v) => updateSetting("vibration", v)}
            />
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 mt-2">
            <Bell className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-300">
              These settings are stored on the browser. Customers must visit the waiting page on the device where settings are applied.
              Settings are saved to your account and sync across devices.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save footer */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} size="lg" className="gap-2 min-w-32">
          {saved ? (
            <>
              <Check className="h-4 w-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
