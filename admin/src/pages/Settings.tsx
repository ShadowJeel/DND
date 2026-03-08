import { Shield, Key, Info, Database, Activity, Terminal } from "lucide-react"
import { testFirestoreGet, testFirestorePost } from "../lib/firebase"
import { useState } from "react"

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

                {/* Diagnostics Section */}
                <Diagnostics />
            </div>
        </div>
    )
}

function Diagnostics() {
    const [status, setStatus] = useState<string>('Ready');
    const [isTesting, setIsTesting] = useState(false);

    const runTest = async (type: 'get' | 'post') => {
        setIsTesting(true);
        setStatus(`Running ${type.toUpperCase()} test...`);

        try {
            const result = type === 'get' ? await testFirestoreGet() : await testFirestorePost();
            if (result.success) {
                setStatus(`${type.toUpperCase()} Success! (${result.duration}ms). Check console for details.`);
            } else {
                setStatus(`${type.toUpperCase()} Failed! Error: ${result.error?.message || 'Unknown error'}. Check console for full trace.`);
            }
        } catch (err: any) {
            setStatus(`Unexpected Code Error: ${err.message}`);
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-primary" /> Database Diagnostics
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
                Use these tools to verify if errors are coming from the database connection (permissions/network) or application code.
            </p>

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => runTest('get')}
                        disabled={isTesting}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border bg-background hover:bg-accent transition-colors disabled:opacity-50"
                    >
                        <Database className="h-4 w-4" />
                        Test Read (GET)
                    </button>
                    <button
                        onClick={() => runTest('post')}
                        disabled={isTesting}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border bg-background hover:bg-accent transition-colors disabled:opacity-50"
                    >
                        <Terminal className="h-4 w-4" />
                        Test Write (POST)
                    </button>
                </div>

                <div className={`p-4 rounded-lg border flex items-center gap-3 ${status.includes('Failed') ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-muted/50 border-border text-muted-foreground'}`}>
                    <div className={`h-2 w-2 rounded-full ${isTesting ? 'bg-amber-500 animate-pulse' : status.includes('Success') ? 'bg-emerald-500' : status.includes('Failed') ? 'bg-destructive' : 'bg-muted-foreground'}`} />
                    <span className="text-sm font-medium">{status}</span>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                    Detailed technical logs and error stack traces are printed to the <b>Browser Console (F12)</b>.
                </p>
            </div>
        </div>
    );
}
