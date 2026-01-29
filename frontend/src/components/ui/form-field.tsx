import * as React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  label: string
  id?: string
  className?: string
  children: React.ReactNode
}

function FormField({ label, id, className, children }: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="pl-2">{label}</Label>
      {children}
    </div>
  )
}

interface InputFieldProps extends React.ComponentProps<typeof Input> {
  label: string
}

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, id, className, ...props }, ref) => {
    const inputId = id || React.useId()
    return (
      <FormField label={label} id={inputId}>
        <Input ref={ref} id={inputId} className={className} {...props} />
      </FormField>
    )
  }
)
InputField.displayName = "InputField"

interface TextareaFieldProps extends React.ComponentProps<typeof Textarea> {
  label: string
}

const TextareaField = React.forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, id, className, ...props }, ref) => {
    const inputId = id || React.useId()
    return (
      <FormField label={label} id={inputId}>
        <Textarea ref={ref} id={inputId} className={className} {...props} />
      </FormField>
    )
  }
)
TextareaField.displayName = "TextareaField"

export { FormField, InputField, TextareaField }
