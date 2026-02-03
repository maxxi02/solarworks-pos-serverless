"use client";

import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";

export default function Setup2FA() {
  const [password, setPassword] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // 1️⃣ Generate QR FIRST
  useEffect(() => {
    const setup = async () => {
      const pwd = prompt("Confirm your password");
      if (!pwd) return;

      setPassword(pwd);

      const { data, error } = await authClient.twoFactor.getTotpUri({
        password: pwd,
      });

      if (error) {
        alert(error.message);
        return;
      }

      setQr(data.totpURI);
      setSecret(data.totpURI);
    };

    setup();
  }, []);

  // 2️⃣ Enable + Verify
  const verify = async () => {
    if (!password) return;

    setLoading(true);

    // enable 2FA (persist secret)
    const { error: enableError } = await authClient.twoFactor.enable({
      password,
    });

    if (enableError) {
      alert(enableError.message);
      setLoading(false);
      return;
    }

    // verify OTP
    const { error: verifyError } = await authClient.twoFactor.verifyTotp({
      code: otp,
    });

    if (verifyError) {
      alert(verifyError.message);
      setLoading(false);
      return;
    }

    // ✅ success
    window.location.href = "/dashboard";
  };

  return (
    <div className="space-y-4 max-w-sm">
      <h1 className="text-xl font-semibold">
        Enable Two-Factor Authentication
      </h1>

      {qr && <QRCode value={qr} />}

      {secret && (
        <p className="text-sm text-muted-foreground">
          Backup key: <span className="font-mono">{secret}</span>
        </p>
      )}

      <input
        className="border px-3 py-2 rounded w-full"
        placeholder="Enter 6-digit code"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
      />

      <button
        onClick={verify}
        disabled={loading}
        className="w-full bg-black text-white py-2 rounded"
      >
        {loading ? "Verifying..." : "Verify & Continue"}
      </button>
    </div>
  );
}
