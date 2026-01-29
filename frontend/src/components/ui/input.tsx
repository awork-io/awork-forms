import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-[14px] border border-gray-200 bg-white pl-4 pr-2 py-3.5 text-sm font-semibold transition-all duration-50 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-gray-400 placeholder:italic placeholder:font-normal focus-visible:outline-none focus-visible:border-[#006dfa] focus-visible:shadow-[inset_0_0_0_1px_#006dfa] disabled:cursor-not-allowed disabled:opacity-50 read-only:opacity-50 read-only:cursor-default",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
