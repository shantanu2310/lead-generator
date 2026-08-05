"use client"

import { Target } from "lucide-react"
import Link from "next/link"

export default function LandingNav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#38bdf8] shadow-[0_0_24px_rgba(124,58,237,0.5)]">
              <Target className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              LeadGen <span className="gradient-text">AI</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-[#94a3b8] transition-colors hover:text-white"
            >
              Features
            </a>
            <Link
              href="/architecture"
              className="text-sm font-medium text-[#94a3b8] transition-colors hover:text-white"
            >
              Architecture
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-[#94a3b8] transition-colors hover:text-white"
            >
              Sign In
            </Link>
            <a
              href="#signup"
              className="btn-gradient px-5 py-2.5 text-sm"
            >
              Start Free Trial
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}
