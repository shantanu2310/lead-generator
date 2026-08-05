"use client"

import { Camera, ImagePlus, X } from "lucide-react"
import { useRef, useState } from "react"
import { resizeImageToDataUrl } from "@/lib/utils"

export function Avatar({
  name,
  src,
  className,
}: {
  name: string
  src?: string | null
  className?: string
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover shrink-0 border border-white/10 ${className || "w-9 h-9"}`}
      />
    )
  }
  return (
    <div
      className={`rounded-full bg-gradient-to-br from-blue-500/40 to-violet-500/40 border border-white/15 flex items-center justify-center shrink-0 ${className || "w-9 h-9"}`}
    >
      <span className="text-sm font-bold text-white text-[length:inherit]">
        {name.charAt(0).toUpperCase() || "?"}
      </span>
    </div>
  )
}

export function AvatarPicker({
  value,
  onChange,
  size = 96,
}: {
  value: string | null
  onChange: (dataUrl: string | null) => void
  size?: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setBusy(true)
    setErr(null)
    try {
      onChange(await resizeImageToDataUrl(file))
    } catch (err: any) {
      setErr(err.message || "Failed to process image")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={`group relative rounded-full overflow-hidden border border-white/15 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${busy ? "animate-pulse" : ""}`}
          style={{ width: size, height: size }}
          title="Upload photo"
        >
          {value ? (
            <img src={value} alt="Avatar preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 flex items-center justify-center text-gray-400">
              <Camera className="w-6 h-6" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-xs font-medium text-white">Upload</span>
          </div>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-gray-300 text-xs hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <ImagePlus className="w-4 h-4" />
            {value ? "Replace photo" : "Add photo"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-colors"
            >
              <X className="w-4 h-4" />
              Remove photo
            </button>
          )}
        </div>
      </div>
      {err && <p className="text-xs text-red-400 mt-2">{err}</p>}
    </div>
  )
}