"use client"

import { Fragment } from "react"
import { Sparkles, Zap } from "lucide-react"
import GlowingConnector from "@/components/architecture/glowing-connector"
import MiniCharts from "@/components/architecture/mini-charts"
import ModuleCard from "@/components/architecture/module-card"
import PipelineFlow from "@/components/architecture/pipeline-flow"
import ScoreRing from "@/components/architecture/score-ring"
import ScrollReveal from "@/components/architecture/scroll-reveal"
import LandingBackground from "@/components/landing/landing-background"
import LandingNav from "@/components/landing/landing-nav"
import { ARCHITECTURE_MODULES, INFRA_PILLS, ROADMAP_ITEMS } from "@/lib/architecture-modules"

export default function ArchitecturePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      <LandingBackground />
      <LandingNav />

      <main className="relative z-10 mx-auto max-w-4xl px-4 pb-24 pt-32 sm:px-6 lg:pt-36">
        <ScrollReveal className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#a855f7]/30 bg-[#a855f7]/10 px-4 py-1.5 text-sm font-medium text-[#c084fc]">
            <Zap className="h-4 w-4" />
            Enterprise Workflow
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            LeadGen AI <span className="gradient-text-glow">Architecture</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#94a3b8]">
            Complete End-to-End AI Powered Lead Generation Platform
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            {INFRA_PILLS.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-semibold text-[#cbd5e1] backdrop-blur-md"
              >
                {pill}
              </span>
            ))}
          </div>
        </ScrollReveal>

        <div className="mt-20 md:grid md:grid-cols-2 md:gap-x-8">
          {ARCHITECTURE_MODULES.map((m, i) => (
            <Fragment key={m.id}>
              {i > 0 && <GlowingConnector className="md:hidden" />}
              <ScrollReveal delay={(i % 2) * 0.08}>
                <ModuleCard module={m} step={i + 1}>
                  {m.id === "scoring" && <ScoreRing />}
                  {m.id === "crm" && <PipelineFlow />}
                  {m.id === "analytics" && <MiniCharts />}
                </ModuleCard>
              </ScrollReveal>
            </Fragment>
          ))}
        </div>

        <ScrollReveal className="mt-20">
          <div className="glass-card p-6 sm:p-8">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 shadow-[0_0_24px_rgba(245,158,11,0.2)]">
                <Sparkles className="h-5 w-5 text-[#f59e0b]" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">On the Roadmap</h2>
                <p className="text-sm text-[#94a3b8]">Planned capabilities for the next evolution of LeadGen AI</p>
              </div>
              <span className="ml-auto rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3 py-1 text-xs font-semibold text-[#f59e0b]">
                Coming soon
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {ROADMAP_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-[#cbd5e1]"
                >
                  <item.icon className="h-4 w-4 shrink-0 text-[#f59e0b]" />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-[#64748b] sm:flex-row sm:px-6">
          <span>© 2026 LeadGen AI — AI-powered lead generation.</span>
          <span>FastAPI · Next.js · Neon PostgreSQL · Render</span>
        </div>
      </footer>
    </div>
  )
}