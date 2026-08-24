"use client"

import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Gauge,
  Globe,
  MailCheck,
  MapPin,
  Phone,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import LandingBackground from "@/components/landing/landing-background"
import LandingNav from "@/components/landing/landing-nav"
import SignupCard from "@/components/landing/signup-card"
import { isLoggedIn } from "@/lib/auth"

const FEATURES = [
  { icon: Brain, title: "AI Intent Understanding", desc: "LLM parses your query into intent, category and location." },
  { icon: MapPin, title: "Google Places Discovery", desc: "Primary discovery for location-based lead searches." },
  { icon: Search, title: "Brave Search Discovery", desc: "Secondary web discovery when Places falls short." },
  { icon: Globe, title: "Website Intelligence", desc: "Crawl and analyze business websites for signals." },
  { icon: MailCheck, title: "Email Enrichment & Verification", desc: "Find and verify business emails automatically." },
  { icon: Phone, title: "Phone Verification", desc: "Cross-check phone numbers for every candidate." },
  { icon: Gauge, title: "Lead Scoring", desc: "Evidence-weighted 0–100 score with quality thresholds." },
  { icon: Workflow, title: "Pipeline Automation", desc: "Stage moves, follow-ups and notifications on outcomes." },
]

const STATS = [
  { icon: Users, value: "5,000+", label: "Businesses" },
  { icon: CheckCircle2, value: "120K+", label: "Qualified Leads" },
  { icon: Star, value: "4.9/5", label: "Customer Rating" },
  { icon: TrendingUp, value: "98%", label: "Customer Satisfaction" },
]

export default function LandingPage() {
  const router = useRouter()

  useEffect(() => {
    if (isLoggedIn()) {
      router.replace("/dashboard")
    }
  }, [router])

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#E5ECE9] text-slate-900">
      <LandingBackground />
      <LandingNav />

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-32 sm:px-6 lg:pt-40">
        <div className="grid items-start gap-14 lg:grid-cols-2">
          <section className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#57A3AF]/50 bg-white px-4 py-1.5 text-sm font-semibold text-[#41808B] shadow-sm">
              <Sparkles className="h-4 w-4" />
              AI Powered Lead Generation Platform
            </div>

            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl xl:text-6xl">
              Turn Website Visitors Into{" "}
              <span className="gradient-text-glow">Qualified Leads</span>{" "}
              Automatically
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-slate-600">
              Capture, qualify and enrich business leads using AI, Google Places,
              Brave Search, website crawling, email verification and pipeline
              automation — all from one intelligent platform.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <a href="#signup" className="btn-gradient flex items-center gap-2 px-7 py-3.5 text-sm">
                Start Generating Leads
                <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#features" className="btn-glass px-7 py-3.5 text-sm">
                Explore Features
              </a>
            </div>

            <div id="features" className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2 scroll-mt-28">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="glass-card group flex items-start gap-3.5 p-4 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#57A3AF]/30 to-[#F46036]/15 ring-1 ring-[#57A3AF]/40">
                    <f.icon className="h-5 w-5 text-[#41808B]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{f.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="flex justify-center lg:justify-end lg:pt-6">
            <SignupCard />
          </section>
        </div>

        <section className="mt-28">
          <h2 className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
            Trusted by Growing Businesses
          </h2>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-4 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="glass-card flex flex-col items-center gap-2 p-6 text-center">
                <s.icon className="h-6 w-6 text-[#F46036]" />
                <span className="text-3xl font-bold tracking-tight text-slate-900">{s.value}</span>
                <span className="text-sm font-medium text-slate-600">{s.label}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm font-medium text-slate-600 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Loggix" className="h-5 w-auto object-contain opacity-90" />
            <span>Powered by Loggix</span>
          </div>
          <span>Google Places · Brave Search · Hunter · Website Intelligence</span>
        </div>
      </footer>
    </div>
  )
}
