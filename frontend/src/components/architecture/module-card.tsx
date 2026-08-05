"use client"

import { CheckCircle2, ChevronRight, Sparkles } from "lucide-react"
import type { ReactNode } from "react"
import type { ArchitectureModule, ModuleSection } from "@/lib/architecture-modules"

export default function ModuleCard({
  module: m,
  step,
  children,
}: {
  module: ArchitectureModule
  step: number
  children?: ReactNode
}) {
  return (
    <div
      className="glass-card group relative overflow-hidden p-6 transition-transform duration-300 hover:-translate-y-1 sm:p-8"
      style={{ borderColor: `${m.color}26` }}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-40"
        style={{ background: m.color }}
      />

      <div className="flex items-start gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
          style={{
            background: `linear-gradient(135deg, ${m.color}2e, ${m.color}0d)`,
            boxShadow: `0 0 32px ${m.color}33`,
            border: `1px solid ${m.color}55`,
          }}
        >
          <m.icon className="h-7 w-7" style={{ color: m.color, filter: `drop-shadow(0 0 8px ${m.color})` }} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold tracking-tight text-white">{m.title}</h2>
            <span
              className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-widest"
              style={{ background: `${m.color}1f`, color: m.color, border: `1px solid ${m.color}40` }}
            >
              {String(step).padStart(2, "0")}
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-[#94a3b8]">{m.description}</p>
        </div>
      </div>

      {m.flow && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {m.flow.map((f, i) => (
            <div key={f} className="flex items-center gap-2">
              <span
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-white"
                style={{ background: `${m.color}1a`, borderColor: `${m.color}40` }}
              >
                {f}
              </span>
              {m.flow && i < m.flow.length - 1 && (
                <ChevronRight className="h-4 w-4 text-[#64748b]" />
              )}
            </div>
          ))}
        </div>
      )}

      {m.sections && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {m.sections.map((s: ModuleSection) => (
            <div key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: m.color }}>
                {s.title}
              </p>
              <ul className="space-y-1.5">
                {s.items.map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: m.color }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {children}

      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {m.features.map((f) => (
          <div key={f} className="flex items-center gap-2 text-sm text-[#cbd5e1]">
            <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: m.color }} />
            {f}
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/5 pt-5">
        <span className="mr-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#64748b]">
          <Sparkles className="h-3.5 w-3.5" />
          Stack
        </span>
        {m.tech.map((t) => (
          <span
            key={t}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-[#94a3b8]"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}