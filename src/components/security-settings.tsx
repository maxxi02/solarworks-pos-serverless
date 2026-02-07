"use client";

import * as React from "react";
import { authClient } from "@/lib/auth-client";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Key, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { ExtendedUser } from "@/lib/auth";
import { ChangePasswordDialog } from './change-password-dialog'
import QRCode from "react-qr-code";

interface SecuritySettingsProps {
    user: ExtendedUser;
}

export function SecuritySettings({ user }: SecuritySettingsProps) {
    const [passwordDialogOpen, setPasswordDialogOpen] = React.useState(false);
    const [twoFactorDialogOpen, setTwoFactorDialogOpen] = React.useState(false);
    const [disableTwoFactorDialogOpen, setDisableTwoFactorDialogOpen] = React.useState(false);

    const [isEnabling2FA, setIsEnabling2FA] = React.useState(false);
    const [isDisabling2FA, setIsDisabling2FA] = React.useState(false);
    const [twoFactorData, setTwoFactorData] = React.useState<{
        totpURI: string;
        backupCodes: string[];
    } | null>(null);
    const [verificationCode, setVerificationCode] = React.useState("");
    const [copiedSecret, setCopiedSecret] = React.useState(false);
    const [passwordForEnable, setPasswordForEnable] = React.useState("");
    const [showPasswordInput, setShowPasswordInput] = React.useState(false);

    const handleEnable2FA = async () => {
        if (!passwordForEnable) {
            toast.error("Password is required to enable 2FA");
            return;
        }

        setIsEnabling2FA(true);
        try {
            const result = await authClient.twoFactor.enable({
                password: passwordForEnable,
            });

            if (result.error) {
                toast.error(result.error.message || "Failed to enable 2FA");
                setIsEnabling2FA(false);
                return;
            }

            // Store the TOTP URI and backup codes
            if (result.data?.totpURI) {
                setTwoFactorData({
                    totpURI: result.data.totpURI,
                    backupCodes: result.data.backupCodes || [],
                });
                setShowPasswordInput(false);
                setPasswordForEnable("");
                setTwoFactorDialogOpen(true);
            }
        } catch (error) {
            console.error("Error enabling 2FA:", error);
            toast.error("An unexpected error occurred");
        } finally {
            setIsEnabling2FA(false);
        }
    };

    const handleVerify2FA = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            toast.error("Please enter a valid 6-digit code");
            return;
        }

        try {
            const result = await authClient.twoFactor.verifyTotp({
                code: verificationCode,
            });

            if (result.error) {
                toast.error(result.error.message || "Invalid verification code");
                return;
            }

            toast.success("Two-factor authentication enabled successfully!");
            setTwoFactorDialogOpen(false);
            setVerificationCode("");
            setTwoFactorData(null);
            window.location.reload(); // Refresh to show updated state
        } catch (error) {
            console.error("Error verifying 2FA:", error);
            toast.error("An unexpected error occurred");
        }
    };

    const handleDisable2FA = async () => {
        setIsDisabling2FA(true);
        try {
            // Better Auth requires password to disable 2FA
            // You might want to add a password input in the disable dialog
            const result = await authClient.twoFactor.disable({
                password: "", // Add password field in the disable dialog
            });

            if (result.error) {
                toast.error(result.error.message || "Failed to disable 2FA");
                setIsDisabling2FA(false);
                return;
            }

            toast.success("Two-factor authentication disabled");
            setDisableTwoFactorDialogOpen(false);
            window.location.reload(); // Refresh to show updated state
        } catch (error) {
            console.error("Error disabling 2FA:", error);
            toast.error("An unexpected error occurred");
        } finally {
            setIsDisabling2FA(false);
        }
    };

    const copyTotpUri = () => {
        if (twoFactorData?.totpURI) {
            // Extract the secret from the TOTP URI
            const secretMatch = twoFactorData.totpURI.match(/secret=([^&]+)/);
            const secret = secretMatch ? secretMatch[1] : twoFactorData.totpURI;

            navigator.clipboard.writeText(secret);
            setCopiedSecret(true);
            toast.success("Secret copied to clipboard");
            setTimeout(() => setCopiedSecret(false), 2000);
        }
    };

    return (
        <>
            <section className="space-y-6">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Security Settings</h2>
                    <p className="text-muted-foreground mt-1">
                        Manage your password and two-factor authentication
                    </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                    {/* Password Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Key className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Password</CardTitle>
                                    <CardDescription className="text-sm">
                                        Change your password regularly
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setPasswordDialogOpen(true)}
                            >
                                Change Password
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Two-Factor Authentication Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Shield className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg">Two-Factor Auth</CardTitle>
                                        <Badge variant={user.twoFactorEnabled ? "default" : "secondary"}>
                                            {user.twoFactorEnabled ? "Enabled" : "Disabled"}
                                        </Badge>
                                    </div>
                                    <CardDescription className="text-sm">
                                        Add an extra layer of security
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {user.twoFactorEnabled ? (
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => setDisableTwoFactorDialogOpen(true)}
                                >
                                    Disable 2FA
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => setShowPasswordInput(true)}
                                    disabled={isEnabling2FA}
                                >
                                    {isEnabling2FA && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Enable 2FA
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Change Password Dialog */}
            <ChangePasswordDialog
                open={passwordDialogOpen}
                onOpenChange={setPasswordDialogOpen}
            />

            {/* Password Input Dialog for Enabling 2FA */}
            <Dialog open={showPasswordInput} onOpenChange={setShowPasswordInput}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Your Password</DialogTitle>
                        <DialogDescription>
                            Please enter your password to enable two-factor authentication
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={passwordForEnable}
                                onChange={(e) => setPasswordForEnable(e.target.value)}
                                placeholder="Enter your password"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowPasswordInput(false);
                                setPasswordForEnable("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleEnable2FA} disabled={isEnabling2FA || !passwordForEnable}>
                            {isEnabling2FA && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Continue
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Enable 2FA Dialog */}
            <Dialog open={twoFactorDialogOpen} onOpenChange={setTwoFactorDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
                        <DialogDescription>
                            Scan the QR code with your authenticator app and enter the code to verify
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        {twoFactorData && (
                            <>
                                {/* QR Code */}
                                <div className="flex flex-col items-center gap-4">
                                    <div className="rounded-lg border bg-white p-4">
                                        <QRCode
                                            value={twoFactorData.totpURI}
                                            size={200}
                                        />
                                    </div>
                                    <p className="text-center text-sm text-muted-foreground">
                                        Scan this QR code with Google Authenticator, Authy, or similar app
                                    </p>
                                </div>

                                {/* Manual Entry Secret */}
                                <div className="space-y-2">
                                    <Label>Or enter this code manually:</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={twoFactorData.totpURI.match(/secret=([^&]+)/)?.[1] || ""}
                                            readOnly
                                            className="font-mono text-sm"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={copyTotpUri}
                                        >
                                            {copiedSecret ? (
                                                <Check className="h-4 w-4" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Backup Codes */}
                                {twoFactorData.backupCodes.length > 0 && (
                                    <div className="space-y-2">
                                        <Label>Backup Codes (Save these securely!):</Label>
                                        <div className="rounded-lg border p-4 bg-muted">
                                            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                                                {twoFactorData.backupCodes.map((code, index) => (
                                                    <div key={index}>{code}</div>
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Store these codes in a safe place. Each can only be used once.
                                        </p>
                                    </div>
                                )}

                                {/* Verification Code Input */}
                                <div className="space-y-2">
                                    <Label htmlFor="verificationCode">
                                        Enter the 6-digit code from your app
                                    </Label>
                                    <Input
                                        id="verificationCode"
                                        placeholder="000000"
                                        maxLength={6}
                                        value={verificationCode}
                                        onChange={(e) =>
                                            setVerificationCode(e.target.value.replace(/\D/g, ""))
                                        }
                                        className="text-center text-2xl tracking-widest"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setTwoFactorDialogOpen(false);
                                setVerificationCode("");
                                setTwoFactorData(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleVerify2FA}>
                            Verify and Enable
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Disable 2FA Confirmation Dialog */}
            <Dialog open={disableTwoFactorDialogOpen} onOpenChange={setDisableTwoFactorDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Disable Two-Factor Authentication?</DialogTitle>
                        <DialogDescription>
                            This will make your account less secure. Are you sure you want to continue?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDisableTwoFactorDialogOpen(false)}
                            disabled={isDisabling2FA}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDisable2FA}
                            disabled={isDisabling2FA}
                        >
                            {isDisabling2FA && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Disable 2FA
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}