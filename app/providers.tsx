"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import { SWRConfig } from "swr"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      forcedTheme="dark"
      enableSystem={false}
      storageKey="dnd-purchase-theme"
      disableTransitionOnChange
    >
      <AuthProvider>
        <SWRConfig
          value={{
            revalidateOnFocus: false,
            dedupingInterval: 60000,
            keepPreviousData: true
          }}
        >
          {children}
        </SWRConfig>
      </AuthProvider>
    </ThemeProvider>
  )
}
