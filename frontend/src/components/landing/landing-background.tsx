"use client"

import { useMemo } from "react"

const PARTICLES = [
  { left: "6%", size: 3, duration: 22, delay: 0, opacity: 0.35 },
  { left: "12%", size: 2, duration: 30, delay: 4, opacity: 0.25 },
  { left: "20%", size: 4, duration: 26, delay: 9, opacity: 0.4 },
  { left: "28%", size: 2, duration: 34, delay: 2, opacity: 0.3 },
  { left: "36%", size: 3, duration: 24, delay: 12, opacity: 0.35 },
  { left: "44%", size: 2, duration: 28, delay: 6, opacity: 0.25 },
  { left: "52%", size: 3, duration: 32, delay: 0, opacity: 0.4 },
  { left: "60%", size: 2, duration: 25, delay: 10, opacity: 0.3 },
  { left: "68%", size: 4, duration: 30, delay: 3, opacity: 0.35 },
  { left: "76%", size: 2, duration: 27, delay: 8, opacity: 0.25 },
  { left: "84%", size: 3, duration: 33, delay: 5, opacity: 0.4 },
  { left: "92%", size: 2, duration: 24, delay: 11, opacity: 0.3 },
]

export default function LandingBackground() {
  const particles = useMemo(
    () =>
      PARTICLES.map((p, i) => (
        <span
          key={i}
          className="particle"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: i % 2 === 0 ? "#a855f7" : "#38bdf8",
            boxShadow: `0 0 ${p.size * 3}px ${i % 2 === 0 ? "#a855f7" : "#38bdf8"}`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            ["--particle-opacity" as string]: p.opacity,
          }}
        />
      )),
    []
  )

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="grid-overlay absolute inset-0" />

      <div className="animate-aurora absolute -top-40 -left-40 h-[34rem] w-[34rem] rounded-full bg-[#7c3aed]/25 blur-3xl" />
      <div className="animate-aurora-slow absolute top-1/3 -right-48 h-[30rem] w-[30rem] rounded-full bg-[#38bdf8]/15 blur-3xl" />
      <div className="animate-aurora absolute -bottom-48 left-1/4 h-[32rem] w-[32rem] rounded-full bg-[#a855f7]/15 blur-3xl" style={{ animationDelay: "-9s" }} />
      <div className="animate-aurora-slow absolute bottom-1/4 -right-32 h-72 w-72 rounded-full bg-[#7c3aed]/20 blur-3xl" style={{ animationDelay: "-13s" }} />

      <div className="absolute left-[8%] top-[24%] h-64 w-64 rounded-full border border-[#7c3aed]/20" />
      <div className="absolute left-[10%] top-[26%] h-52 w-52 rounded-full border border-[#38bdf8]/15" />
      <div className="absolute right-[6%] bottom-[18%] h-72 w-72 rounded-full border border-[#a855f7]/15" />

      <div className="absolute left-[30%] top-[10%] h-px w-56 bg-gradient-to-r from-transparent via-[#a855f7]/60 to-transparent" />
      <div className="absolute left-[20%] top-[58%] h-px w-72 bg-gradient-to-r from-transparent via-[#38bdf8]/50 to-transparent" />
      <div className="absolute right-[24%] top-[30%] h-px w-64 bg-gradient-to-r from-transparent via-[#7c3aed]/60 to-transparent" />

      {particles}
    </div>
  )
}
