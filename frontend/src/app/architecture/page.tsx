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
    <div className="relative min-h-screen overflow-hidden bg-[#E5ECE9] text-slate-900">
      <LandingBackground />
      <LandingNav />

      <main className="relative z-10 mx-auto max-w-4xl px-4 pb-24 pt-32 sm:px-6 lg:pt-36">
        <ScrollReveal className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#57A3AF]/50 bg-white px-4 py-1.5 text-sm font-semibold text-[#41808B] shadow-sm">
            <Zap className="h-4 w-4" />
            Enterprise Workflow
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            Loggix <span className="gradient-text-glow">Architecture</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Complete End-to-End AI Powered Lead Generation Platform
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            {INFRA_PILLS.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700"
              >
                {pill}
              </span>
            ))}
          </div>
        </ScrollReveal>

        <div className="mt-20 md:grid md:auto-rows-fr md:grid-cols-2 md:gap-x-8 md:gap-y-8">
          {ARCHITECTURE_MODULES.map((m, i) => (
            <Fragment key={m.id}>
              {i > 0 && <GlowingConnector className="md:hidden" />}
              <ScrollReveal delay={(i % 2) * 0.08} className="h-full">
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
                <h2 className="text-xl font-bold tracking-tight text-slate-900">On the Roadmap</h2>
                <p className="text-sm text-slate-500">Planned capabilities for the next evolution of Loggix</p>
              </div>
              <span className="ml-auto rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3 py-1 text-xs font-semibold text-[#f59e0b]">
                Coming soon
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {ROADMAP_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                >
                  <item.icon className="h-4 w-4 shrink-0 text-[#f59e0b]" />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </main>

      <footer className="relative z-10 border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-slate-500 sm:flex-row sm:px-6">
          <span>© 2026 Loggix — AI-powered lead generation.</span>
          <span>FastAPI · Next.js · Neon PostgreSQL · Render</span>
        </div>
      </footer>
    </div>
  )
}