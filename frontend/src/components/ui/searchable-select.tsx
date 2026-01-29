import * as React from "react"
import { Check, ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
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
  const [search, setSearch] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const selectedOption = options.find((option) => option.value === value)

  const filteredOptions = React.useMemo(() => {
    const sorted = [...options].sort((a, b) => a.label.localeCompare(b.label))
    if (!search) return sorted
    const lower = search.toLowerCase()
    return sorted.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lower) ||
        opt.secondaryLabel?.toLowerCase().includes(lower)
    )
  }, [options, search])

  React.useEffect(() => {
    if (open) {
      setSearch("")
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

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
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selectedOption?.icon && (
              <span className="shrink-0">{selectedOption.icon}</span>
            )}
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 rounded-[14px] shadow-xl border border-gray-100 bg-white overflow-hidden"
        align="start"
        sideOffset={4}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
          />
        </div>

        {/* Options list */}
        <div className="max-h-[280px] overflow-y-auto p-1.5">
          {filteredOptions.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              {emptyText}
            </div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onValueChange(option.value === value ? "none" : option.value)
                    setOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left transition-colors",
                    "hover:bg-gray-50",
                    isSelected && "bg-[#edf5ff] hover:bg-[#e0efff]"
                  )}
                >
                  {option.icon && (
                    <span className="shrink-0">{option.icon}</span>
                  )}
                  <span className={cn(
                    "flex-1 text-sm truncate",
                    isSelected ? "text-[#006dfa] font-medium" : "text-gray-700"
                  )}>
                    {option.label}
                  </span>
                  {option.secondaryLabel && (
                    <span className="text-xs text-gray-400 truncate max-w-[120px]">
                      {option.secondaryLabel}
                    </span>
                  )}
                  {isSelected && (
                    <Check className="h-4 w-4 shrink-0 text-[#006dfa]" />
                  )}
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
