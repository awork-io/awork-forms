import { useState } from 'react';
import { type FormField, type SelectOption } from '@/lib/form-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t('fieldConfigPanel.title')}</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Separator />

      {/* Basic Settings */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="field-label">{t('fieldConfigDialog.label')}</Label>
          <Input
            id="field-label"
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder={t('fieldConfigDialog.labelPlaceholder')}
          />
        </div>

        {field.type !== 'checkbox' && (
          <div className="space-y-2">
            <Label htmlFor="field-placeholder">{t('fieldConfigDialog.placeholder')}</Label>
            <Input
              id="field-placeholder"
              value={field.placeholder || ''}
              onChange={(e) => onUpdate({ placeholder: e.target.value })}
              placeholder={t('fieldConfigDialog.placeholderOptional')}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t('fieldConfigDialog.required')}</Label>
            <p className="text-xs text-muted-foreground">
              {t('fieldConfigDialog.requiredDescription')}
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
          <span className="font-medium">{t('fieldConfigPanel.fieldTypeLabel')}</span>{' '}
          {t(`fieldTypeInfo.${field.type}`, { defaultValue: t('fieldTypeInfo.default') })}
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
  const { t } = useTranslation();
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
      <Label>{t('fieldConfigDialog.dropdownOptions')}</Label>

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
              placeholder={t('fieldConfigDialog.optionLabelPlaceholder')}
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
          placeholder={t('fieldConfigDialog.addOptionPlaceholder')}
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
          {t('fieldConfigDialog.add')}
        </Button>
      </div>
    </div>
  );
}
