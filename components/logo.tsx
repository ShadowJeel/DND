interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
  iconOnly?: boolean
}

export function Logo({ className = "", size = "md", iconOnly = false }: LogoProps) {
  const sizeClasses = {
    sm: "h-7",
    md: "h-10",
    lg: "h-14",
  }

  const heightClass = sizeClasses[size]

  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="/logo-asset-4.png"
        alt="DND Purchase"
        className={`${heightClass} w-auto object-contain`}
      />
    </div>
  )
}

export function LogoSimple({ className = "", showTagline = true }: { className?: string; showTagline?: boolean }) {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="/logo-asset-4.png"
        alt="DND Purchase"
        className="h-14 w-auto object-contain"
      />
    </div>
  )
}
