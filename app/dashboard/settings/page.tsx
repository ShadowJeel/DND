"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { logger } from "@/lib/logger"
import { Loader2, MessageCircle, Pencil, Save, X, BadgeCheck, Link as LinkIcon } from "lucide-react"
import { auth } from "@/lib/firebase"
import { linkWithPopup, GoogleAuthProvider } from "firebase/auth"
import { useState } from "react"
import { toast } from "sonner"
import { updateUser } from "@/lib/store"

export default function SettingsPage() {
    const { user, updateUserData, connectGoogle } = useAuth()
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [testingWhatsApp, setTestingWhatsApp] = useState(false)
    const [formData, setFormData] = useState({
        name: user?.name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        company: user?.company || "",
    })

    const handleEdit = () => {
        setFormData({
            name: user?.name || "",
            email: user?.email || "",
            phone: user?.phone || "",
            company: user?.company || "",
        })
        setIsEditing(true)
    }

    const handleCancel = () => {
        setFormData({
            name: user?.name || "",
            email: user?.email || "",
            phone: user?.phone || "",
            company: user?.company || "",
        })
        setIsEditing(false)
    }

    const handleSave = async () => {
        if (!user) return

        setLoading(true)
        try {
            const data = await updateUser(user.id, formData)

            if (!data) {
                throw new Error("Failed to update profile")
            }

            // Update the auth context with new user data
            if (updateUserData) {
                updateUserData(data)
            }

            toast.success("Profile updated successfully")
            setIsEditing(false)
        } catch (error) {
            logger.error("Failed to update profile", { error: (error as Error)?.message })
            toast.error(error instanceof Error ? error.message : "Failed to update profile")
        } finally {
            setLoading(false)
        }
    }

    const handleTestWhatsApp = async () => {
        setTestingWhatsApp(true)
        try {
            const response = await fetch("/api/test-whatsapp")
            const data = await response.json()

            if (data.success) {
                toast.success("WhatsApp test message sent! Check your phone.")
            } else {
                toast.error(data.message || "Failed to send WhatsApp test message")
            }
        } catch (error) {
            logger.error("WhatsApp test error", { error: (error as Error)?.message })
            toast.error("Failed to test WhatsApp integration")
        } finally {
            setTestingWhatsApp(false)
        }
    }

    const handleConnectGoogle = async () => {
        try {
            setLoading(true)
            const provider = new GoogleAuthProvider()
            if (!auth.currentUser) throw new Error("No authenticated user session found.")

            // Correct way to link a provider to an existing signed-in user
            const result = await linkWithPopup(auth.currentUser, provider)

            if (result.user.email) {
                const success = await connectGoogle(result.user.email)
                if (success) {
                    toast.success("Google Account successfully connected!")
                } else {
                    toast.error("Failed to connect Google account.")
                }
            }
        } catch (error: any) {
            if (error.code === 'auth/credential-already-in-use') {
                toast.error("This Google account is already linked to another user.")
            } else {
                toast.error(error.message || "Failed to connect to Google")
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mx-auto max-w-4xl">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="font-serif text-2xl font-bold text-foreground">Profile & Settings</h2>
                    <p className="mt-1 text-muted-foreground">
                        Manage your account details and preferences.
                    </p>
                </div>
                {!isEditing && (
                    <Button onClick={handleEdit} variant="outline">
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Profile
                    </Button>
                )}
            </div>

            <Card className="border-border">
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isEditing ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Enter your name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="Enter your email"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone *</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="Enter your phone"
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="company">Company</Label>
                                    <Input
                                        id="company"
                                        value={formData.company}
                                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                        placeholder="Enter company name (optional)"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-muted-foreground">Display Name</Label>
                                <p className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                                    {user?.displayName} (cannot be changed)
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                                <p className="text-sm text-muted-foreground capitalize bg-muted px-3 py-2 rounded-md">
                                    {user?.role} (cannot be changed)
                                </p>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                    disabled={loading}
                                >
                                    <X className="mr-2 h-4 w-4" />
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={loading}
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    {loading ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Name</label>
                                <p className="font-medium text-foreground">{user?.name}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Display Name</label>
                                <p className="font-medium text-foreground">{user?.displayName}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Email</label>
                                <p className="font-medium text-foreground">{user?.email}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                                <p className="font-medium text-foreground">{user?.phone}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Role</label>
                                <p className="font-medium text-foreground capitalize">{user?.role}</p>
                            </div>
                            {user?.company && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Company</label>
                                    <div className="flex items-center gap-1.5">
                                        <p className="font-medium text-foreground">{user.company}</p>
                                        {user.verified && <BadgeCheck className="h-4 w-4 text-blue-500" />}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="mt-6 border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <LinkIcon className="h-5 w-5 text-primary" />
                        Connected Accounts
                    </CardTitle>
                    <CardDescription>
                        Manage your linked third-party authentication providers.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted rounded-full">
                                <svg className="h-6 w-6" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                    <path d="M1 1h22v22H1z" fill="none" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-medium text-foreground">Google</h3>
                                <p className="text-sm text-muted-foreground">
                                    {user?.googleConnected
                                        ? "Your account is linked with Google."
                                        : "Link your Google account for quicker logins."}
                                </p>
                            </div>
                        </div>
                        {user?.googleConnected ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-600 rounded-full text-sm font-medium border border-green-500/20">
                                <BadgeCheck className="h-4 w-4" />
                                Connected
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                onClick={handleConnectGoogle}
                                disabled={loading}
                            >
                                Connect Google
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

        </div>
    )
}
