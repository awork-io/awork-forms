import * as React from "react"
import { Check, ChevronDown, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { SearchableSelectOption } from "@/components/ui/searchable-select"

interface MultiSearchableSelectProps {
  options: SearchableSelectOption[]
  values: string[]
  onValuesChange: (values: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  removeLabel?: string
  disabled?: boolean
  className?: string
}

// Multi-value sibling of SearchableSelect: selected options render as removable chips in the
// trigger, the popover stays open while toggling so several users can be picked in one go.
export function MultiSearchableSelect({
  options,
  values,
  onValuesChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  removeLabel = "Remove",
  disabled = false,
  className,
}: MultiSearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [triggerWidth, setTriggerWidth] = React.useState(0)

  const selectedOptions = values
    .map((value) => options.find((option) => option.value === value))
    .filter((option): option is SearchableSelectOption => Boolean(option))

  const sortedOptions = [...options].sort((a, b) => a.label.localeCompare(b.label))
  const lowerSearch = search.toLowerCase()
  const filteredOptions = !search
    ? sortedOptions
    : sortedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lowerSearch) ||
        opt.secondaryLabel?.toLowerCase().includes(lowerSearch)
    )

  React.useEffect(() => {
    if (open) {
      setSearch("")
      if (triggerRef.current) {
        setTriggerWidth(triggerRef.current.offsetWidth)
      }
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const toggle = (value: string) => {
    onValuesChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
  }

  const remove = (value: string) => onValuesChange(values.filter((item) => item !== value))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between min-h-12 rounded-[14px] border border-gray-200 bg-white pl-3 pr-3 py-1.5 text-sm transition-all",
            "hover:shadow-[0_1px_3px_rgba(20,45,82,0.08)] hover:border-gray-300",
            "focus:outline-none focus:shadow-[inset_0_0_0_1px_#006dfa]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            selectedOptions.length === 0 && "text-gray-400 italic pl-4",
            className
          )}
        >
          <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1 text-left">
            {selectedOptions.length === 0 ? (
              <span className="truncate">{placeholder}</span>
            ) : (
              selectedOptions.map((option) => (
                <span
                  key={option.value}
                  className="flex items-center gap-1.5 rounded-full bg-gray-100 pl-1 pr-1.5 py-0.5 text-gray-900 font-medium max-w-full"
                >
                  {option.icon && <span className="shrink-0 [&>*]:w-5 [&>*]:h-5 [&>*]:text-[10px]">{option.icon}</span>}
                  <span className="truncate">{option.label}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`${removeLabel}: ${option.label}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      remove(option.value)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation()
                        e.preventDefault()
                        remove(option.value)
                      }
                    }}
                    className="p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </span>
              ))
            )}
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
        className="p-0 rounded-[14px] shadow-xl border border-gray-100 bg-white overflow-hidden"
        align="start"
        sideOffset={4}
        style={{ width: triggerWidth > 0 ? triggerWidth : undefined }}
      >
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
        <div
          role="listbox"
          aria-multiselectable="true"
          className="max-h-[280px] overflow-y-auto overscroll-contain touch-pan-y p-1.5"
          onWheel={(event) => event.stopPropagation()}
        >
          {filteredOptions.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">{emptyText}</div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = values.includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggle(option.value)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left transition-colors",
                    "hover:bg-gray-50",
                    isSelected && "bg-[#edf5ff] hover:bg-[#e0efff]"
                  )}
                >
                  {option.icon && <span className="shrink-0">{option.icon}</span>}
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
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-[#006dfa]" />}
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
