"use client"

import React from "react"

import { useAuth } from "@/lib/auth-context"
import { DashboardShell } from "@/components/dashboard-shell"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
    }
  }, [user, router])

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    )
  }

  return <DashboardShell>{children}</DashboardShell>
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardGuard>{children}</DashboardGuard>
}
