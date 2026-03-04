"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"

import { CartProvider } from "@/lib/cart-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="dnd-purchase-theme"
      disableTransitionOnChange
    >
      <CartProvider>
        <AuthProvider>{children}</AuthProvider>
      </CartProvider>
    </ThemeProvider>
  )
}
