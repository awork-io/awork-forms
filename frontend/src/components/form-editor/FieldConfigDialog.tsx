import { useState } from 'react';
import { type FormField, type SelectOption } from '@/lib/form-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Trash2, GripVertical, Settings2 } from 'lucide-react';

interface FieldConfigDialogProps {
  field: FormField | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (fieldId: string, updates: Partial<FormField>) => void;
  onDelete: (fieldId: string) => void;
}

export function FieldConfigDialog({
  field,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
}: FieldConfigDialogProps) {
  if (!field) return null;

  const handleUpdate = (updates: Partial<FormField>) => {
    onUpdate(field.id, updates);
  };

  const handleDelete = () => {
    onDelete(field.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Field Settings
            <Badge variant="secondary" className="ml-2 text-xs font-normal">
              {getFieldTypeName(field.type)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="field-label">Label</Label>
            <Input
              id="field-label"
              value={field.label}
              onChange={(e) => handleUpdate({ label: e.target.value })}
              placeholder="Field label"
              autoFocus
            />
          </div>

          {/* Placeholder (not for checkbox) */}
          {field.type !== 'checkbox' && (
            <div className="space-y-2">
              <Label htmlFor="field-placeholder">Placeholder</Label>
              <Input
                id="field-placeholder"
                value={field.placeholder || ''}
                onChange={(e) => handleUpdate({ placeholder: e.target.value })}
                placeholder="Placeholder text (optional)"
              />
            </div>
          )}

          {/* Required Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Required</Label>
              <p className="text-sm text-muted-foreground">
                User must fill this field to submit
              </p>
            </div>
            <Switch
              checked={field.required}
              onCheckedChange={(required) => handleUpdate({ required })}
            />
          </div>

          {/* File field settings */}
          {field.type === 'file' && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="accepted-types">Accepted File Types</Label>
                  <Input
                    id="accepted-types"
                    value={field.acceptedFileTypes || ''}
                    onChange={(e) => handleUpdate({ acceptedFileTypes: e.target.value })}
                    placeholder=".pdf,.doc,.docx,.png,.jpg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of extensions
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-size">Max File Size (MB)</Label>
                  <Input
                    id="max-size"
                    type="number"
                    value={field.maxFileSizeMB || 10}
                    onChange={(e) => handleUpdate({ maxFileSizeMB: parseInt(e.target.value) || 10 })}
                    min={1}
                    max={100}
                  />
                </div>
              </div>
            </>
          )}

          {/* Select Options */}
          {field.type === 'select' && (
            <>
              <Separator />
              <SelectOptionsEditor
                options={field.options || []}
                onUpdate={(options) => handleUpdate({ options })}
              />
            </>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="destructive"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Field
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

  return (
    <div className="space-y-3">
      <Label>Dropdown Options</Label>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {options.map((option, index) => (
          <div
            key={index}
            className="flex items-center gap-2 p-2 rounded-md border bg-muted/30 group"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
            <Input
              value={option.label}
              onChange={(e) => updateOption(index, { label: e.target.value })}
              className="h-8 flex-1"
              placeholder="Option label"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => removeOption(index)}
              disabled={options.length <= 1}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={newOptionLabel}
          onChange={(e) => setNewOptionLabel(e.target.value)}
          placeholder="Add option..."
          className="h-9"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addOption();
            }
          }}
        />
        <Button
          size="sm"
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

function getFieldTypeName(type: string): string {
  const names: Record<string, string> = {
    text: 'Text',
    email: 'Email',
    number: 'Number',
    textarea: 'Long Text',
    select: 'Dropdown',
    checkbox: 'Checkbox',
    date: 'Date',
    file: 'File Upload',
  };
  return names[type] || type;
}
