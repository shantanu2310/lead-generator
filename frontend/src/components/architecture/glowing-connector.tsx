"use client"

import { ChevronDown } from "lucide-react"
import { motion } from "framer-motion"

export default function GlowingConnector({ className = "" }: { className?: string }) {
  return (
    <div className={`flex justify-center py-1 ${className}`} aria-hidden>
      <div className="flex flex-col items-center">
        <div className="relative h-12 w-px overflow-visible">
          <div className="absolute inset-0 bg-gradient-to-b from-[#7c3aed]/40 via-[#a855f7] to-[#38bdf8]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#7c3aed]/40 via-[#a855f7] to-[#38bdf8] blur-[2px]" />
          <motion.span
            className="absolute left-1/2 top-0 h-3 w-[3px] -translate-x-1/2 rounded-full bg-white"
            animate={{ top: ["-10%", "110%"], opacity: [0, 1, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <motion.div
          className="-mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#a855f7]/50 bg-[#7c3aed]/20 shadow-[0_0_20px_rgba(168,85,247,0.4)]"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="h-4 w-4 text-[#c084fc]" style={{ filter: "drop-shadow(0 0 6px #a855f7)" }} />
        </motion.div>
      </div>
    </div>
  )
}