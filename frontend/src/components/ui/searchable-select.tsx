import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface SearchableSelectOption {
  value: string
  label: string
  secondaryLabel?: string
  icon?: React.ReactNode
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: string | null
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOption = options.find((option) => option.value === value)

  const sortedOptions = React.useMemo(
    () => [...options].sort((a, b) => a.label.localeCompare(b.label)),
    [options]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between h-12 rounded-[14px] border border-gray-200 bg-white pl-4 pr-3 text-sm transition-all",
            "hover:shadow-[0_1px_3px_rgba(20,45,82,0.08)] hover:border-gray-300",
            "focus:outline-none focus:shadow-[inset_0_0_0_1px_#006dfa]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !selectedOption && "text-gray-400 italic",
            selectedOption && "text-gray-900 font-medium",
            className
          )}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200",
            open && "rotate-180"
          )} />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] p-0 rounded-[12px] shadow-lg border-0" 
        align="start"
        sideOffset={4}
      >
        <Command className="rounded-[12px]">
          <CommandInput 
            placeholder={searchPlaceholder} 
            className="h-11"
          />
          <CommandList className="max-h-[280px]">
            <CommandEmpty className="py-6 text-center text-sm text-gray-500">
              {emptyText}
            </CommandEmpty>
            <CommandGroup className="p-1">
              {sortedOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onValueChange(option.value === value ? "none" : option.value)
                    setOpen(false)
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer",
                    "data-[selected=true]:bg-blue-50",
                    value === option.value && "bg-blue-50"
                  )}
                >
                  {option.icon && (
                    <span className="shrink-0">{option.icon}</span>
                  )}
                  <span className="flex-1 truncate">{option.label}</span>
                  {option.secondaryLabel && (
                    <span className="text-xs text-gray-400 truncate">
                      {option.secondaryLabel}
                    </span>
                  )}
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0 text-[#006dfa]",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
