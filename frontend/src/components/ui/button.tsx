import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#006dfa] text-white shadow-sm hover:bg-[#0062e0] active:bg-[#0058c9]",
        destructive:
          "bg-[#ff1a82] text-white shadow-sm hover:bg-[#e61575] active:bg-[#cc1268]",
        outline:
          "border border-input bg-background hover:bg-[#edf5ff] hover:text-[#006dfa] hover:border-transparent",
        secondary:
          "bg-[#edf5ff] text-[#006dfa] hover:bg-[#dbebff] active:bg-[#b8d7ff]",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-[#006dfa] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-6 py-2.5 text-sm rounded-[12px]",
        sm: "h-8 px-3 text-sm rounded-[10px]",
        lg: "h-12 px-6 text-base rounded-[14px]",
        icon: "h-10 w-10 rounded-[12px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
