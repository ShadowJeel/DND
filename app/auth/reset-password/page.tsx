"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { auth } from "@/lib/firebase"
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth"
import { ArrowLeft, Key, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { updateUserPasswordByEmail } from "@/lib/store"

function ResetPasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const oobCode = searchParams.get("oobCode")

    const [loading, setLoading] = useState(false)
    const [verifying, setVerifying] = useState(true)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [completed, setCompleted] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (!oobCode) {
            setError("Invalid or missing reset code.")
            setVerifying(false)
            return
        }

        const verifyCode = async () => {
            try {
                const userEmail = await verifyPasswordResetCode(auth, oobCode)
                setEmail(userEmail)
            } catch (err: any) {
                setError(err.message || "The reset link is invalid or has expired.")
            } finally {
                setVerifying(false)
            }
        }

        verifyCode()
    }, [oobCode])

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!password) {
            toast.error("Please enter a new password")
            return
        }

        if (!oobCode) return

        setLoading(true)
        try {
            // 1. Update Firebase Auth password
            await confirmPasswordReset(auth, oobCode, password)

            // 2. Sync to Firestore if we have the email
            if (email) {
                await updateUserPasswordByEmail(email, password)
            }

            setCompleted(true)
            toast.success("Password reset successfully!")
        } catch (err: any) {
            toast.error(err.message || "Failed to reset password")
        } finally {
            setLoading(false)
        }
    }

    if (verifying) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Verifying reset link...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center p-8 space-y-6">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                    <ArrowLeft className="h-6 w-6 text-destructive" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Reset Link Error</h3>
                    <p className="text-muted-foreground mt-2">{error}</p>
                </div>
                <Button asChild variant="outline" className="w-full">
                    <Link href="/auth/login">Back to Sign In</Link>
                </Button>
            </div>
        )
    }

    if (completed) {
        return (
            <div className="text-center p-8 space-y-6">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                    <h3 className="text-xl font-bold tracking-tight text-metallic">Password Reset Complete</h3>
                    <p className="text-muted-foreground mt-2">
                        Your password has been updated successfully. You can now sign in with your new password.
                    </p>
                </div>
                <Button asChild className="w-full mt-4">
                    <Link href="/auth/login">Sign In Now</Link>
                </Button>
            </div>
        )
    }

    return (
        <CardContent>
            <form onSubmit={handleReset} className="flex flex-col gap-4">
                <div className="space-y-1 text-sm text-muted-foreground mb-2">
                    <p>Resetting password for: <span className="font-medium text-foreground">{email}</span></p>
                </div>
                <div>
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative mt-1.5">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your new password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                        >
                            {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </div>
                <Button type="submit" className="mt-2 w-full" disabled={loading}>
                    {loading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting...</>
                    ) : (
                        "Reset Password"
                    )}
                </Button>
            </form>
        </CardContent>
    )
}

export default function ResetPasswordPage() {
    return (
        <div className="flex min-h-screen items-center justify-center  px-4 py-12">
            <div className="w-full max-w-md">
                <Link
                    href="/auth/login"
                    className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to sign in
                </Link>

                <Card className="card-glossy">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto mb-4 flex items-center justify-center">
                            <img src="/logo-asset-4.png" alt="DND Purchase" className="h-14 md:h-16 w-auto object-contain" />
                        </div>
                        <CardTitle className="text-2xl text-foreground font-bold tracking-tight text-metallic">Set New Password</CardTitle>
                        <CardDescription className="text-muted-foreground">
                            Enter a new password for your account.
                        </CardDescription>
                    </CardHeader>
                    <Suspense fallback={
                        <div className="flex flex-col items-center justify-center p-8 space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-muted-foreground">Loading...</p>
                        </div>
                    }>
                        <ResetPasswordForm />
                    </Suspense>
                </Card>
            </div>
        </div>
    )
}
