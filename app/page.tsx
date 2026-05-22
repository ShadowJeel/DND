"use client"

import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  Package,
  Shield,
  TrendingUp,
  Users,
  BellOff,
  VolumeX,
  Menu,
  X,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion"
import { getProducts } from "@/lib/store"
import { useEffect, useState, useRef } from "react"



export default function LandingPage() {
  const [products, setProducts] = useState<any[]>([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const heroRef = useRef(null)

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  })

  useEffect(() => {
    getProducts().then(setProducts)
  }, [])

  // CSS variable helpers — keeps JSX clean
  const v = (name: string) => `var(--lp-${name})`

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: v('bg'), color: v('text') }}>
      {/* Textured background — only visible in dark mode */}
      <div
        className="fixed inset-0 z-0 opacity-0 dark:opacity-100 transition-opacity duration-500"
        style={{
          backgroundImage: 'url(/dark-texture-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* Overlay */}
      <div className="fixed inset-0 z-0" style={{ backgroundColor: v('overlay') }} />

      {/* Light mode subtle texture */}
      <div
        className="fixed inset-0 z-0 dark:opacity-0 transition-opacity duration-500"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(220,38,38,0.04), transparent 70%)',
        }}
      />

      {/* ─── Header ─── */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-2xl shadow-xl transition-all duration-300"
        style={{ borderColor: v('border'), backgroundColor: v('bg-alt') }}
      >
        <div className="flex items-center justify-between px-4 py-3 md:px-8 md:py-4">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            whileHover={{ scale: 1.05 }}
          >
            <Link href="/" className="flex items-center gap-2 md:gap-3">
              <img src="/logo-asset-4.png" alt="DND Purchase" className="h-14 md:h-16 w-auto object-contain" />
            </Link>
          </motion.div>

          <nav className="hidden items-center gap-8 md:flex">
            {["how-it-works", "products"].map((item, i) => (
              <motion.a
                key={item}
                href={`#${item}`}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 * i, duration: 0.5 }}
                className="lp-nav-link text-base sm:text-lg font-medium transition-all relative group"
                style={{ color: v('text') }}
              >
                {item.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 transition-all group-hover:w-full" style={{ backgroundColor: v('accent') }} />
              </motion.a>
            ))}
          </nav>

          {/* Desktop actions */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="hidden md:flex items-center gap-3"
          >
            <Button asChild variant="outline" size="sm" className="text-base sm:text-lg transition-all hover:opacity-80" style={{ backgroundColor: 'transparent', borderColor: v('outline-btn-border'), color: v('outline-btn-text') }}>
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="text-base sm:text-lg shadow-lg hover:-translate-y-0.5 transition-all active:scale-95 font-semibold" style={{ backgroundColor: v('accent'), color: v('cta-text'), boxShadow: `0 4px 20px ${v('accent-glow-strong')}` }}>
              <Link href="/auth/register">Get Started <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </motion.div>

          {/* Mobile actions */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: v('heading') }}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden md:hidden"
              style={{ borderTop: `1px solid ${v('border')}` }}
            >
              <div className="px-4 py-4 flex flex-col gap-3">
                {["how-it-works", "products"].map((item) => (
                  <a
                    key={item}
                    href={`#${item}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-medium py-2 px-3 rounded-lg transition-colors"
                    style={{ color: v('text') }}
                  >
                    {item.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </a>
                ))}
                <div className="flex flex-col gap-2 pt-2" style={{ borderTop: `1px solid ${v('border')}` }}>
                  <Button asChild variant="outline" size="sm" className="w-full transition-all" style={{ backgroundColor: 'transparent', borderColor: v('outline-btn-border'), color: v('outline-btn-text') }}>
                    <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
                  </Button>
                  <Button asChild size="sm" className="w-full shadow-lg transition-all font-semibold" style={{ backgroundColor: v('accent'), color: v('cta-text'), boxShadow: `0 4px 20px ${v('accent-glow-strong')}` }}>
                    <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)}>Get Started <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="h-1 origin-left"
          style={{ scaleX: scrollYProgress, background: v('scroll-bar') }}
        />
      </header>

      {/* ─── Hero ─── */}
      <section ref={heroRef} className="relative min-h-[90vh] flex items-center overflow-hidden z-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to right, ${v('grid-line')} 1px, transparent 1px), linear-gradient(to bottom, ${v('grid-line')} 1px, transparent 1px)`,
          backgroundSize: '6rem 6rem',
        }} />


        <motion.div className="relative w-full px-4 md:px-8 py-6 md:py-10">
          {/* Centered Logo Design Image & Trust Badge */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="mb-12 flex flex-col items-center w-full select-none text-center relative"
          >
            {/* Ambient Background Glow matching the red in the logo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[200px] sm:w-[500px] sm:h-[300px] md:w-[600px] md:h-[350px] bg-red-600/10 rounded-full blur-[80px] pointer-events-none -z-10 animate-pulse duration-[6000ms]" />

            <div className="relative mb-8 transition-transform duration-500 hover:scale-[1.02]">
              <Image
                src="/logo-asset-4.png"
                alt="DND Purchase - Best Price, No Calls"
                width={700}
                height={376}
                className="w-full max-w-[320px] sm:max-w-[420px] md:max-w-[560px] lg:max-w-[650px] h-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]"
                priority
              />
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 1.0 }}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm sm:text-base font-semibold shadow-2xl border backdrop-blur-md shadow-red-500/5 transition-all hover:border-red-500/30"
              style={{ border: `1px solid ${v('badge-border')}`, backgroundColor: v('badge-bg'), color: v('accent') }}
            >
              <CheckCircle className="h-5 w-5 animate-pulse text-red-500" />
              Trusted by 500+ verified businesses
            </motion.div>
          </motion.div>

          {/* 2-column grid: left = headline/CTA, right = feature cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

            {/* ── LEFT COLUMN: Headline + CTA ── */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="text-left lg:col-span-8 ml-4 lg:ml-8"
            >
              {/* H1 */}
              <h1 className="font-black leading-none tracking-tight text-5xl sm:text-6xl md:text-7xl xl:text-8xl" style={{ color: v('heading') }}>
                <span className="opacity-75 text-2xl sm:text-3xl md:text-4xl lg:text-5xl block font-bold tracking-wide uppercase mb-3 text-metallic-muted">Buy & Sell</span>
                <span className="text-metallic">Steel & Cement</span><br />
                <span className="text-xl sm:text-2xl md:text-3xl font-medium opacity-65 block mt-4 tracking-normal">in just 2-step process</span>
              </h1>

              {/* Simple · Efficient · Transparent */}
              <p className="mt-6 text-base sm:text-lg md:text-xl font-bold tracking-[0.3em] uppercase opacity-55 text-metallic-muted">
                Simple <span className="mx-2 text-red-500">•</span> Efficient <span className="mx-2 text-red-500">•</span> Transparent
              </p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0, duration: 1.5, ease: "easeOut" }}
                className="mt-8 flex flex-wrap items-center gap-4 ml-2 sm:ml-3"
              >
                <Button asChild size="lg" className="h-14 gap-2 px-10 text-lg sm:text-xl group relative overflow-hidden font-bold transition-all hover:scale-105 active:scale-95 rounded-xl shadow-2xl shadow-red-500/20" style={{ backgroundColor: v('accent'), color: '#FFFFFF' }}>
                  <Link href="/auth/register" className="relative z-10 flex items-center gap-2">
                    Create new account <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button asChild size="lg" className="h-14 gap-2 px-10 text-lg sm:text-xl border border-white/10 bg-neutral-900/60 backdrop-blur-md transition-all hover:bg-neutral-800/80 hover:border-white/25 active:scale-95 font-bold rounded-xl shadow-xl" style={{ color: '#FFFFFF' }}>
                  <Link href="/auth/login">Sign In</Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* ── RIGHT COLUMN: Feature Cards ── */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 1.5, ease: "easeOut" }}
              className="flex flex-col gap-5 lg:col-span-4"
            >
              {/* No-hassle list card */}
              <div className="flex flex-col gap-4 p-7 rounded-2xl card-glossy shadow-2xl">
                <p className="text-sm font-bold tracking-wider opacity-65 text-metallic" style={{ textAlign: 'center' }}>Why DND Purchase?</p>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Left Column - Red Points */}
                  <div className="flex flex-col gap-4">
                    {[
                      'No Phone Calls',
                      'No Follow-ups',
                      'No Disturbance',
                      'No Waste of Time',
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2.5 text-red-500">
                        <X className="h-4 w-4 shrink-0 stroke-[3]" />
                        <span className="text-base sm:text-lg font-semibold" style={{ color: v('text') }}>{item}</span>
                      </div>
                    ))}
                  </div>

                  {/* Right Column - Green Points */}
                  <div className="flex flex-col gap-4">
                    {[
                      'Best Pricing',
                      'Save Time',
                      'Peace of Mind',
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2.5 text-green-500">
                        <CheckCircle className="h-4 w-4 shrink-0 stroke-[3]" />
                        <span className="text-base sm:text-lg font-semibold" style={{ color: v('text') }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Verified Sellers', value: '100+' },
                  { label: 'Categories', value: '9' },
                  { label: 'Avg. Saving', value: '5%' },
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col items-center p-4 rounded-xl card-glossy text-center shadow-xl">
                    <span className="text-2xl font-black text-glow-red">{stat.value}</span>
                    <span className="text-xs font-semibold opacity-60 mt-1" style={{ color: v('text') }}>{stat.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

          </div>
        </motion.div>
      </section>



      {/* ─── How it Works ─── */}
      <section id="how-it-works" className="relative z-10" style={{ borderTop: `1px solid ${v('border')}`, borderBottom: `1px solid ${v('border')}`, backgroundColor: v('surface') }}>
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at bottom, ${v('accent-glow')}, transparent, transparent)` }} />
        <div className="relative mx-auto max-w-7xl px-6 py-24">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="mx-auto mb-16 max-w-2xl text-center"
          >
            <h2 className="text-balance text-4xl font-extrabold tracking-tight md:text-5xl text-metallic">
              How it works?
            </h2>
            <p className="mt-4 text-pretty text-2xl font-bold uppercase tracking-wider text-glow-red">
              Just 2 steps...
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 1.5, ease: "easeOut" }}
              className="group relative overflow-hidden rounded-2xl p-8 card-glossy transition-all duration-300 hover:-translate-y-1.5 shadow-2xl"
            >
              <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" style={{ background: `linear-gradient(to bottom right, ${v('surface-hover')}, transparent)` }} />
              <div className="relative z-10">
                <h3 className="text-3xl font-extrabold mb-6 transition-colors text-metallic">For Buyer:</h3>
                <div className="space-y-5" style={{ color: v('text') }}>
                  <div className="flex gap-4">
                    <span className="font-black text-xl text-glow-red">1.</span>
                    <p className="text-lg leading-relaxed font-medium">Send Inquiry to get Offers from Sellers</p>
                  </div>
                  <div className="flex gap-4">
                    <span className="font-black text-xl text-glow-red">2.</span>
                    <p className="text-lg leading-relaxed font-medium">Start Bidding to get Best Prices from Sellers <br /> <span className="text-sm opacity-60 font-normal">(No manual phone negotiations required)</span></p>
                  </div>
                  <div className="flex gap-4 items-center text-green-500 font-semibold pt-4">
                    <CheckCircle className="h-6 w-6 stroke-[3]" /> <span className="text-lg uppercase tracking-wide">Done</span>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 1.5, ease: "easeOut" }}
              className="group relative overflow-hidden rounded-2xl p-8 card-glossy transition-all duration-300 hover:-translate-y-1.5 shadow-2xl"
            >
              <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" style={{ background: `linear-gradient(to bottom right, ${v('surface-hover')}, transparent)` }} />
              <div className="relative z-10">
                <h3 className="text-3xl font-extrabold mb-6 transition-colors text-metallic">For Seller:</h3>
                <div className="space-y-5" style={{ color: v('text') }}>
                  <div className="flex gap-4">
                    <span className="font-black text-xl text-glow-red">1.</span>
                    <p className="text-lg leading-relaxed font-medium">Send Offer to each Inquiry</p>
                  </div>
                  <div className="flex gap-4">
                    <span className="font-black text-xl text-glow-red">2.</span>
                    <p className="text-lg leading-relaxed font-medium">Participate in Bidding to give Best Price <br /> <span className="text-sm opacity-60 font-normal">(No manual phone negotiations required)</span></p>
                  </div>
                  <div className="flex gap-4 items-center text-green-500 font-semibold pt-4">
                    <CheckCircle className="h-6 w-6 stroke-[3]" /> <span className="text-lg uppercase tracking-wide">Done</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Products ─── */}
      <section id="products" className="relative mx-auto max-w-7xl px-6 py-32 overflow-hidden z-10">
        <div className="absolute inset-0 -z-10" style={{ background: `radial-gradient(ellipse at top, ${v('accent-glow')}, transparent, transparent)` }} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="mx-auto mb-20 max-w-2xl text-center"
        >
          <div className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold mb-6 shadow-sm shadow-red-500/5" style={{ border: `1px solid ${v('badge-border')}`, backgroundColor: v('badge-bg'), color: v('accent') }}>
            <span className="flex h-2.5 w-2.5 rounded-full mr-2 animate-pulse" style={{ backgroundColor: v('accent') }} />
            Available Now
          </div>
          <h2 className="text-balance text-4xl font-extrabold tracking-tight md:text-5xl text-metallic">
            Product Categories
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed font-medium" style={{ color: v('text-muted') }}>
            Source prime-quality Steel and Cement from verified Sellers
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 1.5, ease: "easeOut" }}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <Link href="/auth/login">
                <div className="group relative flex flex-col overflow-hidden rounded-2xl card-glossy h-full shadow-lg" style={{ border: `1px solid ${v('border')}` }}>
                  <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" style={{ background: `linear-gradient(to bottom right, ${v('surface-hover')}, transparent)` }} />

                  {/* Top Image Section */}
                  <div className="aspect-[4/3] relative flex items-center justify-center overflow-hidden bg-black/40 border-b border-white/5">
                    {p.image_url ? (
                      <Image
                        src={p.image_url}
                        alt={p.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-contain p-6 group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" style={{ background: v('icon-bg'), color: v('accent') }}>
                        <Package className="h-8 w-8 drop-shadow-sm" />
                      </div>
                    )}
                  </div>

                  {/* Bottom Text Section */}
                  <div className="relative flex flex-col flex-1 p-6 z-10">
                    <h3 className="text-xl font-semibold tracking-tight mb-2 transition-colors line-clamp-2" style={{ color: v('heading') }}>
                      {p.name}
                    </h3>
                    <div className="mt-auto pt-4 flex items-center text-sm font-medium transition-colors" style={{ color: v('accent') }}>
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

      {/* ─── CTA ─── */}
      <section className="relative overflow-hidden z-10" style={{ borderTop: `1px solid ${v('border')}`, background: v('cta-section-bg') }}>
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ background: 'radial-gradient(circle at center, rgba(255,255,255,0.15), transparent, transparent)' }}
        />
        <div className="mx-auto max-w-7xl px-6 py-20 text-center relative z-10">
          <motion.h2
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="text-balance text-4xl font-extrabold md:text-5xl text-metallic"
          >
            Ready to Transform Your Procurement?
          </motion.h2>
          <p className="mt-4 text-lg font-medium text-metallic-muted">
            Join hundreds of verified businesses already sourcing smarter.
          </p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button asChild size="lg" className="mt-8 gap-2 px-8 text-base shadow-2xl transition-all font-bold rounded-xl shadow-red-500/10" style={{ backgroundColor: v('cta-btn-bg'), color: v('cta-btn-text') }}>
              <Link href="/auth/register">Create Free Account <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="z-10 relative" style={{ borderTop: `1px solid ${v('border')}`, backgroundColor: v('footer-bg') }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/logo-asset-4.png" alt="DND Purchase" className="h-14 w-auto object-contain" />
            </Link>
          </motion.div>
          <p className="text-sm" style={{ color: v('text-muted') }}>
            &copy; {new Date().getFullYear()} DND Purchase. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
