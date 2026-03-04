import { useState } from "react"
import { Link, Outlet, useLocation } from "react-router-dom"
import { BarChart3, Box, LayoutDashboard, Menu, Settings, X, Eye, LogOut, UserCheck } from "lucide-react"
import { cn } from "../lib/utils"
import { ThemeToggle } from "./theme-toggle"
import { useAuth } from "../lib/auth-context"

const NAV_ITEMS = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/products", label: "Manage Products", icon: Box },
    { href: "/categories", label: "Manage Categories", icon: Menu },
    { href: "/add-details", label: "Add Details", icon: Menu },
    { href: "/view-product", label: "View Product Detail", icon: Eye },
    { href: "/verification", label: "User Verification", icon: UserCheck },
    { href: "/settings", label: "Profile & Settings", icon: Settings },
]

export function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const location = useLocation()
    const { logout } = useAuth()

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform lg:static lg:translate-x-0",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <Link to="/" className="font-bold text-xl tracking-tight text-primary">
                        DND Admin
                    </Link>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden" aria-label="Close sidebar">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <nav className="flex-1 px-3 py-4 flex flex-col h-full">
                    <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Menu
                    </div>
                    {NAV_ITEMS.map((item) => {
                        const active = location.pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors mb-1",
                                    active
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        )
                    })}

                    <div className="mt-auto pt-4 flex">
                        <button
                            onClick={logout}
                            className="w-full flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-destructive hover:bg-destructive/10"
                        >
                            <LogOut className="h-4 w-4" />
                            Log Out
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Overlay for mobile */}
            {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-card px-6 py-3">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden" aria-label="Open sidebar">
                            <Menu className="h-5 w-5 text-foreground" />
                        </button>
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            <h1 className="font-serif text-lg font-semibold text-foreground">
                                Admin Panel
                            </h1>
                        </div>
                    </div>
                    <ThemeToggle />
                </header>

                <main className="flex-1 overflow-auto p-4 md:p-6 bg-background">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
