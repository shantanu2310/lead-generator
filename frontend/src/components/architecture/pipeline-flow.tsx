"use client"

import { ArrowRight, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { PIPELINE_STAGES } from "@/lib/constants"

export default function PipelineFlow() {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
        <Sparkles className="h-3.5 w-3.5 text-[#ec4899]" />
        Stage Flow
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-center gap-1.5">
          {PIPELINE_STAGES.map((s, i) => (
            <div key={s.value} className="flex items-center gap-1.5">
              <motion.div
                whileHover={{ y: -2, scale: 1.04 }}
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-white"
                style={{
                  background: `${s.color}1f`,
                  borderColor: `${s.color}55`,
                  boxShadow: `0 0 14px ${s.color}22`,
                }}
              >
                {s.label}
              </motion.div>
              {i < PIPELINE_STAGES.length - 1 && (
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#64748b]" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}