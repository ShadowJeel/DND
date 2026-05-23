import React from "react"
import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { Toaster } from 'sonner'

import { Providers } from "./providers"
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' })

export const metadata: Metadata = {
  title: "DnD Purchase - Do Not Disturb B2B Marketplace",
  description:
    "Buy and sell industrial raw materials like Steel and Cement without annoying phone calls or follow-ups. A true Do Not Disturb (DnD) marketplace.",
  keywords: [
    "dnd",
    "dnd purchase",
    "do not disturb purchase",
    "do not disturb marketplace",
    "b2b marketplace",
    "buy steel",
    "buy cement",
    "industrial raw materials",
  ],
  metadataBase: new URL("https://dndpurchase.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "DnD Purchase - Do Not Disturb B2B Marketplace",
    description: "Buy and sell industrial raw materials like Steel and Cement without annoying phone calls or follow-ups. A true Do Not Disturb (DnD) marketplace.",
    url: "https://dndpurchase.com",
    siteName: "DnD Purchase",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DnD Purchase - Do Not Disturb B2B Marketplace",
    description: "Buy and sell industrial raw materials like Steel and Cement without annoying phone calls or follow-ups. A true Do Not Disturb (DnD) marketplace.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased min-h-screen bg-background`}
      >
        <Providers>{children}</Providers>
        <Toaster position="top-right" richColors />
      </body>
    </html>


  )
}
