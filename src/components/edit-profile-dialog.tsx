"use client";

import * as React from "react";
import { authClient } from "@/lib/auth-client";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, X } from "lucide-react";
import { ExtendedUser } from "@/lib/auth";
import { toast } from "sonner"; // or your toast library
import { useRouter } from "next/navigation";

interface EditProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: ExtendedUser;
}

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

export function EditProfileDialog({
    open,
    onOpenChange,
    user,
}: EditProfileDialogProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = React.useState(false);
    const [imagePreview, setImagePreview] = React.useState<string | null>(
        user.image || null
    );
    const [imageFile, setImageFile] = React.useState<File | null>(null);

    const [formData, setFormData] = React.useState({
        name: user.name || "",
        phoneNumber: user.phoneNumber || "",
    });

    // Reset form when dialog opens/closes or user changes
    React.useEffect(() => {
        if (open) {
            setFormData({
                name: user.name || "",
                phoneNumber: user.phoneNumber || "",
            });
            setImagePreview(user.image || null);
            setImageFile(null);
        }
    }, [open, user]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            toast.error("Please select a valid image file");
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size should be less than 5MB");
            return;
        }

        setImageFile(file);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Update name and phone number
            const updateResult = await authClient.updateUser({
                name: formData.name.trim(),
                phoneNumber: formData.phoneNumber.trim() || null,
            });

            if (updateResult.error) {
                toast.error(updateResult.error.message || "Failed to update profile");
                setIsLoading(false);
                return;
            }

            // Update profile image if changed
            if (imageFile) {
                // Convert file to base64
                const base64 = await fileToBase64(imageFile);

                const imageResult = await authClient.updateUser({
                    image: base64,
                });

                if (imageResult.error) {
                    toast.error(imageResult.error.message || "Failed to update profile picture");
                    setIsLoading(false);
                    return;
                }
            } else if (imagePreview === null && user.image) {
                // Remove image if it was deleted
                const imageResult = await authClient.updateUser({
                    image: null,
                });

                if (imageResult.error) {
                    toast.error(imageResult.error.message || "Failed to remove profile picture");
                    setIsLoading(false);
                    return;
                }
            }

            toast.success("Profile updated successfully!");
            onOpenChange(false);
            router.refresh();
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-125">
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                        Update your profile information and profile picture
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Profile Picture Section */}
                    <div className="space-y-4">
                        <Label>Profile Picture</Label>
                        <div className="flex items-center gap-6">
                            <Avatar className="h-24 w-24">
                                {imagePreview ? (
                                    <AvatarImage src={imagePreview} alt="Profile preview" />
                                ) : (
                                    <AvatarFallback className="text-2xl">
                                        {getUserInitials(formData.name)}
                                    </AvatarFallback>
                                )}
                            </Avatar>

                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => document.getElementById("image-upload")?.click()}
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload
                                    </Button>

                                    {imagePreview && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleRemoveImage}
                                        >
                                            <X className="mr-2 h-4 w-4" />
                                            Remove
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    JPG, PNG or GIF. Max 5MB.
                                </p>
                            </div>

                            <input
                                id="image-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageChange}
                            />
                        </div>
                    </div>

                    {/* Name Field */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                            id="name"
                            placeholder="Enter your full name"
                            value={formData.name}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, name: e.target.value }))
                            }
                            disabled={isLoading}
                            required
                        />
                    </div>

                    {/* Email Field (Read-only) */}
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={user.email}
                            disabled
                            className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                            Email cannot be changed from this form
                        </p>
                    </div>

                    {/* Phone Number Field */}
                    <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input
                            id="phoneNumber"
                            type="tel"
                            placeholder="+1 (555) 123-4567"
                            value={formData.phoneNumber}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))
                            }
                            disabled={isLoading}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}