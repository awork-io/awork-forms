import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-[10px] border border-transparent px-3 py-1 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3.5 gap-1.5 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-all overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-[#edf5ff] text-[#006dfa] [a&]:hover:bg-[#dbebff]",
        secondary: "bg-gray-100 text-gray-700 [a&]:hover:bg-gray-200",
        destructive: "bg-[#ffe5f1] text-[#ff1a82] [a&]:hover:bg-[#ffdbec]",
        success: "bg-[#ecfcf5] text-[#16d982] [a&]:hover:bg-[#dafaec]",
        warning: "bg-[#fffbf0] text-[#3d2b00] [a&]:hover:bg-[#fff6e0]",
        outline: "border-gray-200 bg-white text-gray-700 [a&]:hover:bg-gray-50",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-[#006dfa] underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
