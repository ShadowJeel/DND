import { Shield, Key, Info } from "lucide-react"

export function Settings() {
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || "admin@example.com";

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Profile & Settings</h2>
                <p className="text-muted-foreground mt-1">Manage your admin account settings and preferences.</p>
            </div>

            <div className="grid gap-6">
                {/* Notice */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 flex gap-3 text-blue-800">
                    <Info className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-medium">Environment Configured</p>
                        <p>Your authentication credentials are securely managed via environment variables. Editing via the UI is disabled.</p>
                    </div>
                </div>

                {/* Profile Section */}
                <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6">
                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xl font-bold text-primary">AD</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">Super Admin</h3>
                            <p className="text-sm text-muted-foreground">{adminEmail}</p>
                        </div>
                    </div>

                    <div className="space-y-4 max-w-xl opacity-70 cursor-not-allowed">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium leading-none">
                                Display Name
                            </label>
                            <input
                                className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm disabled:cursor-not-allowed"
                                value="Super Admin"
                                disabled
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium leading-none">
                                Email
                            </label>
                            <input
                                className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm disabled:cursor-not-allowed"
                                value={adminEmail}
                                type="email"
                                disabled
                            />
                        </div>
                    </div>
                </div>

                {/* Security Section */}
                <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 opacity-70">
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                        <Shield className="h-5 w-5 text-primary" /> Security
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-accent/30 opacity-70 cursor-not-allowed">
                            <div className="flex items-center gap-3">
                                <Key className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">Password</p>
                                    <p className="text-sm text-muted-foreground">Managed via server configuration (.env)</p>
                                </div>
                            </div>
                            <button className="text-sm font-medium text-muted-foreground cursor-not-allowed text-left focus:outline-none" disabled>Locked</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
