"use client"

import { ChevronDown } from "lucide-react"
import { motion } from "framer-motion"

export default function GlowingConnector({ className = "" }: { className?: string }) {
  return (
    <div className={`flex justify-center py-1 ${className}`} aria-hidden>
      <div className="flex flex-col items-center">
        <div className="relative h-12 w-px overflow-visible">
          <div className="absolute inset-0 bg-gradient-to-b from-[#57A3AF]/40 via-[#F46036] to-[#41808B]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#57A3AF]/40 via-[#F46036] to-[#41808B] blur-[2px]" />
          <motion.span
            className="absolute left-1/2 top-0 h-3 w-[3px] -translate-x-1/2 rounded-full bg-[#41808B]"
            animate={{ top: ["-10%", "110%"], opacity: [0, 1, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <motion.div
          className="-mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#F46036]/50 bg-[#F46036]/15 shadow-[0_0_20px_rgba(244,96,54,0.4)]"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="h-4 w-4 text-[#F46036]" style={{ filter: "drop-shadow(0 0 6px #F46036)" }} />
        </motion.div>
      </div>
    </div>
  )
}