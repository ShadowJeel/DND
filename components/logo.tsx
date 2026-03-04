
interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
  iconOnly?: boolean
}

export function Logo({ className = "", size = "md", iconOnly = false }: LogoProps) {
  const sizeClasses = {
    sm: { container: "h-7 w-7", text: "text-sm" },
    md: { container: "h-9 w-9", text: "text-xl" },
    lg: { container: "h-12 w-12", text: "text-2xl" },
  }

  const sizes = sizeClasses[size]

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Logo Icon */}
      <div className={`${sizes.container} relative flex items-center justify-center rounded-xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-lg ring-2 ring-gray-700/50 ring-offset-1`}>
        {/* DND Monogram - Modern Industrial Design */}
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-[65%] w-[65%]"
        >
          {/* D Letter - Left */}
          <path
            d="M4 6 L4 26 L10 26 C14 26 16 23 16 16 C16 9 14 6 10 6 L4 6 Z M7 9 L10 9 C12 9 13 11 13 16 C13 21 12 23 10 23 L7 23 Z"
            fill="url(#grad1)"
            className="drop-shadow-md"
          />
          
          {/* N Letter - Center with industrial angle */}
          <path
            d="M17 6 L17 26 L20 26 L20 14 L25 26 L28 26 L28 6 L25 6 L25 18 L20 6 Z"
            fill="url(#grad2)"
            className="drop-shadow-md"
          />
          
          {/* Industrial Connection Line */}
          <line
            x1="16"
            y1="16"
            x2="17"
            y2="16"
            stroke="url(#grad3)"
            strokeWidth="1.5"
            className="opacity-70"
          />
          
          {/* Gradient Definitions */}
          <defs>
            <linearGradient id="grad1" x1="4" y1="6" x2="16" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
            <linearGradient id="grad2" x1="17" y1="6" x2="28" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <linearGradient id="grad3" x1="16" y1="16" x2="17" y2="16" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Corner accent - modern industrial touch */}
        <div className="absolute bottom-0.5 right-0.5 h-1 w-1 rounded-full bg-gradient-to-tr from-blue-400 to-emerald-400 opacity-70"></div>
      </div>

      {/* Text */}
      {!iconOnly && (
        <div className="flex flex-col leading-none">
          <span className={`font-serif ${sizes.text} font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-gray-50 dark:to-gray-100 bg-clip-text text-transparent`}>
            DND Purchase
          </span>
          <span className="text-[10px] font-medium tracking-wider text-gray-600 dark:text-gray-400 mt-0.5">
            B2B INDUSTRIAL
          </span>
        </div>
      )}
    </div>
  )
}

// Simplified version for navbar/header
export function LogoSimple({ className = "", showTagline = true }: { className?: string; showTagline?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Logo Icon */}
      <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-md ring-1 ring-gray-700/50">
        {/* Simplified DN monogram */}
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-[60%] w-[60%]"
        >
          <path
            d="M6 8 L6 24 L11 24 C13.5 24 15 22 15 16 C15 10 13.5 8 11 8 Z M8.5 10.5 L11 10.5 C12 10.5 12.5 11.5 12.5 16 C12.5 20.5 12 21.5 11 21.5 L8.5 21.5 Z"
            fill="url(#simple-grad1)"
          />
          <path
            d="M17 8 L17 24 L19.5 24 L19.5 14.5 L24 24 L26 24 L26 8 L23.5 8 L23.5 17.5 L19 8 Z"
            fill="url(#simple-grad2)"
          />
          <defs>
            <linearGradient id="simple-grad1" x1="6" y1="8" x2="15" y2="24">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
            <linearGradient id="simple-grad2" x1="17" y1="8" x2="26" y2="24">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Text */}
      <span className="font-serif text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">
        DND Purchase
      </span>
    </div>
  )
}
