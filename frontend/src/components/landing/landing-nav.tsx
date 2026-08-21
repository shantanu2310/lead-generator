"use client"

import Link from "next/link"

export default function LandingNav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-xl sm:px-6">
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-[#F46036]"
            >
              Features
            </a>
            <Link
              href="/architecture"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-[#F46036]"
            >
              Architecture
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-[#F46036]"
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
