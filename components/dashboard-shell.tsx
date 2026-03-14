"use client"

import React from "react"

import { LogoSimple } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { cn } from "@/lib/utils"
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  ShoppingCart,
  Tag,
  User,
  X,
  BadgeCheck,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"

const BUYER_NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/inquiry/new", label: "New Inquiry", icon: FileText },
  { href: "/dashboard/inquiry/cart", label: "My Cart", icon: ShoppingCart },
  { href: "/dashboard/inquiries", label: "My Inquiries", icon: ShoppingCart },
  { href: "/dashboard/settings", label: "Profile and Settings", icon: User },
]

const SELLER_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/seller/pending", label: "New Bidding Inquiries", icon: ShoppingCart },
  { href: "/dashboard/seller/my-offers", label: "My Bidding", icon: Tag },
  { href: "/dashboard/settings", label: "Profile and Setting", icon: User },
]

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const { cart } = useCart()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/auth/login")
  }

  const isBuyer = user?.role === "buyer" || user?.role === "both"
  const isSeller = user?.role === "seller" || user?.role === "both"

  const navItems = [
    ...(isBuyer ? BUYER_NAV : []),
    ...(isSeller ? (isBuyer ? SELLER_NAV.filter((s) => !BUYER_NAV.some((b) => b.href === s.href)) : SELLER_NAV) : []),
    ...(!isBuyer && !isSeller ? [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard }] : []),
  ]

  // Deduplicate by href
  const uniqueNav = navItems.filter((item, idx, arr) => arr.findIndex((i) => i.href === item.href) === idx)

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform lg:static lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <Link href="/dashboard">
            <LogoSimple />
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden" aria-label="Close sidebar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4">
          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Navigation
          </div>
          {uniqueNav.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors justify-between",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </div>
                {item.href === "/dashboard/inquiry/cart" && cart.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {cart.length}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                {user?.name}
                {user?.verified && <BadgeCheck className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user?.role?.toUpperCase()}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-card px-4 md:px-6 py-2.5 md:py-3">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden" aria-label="Open sidebar">
              <Menu className="h-5 w-5 text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div className="flex items-center gap-1.5">
                <h1 className="font-serif text-lg font-semibold text-foreground">
                  {user?.company || user?.name || "Dashboard"}
                </h1>
                {user?.verified && <BadgeCheck className="h-5 w-5 text-blue-500" />}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div id="header-actions" className="flex items-center gap-2">
              {isBuyer && (
                <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/inquiry/cart")} className="relative h-9 w-9 rounded-full bg-background border-border">
                  <ShoppingCart className="h-4 w-4" />
                  {cart.length > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 min-w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                      {cart.length}
                    </Badge>
                  )}
                </Button>
              )}
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
