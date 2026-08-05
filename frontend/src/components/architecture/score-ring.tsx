"use client"

import { motion } from "framer-motion"
import { CheckCircle2 } from "lucide-react"

const SIGNALS = [
  "Business Status",
  "Website Quality",
  "Verification Score",
  "Category Match",
  "Evidence Weight",
  "AI Confidence",
]

export default function ScoreRing() {
  const size = 176
  const stroke = 12
  const score = 87
  const threshold = 30
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r

  return (
    <div className="mt-6 rounded-2xl border border-[#7c3aed]/30 bg-[#7c3aed]/[0.06] p-5">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={stroke}
            />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="#a855f7"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              initial={{ strokeDashoffset: c }}
              whileInView={{ strokeDashoffset: c * (1 - score / 100) }}
              viewport={{ once: true }}
              transition={{ duration: 1.6, ease: "easeOut" }}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ filter: "drop-shadow(0 0 10px rgba(168,85,247,0.7))" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold text-white" style={{ textShadow: "0 0 24px rgba(168,85,247,0.6)" }}>
              {score}
            </span>
            <span className="text-xs text-[#94a3b8]">/ 100</span>
          </div>
        </div>

        <div className="w-full min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#22c55e]/40 bg-[#22c55e]/10 px-3 py-1 text-xs font-semibold text-[#22c55e]">
              Qualified
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[#94a3b8]">
              Passes at ≥ {threshold} points
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SIGNALS.map((s) => (
              <div key={s} className="flex items-center gap-2 text-xs text-[#cbd5e1]">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#a855f7]" />
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}