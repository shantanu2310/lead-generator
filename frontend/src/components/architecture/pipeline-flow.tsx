"use client"

import { ArrowRight, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { PIPELINE_STAGES } from "@/lib/constants"

export default function PipelineFlow() {
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        <Sparkles className="h-3.5 w-3.5 text-[#41808B]" />
        Stage Flow
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-center gap-1.5">
          {PIPELINE_STAGES.map((s, i) => (
            <div key={s.value} className="flex items-center gap-1.5">
              <motion.div
                whileHover={{ y: -2, scale: 1.04 }}
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-800"
                style={{
                  background: `${s.color}1f`,
                  borderColor: `${s.color}55`,
                  boxShadow: `0 0 14px ${s.color}22`,
                }}
              >
                {s.label}
              </motion.div>
              {i < PIPELINE_STAGES.length - 1 && (
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}