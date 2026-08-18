export function Logo({ className = "h-8" }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="Loggix"
      className={`${className} w-auto object-contain`}
    />
  )
}