import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch inline-flex shrink-0 items-center rounded-full border-none outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=unchecked]:bg-[#dbedff] data-[state=checked]:bg-[#4d9aff]",
        "transition-colors duration-200",
        "data-[size=default]:h-8 data-[size=default]:w-14",
        "data-[size=sm]:h-6 data-[size=sm]:w-[42px]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white",
          "shadow-[0px_2px_2px_rgba(0,0,0,0.05),0px_3px_6px_rgba(0,0,0,0.04),0px_2px_3px_rgba(0,0,0,0.03)]",
          "transition-transform duration-[250ms] cubic-bezier(0.3,0.9,0.8,1)",
          "group-data-[size=default]/switch:size-[26px] group-data-[size=sm]/switch:size-5",
          "data-[state=unchecked]:translate-x-[3px]",
          "group-data-[size=default]/switch:data-[state=checked]:translate-x-[27px]",
          "group-data-[size=sm]/switch:data-[state=checked]:translate-x-[20px]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
