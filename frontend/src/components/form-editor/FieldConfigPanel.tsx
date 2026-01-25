import { useState } from 'react';
import { type FormField, type SelectOption } from '@/lib/form-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';

interface FieldConfigPanelProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
  onClose: () => void;
}

export function FieldConfigPanel({
  field,
  onUpdate,
  onClose,
}: FieldConfigPanelProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Field Settings</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Separator />

      {/* Basic Settings */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="field-label">Label</Label>
          <Input
            id="field-label"
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder="Field label"
          />
        </div>

        {field.type !== 'checkbox' && (
          <div className="space-y-2">
            <Label htmlFor="field-placeholder">Placeholder</Label>
            <Input
              id="field-placeholder"
              value={field.placeholder || ''}
              onChange={(e) => onUpdate({ placeholder: e.target.value })}
              placeholder="Placeholder text"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Required</Label>
            <p className="text-xs text-muted-foreground">
              User must fill this field
            </p>
          </div>
          <Switch
            checked={field.required}
            onCheckedChange={(required) => onUpdate({ required })}
          />
        </div>
      </div>

      {/* Select Options */}
      {field.type === 'select' && (
        <>
          <Separator />
          <SelectOptionsEditor
            options={field.options || []}
            onUpdate={(options) => onUpdate({ options })}
          />
        </>
      )}

      {/* Field Type Info */}
      <Separator />
      <div className="rounded-lg bg-muted p-3">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Field Type:</span>{' '}
          {getFieldTypeDescription(field.type)}
        </p>
      </div>
    </div>
  );
}

interface SelectOptionsEditorProps {
  options: SelectOption[];
  onUpdate: (options: SelectOption[]) => void;
}

function SelectOptionsEditor({ options, onUpdate }: SelectOptionsEditorProps) {
  const [newOptionLabel, setNewOptionLabel] = useState('');

  const addOption = () => {
    if (!newOptionLabel.trim()) return;

    const newOption: SelectOption = {
      label: newOptionLabel.trim(),
      value: newOptionLabel.trim().toLowerCase().replace(/\s+/g, '-'),
    };
    onUpdate([...options, newOption]);
    setNewOptionLabel('');
  };

  const updateOption = (index: number, updates: Partial<SelectOption>) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], ...updates };
    onUpdate(newOptions);
  };

  const removeOption = (index: number) => {
    onUpdate(options.filter((_, i) => i !== index));
  };

  const moveOption = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= options.length) return;
    const newOptions = [...options];
    const [moved] = newOptions.splice(fromIndex, 1);
    newOptions.splice(toIndex, 0, moved);
    onUpdate(newOptions);
  };

  return (
    <div className="space-y-3">
      <Label>Options</Label>

      <div className="space-y-2">
        {options.map((option, index) => (
          <div
            key={index}
            className="flex items-center gap-2 p-2 rounded-md border bg-background group"
          >
            <div className="text-muted-foreground cursor-grab">
              <GripVertical className="w-4 h-4" />
            </div>
            <Input
              value={option.label}
              onChange={(e) => updateOption(index, { label: e.target.value })}
              className="h-8 flex-1"
              placeholder="Option label"
            />
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => moveOption(index, index - 1)}
                disabled={index === 0}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => moveOption(index, index + 1)}
                disabled={index === options.length - 1}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => removeOption(index)}
                disabled={options.length <= 1}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add new option */}
      <div className="flex items-center gap-2">
        <Input
          value={newOptionLabel}
          onChange={(e) => setNewOptionLabel(e.target.value)}
          placeholder="New option"
          className="h-8"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addOption();
            }
          }}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={addOption}
          disabled={!newOptionLabel.trim()}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
}

function getFieldTypeDescription(type: string): string {
  switch (type) {
    case 'text':
      return 'Single line text input for short answers';
    case 'email':
      return 'Email address input with validation';
    case 'number':
      return 'Numeric input for numbers only';
    case 'textarea':
      return 'Multi-line text area for longer responses';
    case 'select':
      return 'Dropdown menu for selecting one option';
    case 'checkbox':
      return 'Checkbox for yes/no or agreement';
    case 'date':
      return 'Date picker for selecting a date';
    default:
      return 'Custom field type';
  }
}
