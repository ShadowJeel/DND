import { Logo, LogoSimple } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  Package,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react"
import Link from "next/link"

const FEATURES = [
  {
    icon: Shield,
    title: "Verified Suppliers",
    desc: "Every seller is verified via GST or Aadhar before they can quote.",
  },
  {
    icon: TrendingUp,
    title: "Competitive Bidding",
    desc: "Activate bidding to drive prices down and find the best deal.",
  },
  {
    icon: BarChart3,
    title: "Real-time Ranking",
    desc: "Sellers see their competitive rank, encouraging better pricing.",
  },
  {
    icon: Users,
    title: "Multi-item Inquiries",
    desc: "Bundle multiple products in a single inquiry for streamlined procurement.",
  },
]

const STEPS = [
  { step: "01", title: "Register & Verify", desc: "Create your account and complete GST or Aadhar verification." },
  { step: "02", title: "Create Inquiry", desc: "Specify materials, grades, quantities, and delivery terms." },
  { step: "03", title: "Receive Offers", desc: "Verified sellers submit competitive price quotes per ton." },
  { step: "04", title: "Finalize Deal", desc: "Compare offers, activate bidding, and accept the best quote." },
]

import { getProducts } from "@/lib/store"

export default async function LandingPage() {
  const products = await getProducts()

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/20 dark:border-white/10 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl supports-[backdrop-filter]:bg-white/40 shadow-lg shadow-black/5">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/">
            <Logo size="md" />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:text-primary dark:hover:text-primary">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:text-primary dark:hover:text-primary">How It Works</a>
            <a href="#products" className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:text-primary dark:hover:text-primary">Products</a>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm" className="bg-transparent/20">
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all">
              <Link href="/auth/register">Get Started <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-primary" />
              Trusted by 500+ verified businesses
            </div>
            <h1 className="text-balance font-serif text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl">
              Industrial Raw Materials, Precision Pricing
            </h1>
            <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
              Connect with verified buyers and sellers of Steel, Cement, TMT Rebars and more.
              Get competitive quotes through our transparent inquiry-to-offer workflow.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="gap-2 px-8 text-base">
                <Link href="/auth/register">Start as Buyer <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2 px-8 text-base bg-transparent">
                <Link href="/auth/register">Register as Seller</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative border-y border-white/10 bg-white/20 dark:bg-zinc-900/20 backdrop-blur-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
          {[
            { value: "500+", label: "Verified Sellers" },
            { value: "12K+", label: "Inquiries Processed" },
            { value: "98%", label: "Quote Response Rate" },
            { value: "24hr", label: "Avg. Quote Time" },
          ].map((stat) => (
            <div key={stat.label} className="group flex flex-col items-center justify-center rounded-2xl p-6 transition-all duration-300 hover:bg-white/40 dark:hover:bg-zinc-800/40 hover:shadow-xl hover:-translate-y-1 hover:shadow-primary/10">
              <div className="font-serif text-4xl font-bold text-primary transition-transform duration-300 group-hover:scale-110">{stat.value}</div>
              <div className="mt-2 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative mx-auto max-w-7xl px-6 py-24 overflow-hidden">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm text-primary mb-6 ring-1 ring-inset ring-primary/10">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
            Why Choose Us
          </div>
          <h2 className="text-balance font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Built for Industrial Procurement
          </h2>
          <p className="mt-6 text-pretty text-lg text-muted-foreground leading-relaxed">
            Every feature is designed to bring transparency and efficiency to B2B raw material sourcing.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="group relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/5 bg-white/40 dark:bg-zinc-900/40 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/20 dark:hover:shadow-primary/10 hover:border-primary/30">
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/5 dark:from-white/10 dark:to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="relative z-10">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-inner ring-1 ring-white/20 dark:ring-white/10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <f.icon className="h-7 w-7 transition-colors group-hover:text-primary drop-shadow-sm" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-foreground tracking-tight mb-3 group-hover:text-primary transition-colors">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground group-hover:text-foreground/80 transition-colors">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="relative border-y border-white/10 bg-white/20 dark:bg-zinc-900/20 backdrop-blur-lg">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 py-24">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-balance font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              How It Works
            </h2>
            <p className="mt-6 text-pretty text-lg text-muted-foreground leading-relaxed">
              From registration to deal finalization in four simple steps.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.step} className="group relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/5 bg-white/40 dark:bg-zinc-900/40 p-8 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/20 dark:hover:shadow-primary/10 hover:border-primary/30">
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/5 dark:from-white/10 dark:to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative z-10">
                  <div className="mb-6 font-serif text-5xl font-extrabold text-primary/10 transition-colors duration-300 group-hover:text-primary/20">{s.step}</div>
                  <h3 className="font-serif text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground group-hover:text-foreground/80 transition-colors">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="products" className="relative mx-auto max-w-7xl px-6 py-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
        <div className="mx-auto mb-20 max-w-2xl text-center">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm text-primary mb-6 ring-1 ring-inset ring-primary/10">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
            Available Now
          </div>
          <h2 className="text-balance font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Product Categories
          </h2>
          <p className="mt-6 text-pretty text-lg text-muted-foreground leading-relaxed">
            Source from a comprehensive catalog of high-quality industrial raw materials, directly from verified manufacturers.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <div
              key={p.id}
              className="group relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/5 bg-white/40 dark:bg-zinc-900/40 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/20 dark:hover:shadow-primary/10 hover:border-primary/30"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/5 dark:from-white/10 dark:to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="relative flex flex-col h-full z-10">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-inner ring-1 ring-white/20 dark:ring-white/10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <Package className="h-7 w-7 transition-colors group-hover:text-primary drop-shadow-sm" />
                </div>

                <h3 className="text-xl font-semibold text-foreground tracking-tight mb-2 group-hover:text-primary transition-colors">
                  {p.name}
                </h3>

                <div className="mt-auto pt-6 flex items-center text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                  <span>Explore category</span>
                  <ArrowRight className="ml-2 h-4 w-4 translate-x-0 transition-transform duration-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-primary">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <h2 className="text-balance font-serif text-3xl font-bold text-primary-foreground md:text-4xl">
            Ready to Transform Your Procurement?
          </h2>
          <p className="mt-4 text-primary-foreground/80">
            Join hundreds of verified businesses already sourcing smarter.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-8 gap-2 px-8 text-base shadow-xl shadow-black/10 transition-transform hover:scale-105 active:scale-95">
            <Link href="/auth/register">Create Free Account <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div>
            <LogoSimple />
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} DND Purchase. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
