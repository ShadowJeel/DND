"use client"

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
import { motion, useScroll, useTransform } from "framer-motion"
import { FloatingElements } from "@/components/floating-elements"
import { TiltCard } from "@/components/tilt-card"
import { getProducts } from "@/lib/store"
import { useEffect, useState, useRef } from "react"

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

export default function LandingPage() {
  const [products, setProducts] = useState<any[]>([])
  const heroRef = useRef(null)

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  })

  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  useEffect(() => {
    getProducts().then(setProducts)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-primary/10 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/40 shadow-xl transition-all duration-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            whileHover={{ scale: 1.05, rotate: 2 }}
          >
            <Link href="/">
              <Logo size="md" />
            </Link>
          </motion.div>
          <nav className="hidden items-center gap-8 md:flex">
            {["features", "how-it-works", "products"].map((item, i) => (
              <motion.a
                key={item}
                href={`#${item}`}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 * i, duration: 0.5 }}
                className="text-sm font-medium text-muted-foreground transition-all hover:text-primary relative group"
              >
                {item.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
              </motion.a>
            ))}
          </nav>
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <ThemeToggle />
            <Button asChild variant="outline" size="sm" className="bg-transparent/20 border-primary/20 hover:bg-primary/5 transition-all">
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all active:scale-95">
              <Link href="/auth/register">Get Started <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </motion.div>
        </div>
        <motion.div
          className="h-1 bg-gradient-to-r from-primary to-primary-foreground origin-left"
          style={{ scaleX: scrollYProgress }}
        />
      </header>

      {/* Hero */}
      <section ref={heroRef} className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.03)_1px,transparent_1px)] bg-[size:6rem_6rem]" />
        <FloatingElements />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative mx-auto max-w-7xl px-6 py-24 md:py-36 w-full"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mx-auto max-w-3xl text-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground"
            >
              <CheckCircle className="h-4 w-4 text-primary" />
              Trusted by 500+ verified businesses
            </motion.div>
            <h1 className="text-balance font-serif text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl">
              Industrial Raw Materials, <br />
              <span className="text-primary italic">Precision Pricing</span>
            </h1>
            <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
              Connect with verified buyers and sellers of Steel, Cement, TMT Rebars and more.
              Get competitive quotes through our transparent inquiry-to-offer workflow.
            </p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Button asChild size="lg" className="gap-2 px-8 text-base group relative overflow-hidden">
                <Link href="/auth/register" className="relative z-10">
                  Start as Buyer <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2 px-8 text-base bg-transparent hover:bg-primary/5 transition-all active:scale-95">
                <Link href="/auth/register">Register as Seller</Link>
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="relative mx-auto max-w-7xl px-6 py-24 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mx-auto mb-16 max-w-2xl text-center"
        >
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
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <TiltCard className="h-full">
                <div className="group relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/5 bg-white/40 dark:bg-zinc-900/40 p-6 backdrop-blur-xl transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 dark:hover:shadow-primary/10 hover:border-primary/30 h-full">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/5 dark:from-white/10 dark:to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  <div className="relative z-10">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-inner ring-1 ring-white/20 dark:ring-white/10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                      <f.icon className="h-7 w-7 transition-colors group-hover:text-primary drop-shadow-sm" />
                    </div>
                    <h3 className="font-serif text-xl font-semibold text-foreground tracking-tight mb-3 group-hover:text-primary transition-colors">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground group-hover:text-foreground/80 transition-colors">{f.desc}</p>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="relative border-y border-white/10 bg-white/20 dark:bg-zinc-900/20 backdrop-blur-lg">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 py-24">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mx-auto mb-16 max-w-2xl text-center"
          >
            <h2 className="text-balance font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              How It Works
            </h2>
            <p className="mt-6 text-pretty text-lg text-muted-foreground leading-relaxed">
              From registration to deal finalization in four simple steps.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="group relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/5 bg-white/40 dark:bg-zinc-900/40 p-8 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/20 dark:hover:shadow-primary/10 hover:border-primary/30"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/5 dark:from-white/10 dark:to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative z-10">
                  <div className="mb-6 font-serif text-5xl font-extrabold text-primary/10 transition-colors duration-300 group-hover:text-primary/20">{s.step}</div>
                  <h3 className="font-serif text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground group-hover:text-foreground/80 transition-colors">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="products" className="relative mx-auto max-w-7xl px-6 py-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mx-auto mb-20 max-w-2xl text-center"
        >
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
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <Link href="/auth/login">
                <div className="group relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/5 bg-white/40 dark:bg-zinc-900/40 p-6 backdrop-blur-xl transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 dark:hover:shadow-primary/10 hover:border-primary/30 h-full">
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
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-border bg-primary overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none"
        />
        <div className="mx-auto max-w-7xl px-6 py-20 text-center relative z-10">
          <motion.h2
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-balance font-serif text-3xl font-bold text-primary-foreground md:text-4xl"
          >
            Ready to Transform Your Procurement?
          </motion.h2>
          <p className="mt-4 text-primary-foreground/80">
            Join hundreds of verified businesses already sourcing smarter.
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button asChild size="lg" variant="secondary" className="mt-8 gap-2 px-8 text-base shadow-xl shadow-black/10 transition-all hover:shadow-primary-foreground/20">
              <Link href="/auth/register">Create Free Account <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 2 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <LogoSimple />
          </motion.div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} DND Purchase. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
