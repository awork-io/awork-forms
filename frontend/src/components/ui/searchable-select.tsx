import * as React from "react"
import { Check, ChevronDown, Search, X } from "lucide-react"
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
  group?: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  pinnedOptions?: SearchableSelectOption[]
  value: string | null
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  clearable?: boolean
  onClear?: () => void
}

export function SearchableSelect({
  options,
  pinnedOptions = [],
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled = false,
  className,
  clearable = false,
  onClear,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [triggerWidth, setTriggerWidth] = React.useState(0)

  const selectedOption = [...pinnedOptions, ...options].find((option) => option.value === value)

  const sortedOptions = options.some((option) => option.group)
    ? options
    : [...options].sort((a, b) => a.label.localeCompare(b.label))

  const lowerSearch = search.toLowerCase()

  const filteredPinnedOptions = !search
    ? pinnedOptions
    : pinnedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lowerSearch) ||
        opt.secondaryLabel?.toLowerCase().includes(lowerSearch) ||
        opt.group?.toLowerCase().includes(lowerSearch)
    )

  const filteredOptions = !search
    ? sortedOptions
    : sortedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lowerSearch) ||
        opt.secondaryLabel?.toLowerCase().includes(lowerSearch) ||
        opt.group?.toLowerCase().includes(lowerSearch)
    )

  const groups = new Map<string, SearchableSelectOption[]>()
  for (const option of filteredOptions) {
    const group = option.group ?? ""
    if (!groups.has(group)) {
      groups.set(group, [])
    }
    groups.get(group)!.push(option)
  }
  const groupedOptions = Array.from(groups.entries()).map(([groupName, items]) => [groupName, items] as const)

  React.useEffect(() => {
    if (open) {
      setSearch("")
      if (triggerRef.current) {
        setTriggerWidth(triggerRef.current.offsetWidth)
      }
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const showClear = clearable && selectedOption && !disabled

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
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
          <div className="flex items-center gap-1 shrink-0">
            {showClear && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  if (onClear) { onClear() } else { onValueChange("none") }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation()
                    e.preventDefault()
                    if (onClear) { onClear() } else { onValueChange("none") }
                  }
                }}
                className="p-0.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-gray-400 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 rounded-[14px] shadow-xl border border-gray-100 bg-white overflow-hidden"
        align="start"
        sideOffset={4}
        style={{ width: triggerWidth > 0 ? triggerWidth : undefined }}
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
        <div
          className="max-h-[280px] overflow-y-auto overscroll-contain touch-pan-y p-1.5"
          onWheel={(event) => event.stopPropagation()}
        >
          {filteredPinnedOptions.length === 0 && groupedOptions.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              {emptyText}
            </div>
          ) : (
            <>
              {filteredPinnedOptions.map((option) => {
                const isSelected = option.value === value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onValueChange(option.value)
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
              })}
              {groupedOptions.map(([groupName, items]) => (
                <div key={groupName || "ungrouped"}>
                  {groupName && (
                    <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      {groupName}
                    </div>
                  )}
                  {items.map((option) => {
                    const isSelected = option.value === value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          onValueChange(option.value)
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
                  })}
                </div>
              ))}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
