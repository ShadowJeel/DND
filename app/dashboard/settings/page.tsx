"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { logger } from "@/lib/logger"
import { Loader2, Pencil, Save, X, BadgeCheck, Link as LinkIcon, Package, Plus, Trash2 } from "lucide-react"
import { auth } from "@/lib/firebase"
import { linkWithPopup, GoogleAuthProvider } from "firebase/auth"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { updateUser, getProducts } from "@/lib/store"
import { Checkbox } from "@/components/ui/checkbox"

export default function SettingsPage() {
    const { user, updateUserData, connectGoogle } = useAuth()
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: user?.name || "",
        userCode: user?.userCode || "",
        email: user?.email || "",
        phone: user?.phone || "",
        company: user?.company || "",
        categories: user?.categories || [] as string[],
        productManufacturers: user?.productManufacturers || {} as Record<string, string[]>,
        secondaryEmails: user?.secondaryEmails || [] as string[],
        notificationEmails: user?.notificationEmails || [user?.email || ""],
        // smsNotificationsEnabled: user?.smsNotificationsEnabled ?? true,
    })
    const [availableProducts, setAvailableProducts] = useState<{ id: string, name: string }[]>([])
    const [allManufacturers, setAllManufacturers] = useState<Record<string, string[]>>({})

    useEffect(() => {
        const fetchCats = async () => {
            try {
                const { getProducts, getAllProductManufacturers } = await import("@/lib/store")
                const [data, mfgData] = await Promise.all([getProducts(), getAllProductManufacturers()])
                setAvailableProducts(data)
                setAllManufacturers(mfgData)
            } catch (err) {
                logger.error("Failed to fetch products for settings", { error: (err as Error).message })
            }
        }
        fetchCats()
    }, [])

    const handleEdit = () => {
        setFormData({
            name: user?.name || "",
            userCode: user?.userCode || "",
            email: user?.email || "",
            phone: user?.phone || "",
            company: user?.company || "",
            categories: user?.categories || [],
            productManufacturers: user?.productManufacturers || {},
            secondaryEmails: user?.secondaryEmails || [],
            notificationEmails: user?.notificationEmails || [user?.email || ""],
            //smsNotificationsEnabled: user?.smsNotificationsEnabled ?? true,
        })
        setIsEditing(!isEditing)
    }

    const handleCancel = () => {
        setFormData({
            name: user?.name || "",
            userCode: user?.userCode || "",
            email: user?.email || "",
            phone: user?.phone || "",
            company: user?.company || "",
            categories: user?.categories || [],
            productManufacturers: user?.productManufacturers || {},
            secondaryEmails: user?.secondaryEmails || [],
            notificationEmails: user?.notificationEmails || [user?.email || ""],
        })
        setIsEditing(false)
    }

    const addSecondaryEmail = () => {
        setFormData(prev => ({
            ...prev,
            secondaryEmails: [...prev.secondaryEmails, ""]
        }))
    }

    const removeSecondaryEmail = (index: number) => {
        setFormData(prev => ({
            ...prev,
            secondaryEmails: prev.secondaryEmails.filter((_, i) => i !== index)
        }))
    }

    const updateSecondaryEmail = (index: number, value: string) => {
        setFormData(prev => {
            const newEmails = [...prev.secondaryEmails]
            newEmails[index] = value
            return { ...prev, secondaryEmails: newEmails }
        })
    }

    const handleSave = async () => {
        if (!user) return

        setLoading(true)
        try {
            // Sanitize notification emails before saving:
            // Only keep emails that are actually present (primary or secondary)
            const sanitizedNotificationEmails = (formData.notificationEmails || []).filter(email => 
                email === formData.email || formData.secondaryEmails.includes(email)
            )
            const payload = {
                ...formData,
                notificationEmails: sanitizedNotificationEmails
            }
            const data = await updateUser(user.id, payload)

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

    const handleConnectGoogle = async () => {
        try {
            setLoading(true)
            const provider = new GoogleAuthProvider()
            if (!auth.currentUser) throw new Error("No authenticated user session found.")

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
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                    <Label htmlFor="email">Email (Read-only)</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        readOnly
                                        className="bg-muted cursor-not-allowed"
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
                                <div className="space-y-2">
                                    <Label htmlFor="company">Company</Label>
                                    <Input
                                        id="company"
                                        value={formData.company}
                                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                        placeholder="Enter company name (optional)"
                                    />
                                </div>

                                <div className="col-span-2 space-y-4 border-t pt-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base font-semibold">Secondary Emails (for notifications)</Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addSecondaryEmail}
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add Email
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {formData.secondaryEmails.map((email, index) => (
                                            <div key={index} className="flex gap-2 items-end">
                                                <div className="flex-1 space-y-2">
                                                    <Label htmlFor={`secondaryEmail-${index}`}>Secondary Email {index + 1}</Label>
                                                    <Input
                                                        id={`secondaryEmail-${index}`}
                                                        type="email"
                                                        value={email}
                                                        onChange={(e) => updateSecondaryEmail(index, e.target.value)}
                                                        placeholder="Enter secondary email"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn-action-icon"
                                                    onClick={() => removeSecondaryEmail(index)}
                                                    title="Remove secondary email"
                                                >
                                                    <Trash2 />
                                                </button>
                                            </div>
                                        ))}
                                        {formData.secondaryEmails.length === 0 && (
                                            <p className="text-sm text-muted-foreground italic col-span-2">
                                                No secondary emails added.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="col-span-2 space-y-3 border-t pt-4">
                                    <Label className="text-base font-semibold">Email Notification Preferences</Label>
                                    <p className="text-xs text-muted-foreground">Select which emails should receive notifications.</p>
                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox 
                                                id="notify-primary" 
                                                checked={formData.notificationEmails?.includes(formData.email) ?? true} 
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            notificationEmails: [...(prev.notificationEmails || []), prev.email]
                                                        }))
                                                    } else {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            notificationEmails: (prev.notificationEmails || []).filter(e => e !== prev.email)
                                                        }))
                                                    }
                                                }}
                                            />
                                            <Label htmlFor="notify-primary" className="text-sm font-medium cursor-pointer">
                                                {formData.email} <span className="text-muted-foreground text-xs">(Primary Email)</span>
                                            </Label>
                                        </div>

                                        {formData.secondaryEmails.map((email, index) => {
                                            if (!email || email.trim() === "") return null;
                                            const isChecked = formData.notificationEmails?.includes(email) ?? false;
                                            return (
                                                <div key={index} className="flex items-center space-x-2">
                                                    <Checkbox 
                                                        id={`notify-secondary-${index}`} 
                                                        checked={isChecked} 
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    notificationEmails: [...(prev.notificationEmails || []), email]
                                                                }))
                                                            } else {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    notificationEmails: (prev.notificationEmails || []).filter(e => e !== email)
                                                                }))
                                                            }
                                                        }}
                                                    />
                                                    <Label htmlFor={`notify-secondary-${index}`} className="text-sm font-medium cursor-pointer">
                                                        {email}
                                                    </Label>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                            </div>

                            {/* 
                            <div className="space-y-4 border-t pt-4">
                                <Label className="text-base font-semibold">Notification Preferences</Label>
                                <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-medium">SMS Notifications</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Receive SMS alerts for important activity (e.g., when your offer is accepted).
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={formData.smsNotificationsEnabled}
                                            onClick={() => setFormData({ ...formData, smsNotificationsEnabled: !formData.smsNotificationsEnabled })}
                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${formData.smsNotificationsEnabled ? 'bg-primary' : 'bg-input'}`}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${formData.smsNotificationsEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            */}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="userCode">{user?.role === 'buyer' ? 'Buyer Code' : 'Seller Code'} (Read-only)</Label>
                                    <Input
                                        id="userCode"
                                        value={formData.userCode}
                                        readOnly
                                        className="bg-muted cursor-not-allowed"
                                        placeholder="User code"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Role</Label>
                                    <p className="text-sm font-medium capitalize mt-2.5">{user?.role}</p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Name</label>
                                <p className="font-medium text-foreground">{user?.name}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">{user?.role === 'buyer' ? 'Buyer Code' : 'Seller Code'}</label>
                                <p className="font-medium text-foreground">{user?.userCode}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Email</label>
                                <p className="font-medium text-foreground">{user?.email}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                                <p className="font-medium text-foreground">{user?.phone}</p>
                            </div>
                            <div className="col-span-2">
                                <label className="text-sm font-medium text-muted-foreground">Secondary Emails</label>
                                <div className="mt-1 flex flex-wrap gap-2">
                                    {user?.secondaryEmails && user.secondaryEmails.length > 0 ? (
                                        user.secondaryEmails.map((email, i) => (
                                            <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                                {email}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-sm font-medium text-foreground italic">Not set</p>
                                    )}
                                </div>
                            </div>
                            <div className="col-span-2 border-t pt-4">
                                <label className="text-sm font-medium text-muted-foreground block mb-2">Email Notification Preferences</label>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Checkbox checked={user?.notificationEmails?.includes(user.email) ?? true} disabled />
                                        <span className="text-sm text-foreground">{user?.email} <span className="text-muted-foreground text-xs">(Primary)</span></span>
                                    </div>
                                    {user?.secondaryEmails?.map((email, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <Checkbox checked={user?.notificationEmails?.includes(email) ?? false} disabled />
                                            <span className="text-sm text-foreground">{email}</span>
                                        </div>
                                    ))}
                                    {(!user?.secondaryEmails || user.secondaryEmails.length === 0) && (
                                        <p className="text-xs text-muted-foreground italic">No secondary emails added.</p>
                                    )}
                                </div>
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


                            {/* 
                            <div className="col-span-2 border-t pt-4">
                                <label className="text-sm font-medium text-muted-foreground">Notification Preferences</label>
                                <div className="mt-2 flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-medium">SMS Notifications</p>
                                        <p className="text-xs text-muted-foreground">
                                            {user?.smsNotificationsEnabled ? "Enabled" : "Disabled"}
                                        </p>
                                    </div>
                                    <div className={`h-2.5 w-2.5 rounded-full ${user?.smsNotificationsEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                                </div>
                            </div>
                            */}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="mt-6 border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <LinkIcon className="h-5 w-5 text-primary" />
                        One-Click Sign-in
                    </CardTitle>
                    <CardDescription>
                        Link your Google account to enable one-click sign-in to DND Purchase.
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
                                        ? "Your account is linked for one-click sign-in with Google."
                                        : "Link your Google account for a faster sign-in experience."}
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
