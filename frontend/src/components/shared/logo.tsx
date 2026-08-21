"use client"

import { type FC } from "react"

type LogoVariant = "icon" | "compact" | "full"
type LogoProps = {
  className?: string
  variant?: LogoVariant
}

export const Logo: FC<LogoProps> = ({ className = "h-8", variant = "icon" }) => {
  const iconClass = `${className} w-auto object-contain`

  if (variant === "icon") {
    return <img src="/logo.png" alt="LeadPilot" className={iconClass} />
  }

  const tagline = "Your AI Sales Assistant"

  return (
    <div className="flex items-center gap-2.5">
      <img src="/logo.png" alt="LeadPilot" className={iconClass} />
      <div className="flex flex-col leading-tight min-w-0">
        <span className="font-bold text-slate-900 truncate">LeadPilot</span>
        {variant === "full" && (
          <span className="text-[11px] text-slate-500 truncate">{tagline}</span>
        )}
      </div>
    </div>
  )
}