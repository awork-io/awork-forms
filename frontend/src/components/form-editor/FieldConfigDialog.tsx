import { useState, type Dispatch, type SetStateAction } from 'react';
import {
  type FieldTranslation,
  type FormField,
  type SelectOption,
  getFieldTypeLabel,
} from '@/lib/form-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputField } from '@/components/ui/form-field';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Trash2, GripVertical, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AworkCustomFieldDefinition } from '@/lib/api';
import type { AworkIntegrationConfig } from '@/components/form-editor/AworkIntegrationSettings';
import { AWORK_PROJECT_FIELDS, AWORK_TASK_FIELDS } from '@/components/form-editor/awork-field-options';

interface FieldConfigDialogProps {
  field: FormField | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (fieldId: string, updates: Partial<FormField>) => void;
  onDelete: (fieldId: string) => void;
  aworkConfig: AworkIntegrationConfig;
  onAworkConfigChange: Dispatch<SetStateAction<AworkIntegrationConfig>>;
  aworkCustomFields: AworkCustomFieldDefinition[];
}

export function FieldConfigDialog({
  field,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  aworkConfig,
  onAworkConfigChange,
  aworkCustomFields,
}: FieldConfigDialogProps) {
  const { t } = useTranslation();
  if (!field) return null;

  const handleUpdate = (updates: Partial<FormField>) => {
    onUpdate(field.id, updates);
  };

  const showTaskMapping = aworkConfig.actionType === 'task' || aworkConfig.actionType === 'both';
  const showProjectMapping = aworkConfig.actionType === 'project' || aworkConfig.actionType === 'both';

  const getTaskMapping = () => {
    const mapping = aworkConfig.taskFieldMappings.find((item) => item.formFieldId === field.id);
    return mapping?.aworkField || 'none';
  };

  const getProjectMapping = () => {
    const mapping = aworkConfig.projectFieldMappings.find((item) => item.formFieldId === field.id);
    return mapping?.aworkField || 'none';
  };

  const updateTaskMapping = (aworkField: string) => {
    onAworkConfigChange((prev) => {
      const existing = prev.taskFieldMappings.filter((item) => item.formFieldId !== field.id);
      if (aworkField === 'none') {
        return { ...prev, taskFieldMappings: existing };
      }

      const defaultField = AWORK_TASK_FIELDS.find((item) => item.value === aworkField);
      const customFieldId = aworkField.startsWith('custom:') ? aworkField.replace('custom:', '') : null;
      const customField = customFieldId
        ? aworkCustomFields.find((item) => item.id === customFieldId)
        : null;
      const label = customField?.name || defaultField?.fallbackLabel || aworkField;

      return {
        ...prev,
        taskFieldMappings: [
          ...existing,
          { formFieldId: field.id, aworkField, aworkFieldLabel: label },
        ],
      };
    });
  };

  const updateProjectMapping = (aworkField: string) => {
    onAworkConfigChange((prev) => {
      const existing = prev.projectFieldMappings.filter((item) => item.formFieldId !== field.id);
      if (aworkField === 'none') {
        return { ...prev, projectFieldMappings: existing };
      }

      const defaultField = AWORK_PROJECT_FIELDS.find((item) => item.value === aworkField);
      const label = defaultField?.fallbackLabel || aworkField;

      return {
        ...prev,
        projectFieldMappings: [
          ...existing,
          { formFieldId: field.id, aworkField, aworkFieldLabel: label },
        ],
      };
    });
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
            {t('fieldConfigDialog.title')}
            <Badge variant="secondary" className="ml-2 text-xs font-normal">
              {getFieldTypeLabel(field.type, t)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Label */}
          <InputField
            label={t('fieldConfigDialog.label')}
            id="field-label"
            value={field.label}
            onChange={(e) => handleUpdate({ label: e.target.value })}
            placeholder={t('fieldConfigDialog.labelPlaceholder')}
            autoFocus
          />

          {/* Placeholder (not for checkbox) */}
          {field.type !== 'checkbox' && (
            <InputField
              label={t('fieldConfigDialog.placeholder')}
              id="field-placeholder"
              value={field.placeholder || ''}
              onChange={(e) => handleUpdate({ placeholder: e.target.value })}
              placeholder={t('fieldConfigDialog.placeholderOptional')}
            />
          )}

          <Separator />

          <FieldTranslationsEditor field={field} onUpdate={handleUpdate} />

          {(showTaskMapping || showProjectMapping) && (
            <>
              <Separator />
              <div className="space-y-4">
                {showTaskMapping && (
                  <div className="space-y-2">
                    <Label>{t('aworkIntegration.task.mapFields')}</Label>
                    <Select value={getTaskMapping()} onValueChange={updateTaskMapping}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('aworkIntegration.task.notMapped')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('aworkIntegration.task.notMapped')}</SelectItem>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {t('common.defaultFields')}
                        </div>
                        {AWORK_TASK_FIELDS.map((aworkField) => (
                          <SelectItem key={aworkField.value} value={aworkField.value}>
                            {t(aworkField.labelKey)}
                          </SelectItem>
                        ))}
                        {aworkCustomFields.length > 0 && (
                          <>
                            <Separator className="my-1" />
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              {t('common.customFields')}
                            </div>
                            {aworkCustomFields.map((customField) => (
                              <SelectItem key={`custom:${customField.id}`} value={`custom:${customField.id}`}>
                                <div className="flex items-center gap-2">
                                  <span>{customField.name}</span>
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    {customField.type}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {showProjectMapping && (
                  <div className="space-y-2">
                    <Label>{t('aworkIntegration.project.mapFields')}</Label>
                    <Select value={getProjectMapping()} onValueChange={updateProjectMapping}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('aworkIntegration.task.notMapped')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('aworkIntegration.task.notMapped')}</SelectItem>
                        {AWORK_PROJECT_FIELDS.map((aworkField) => (
                          <SelectItem key={aworkField.value} value={aworkField.value}>
                            {t(aworkField.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Required Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">{t('fieldConfigDialog.required')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('fieldConfigDialog.requiredDescription')}
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
                  <InputField
                    label={t('fieldConfigDialog.acceptedTypes')}
                    id="accepted-types"
                    value={field.acceptedFileTypes || ''}
                    onChange={(e) => handleUpdate({ acceptedFileTypes: e.target.value })}
                    placeholder={t('fieldConfigDialog.acceptedTypesPlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground pl-2">
                    {t('fieldConfigDialog.acceptedTypesHelp')}
                  </p>
                </div>
                <InputField
                  label={t('fieldConfigDialog.maxFileSize')}
                  id="max-size"
                  type="number"
                  value={field.maxFileSizeMB || 10}
                  onChange={(e) => handleUpdate({ maxFileSizeMB: parseInt(e.target.value) || 10 })}
                  min={1}
                  max={100}
                />
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
            {t('fieldConfigDialog.deleteField')}
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            {t('fieldConfigDialog.done')}
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

  return (
    <div className="space-y-3">
      <Label>{t('fieldConfigDialog.dropdownOptions')}</Label>
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
              placeholder={t('fieldConfigDialog.optionLabelPlaceholder')}
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
          placeholder={t('fieldConfigDialog.addOptionPlaceholder')}
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
          {t('fieldConfigDialog.add')}
        </Button>
      </div>
    </div>
  );
}

interface FieldTranslationsEditorProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
}

function FieldTranslationsEditor({ field, onUpdate }: FieldTranslationsEditorProps) {
  const { t, i18n } = useTranslation();
  const defaultLanguage = getSupportedLanguage(i18n.resolvedLanguage || i18n.language);
  const languages = [
    { code: 'de', label: t('language.german') },
    { code: 'en', label: t('language.english') },
  ];

  const updateTranslation = (language: string, updates: Partial<FieldTranslation>) => {
    const nextTranslations: Record<string, FieldTranslation> = {
      ...(field.translations || {}),
      [language]: {
        ...(field.translations?.[language] || {}),
        ...updates,
      },
    };

    onUpdate({ translations: normalizeTranslations(nextTranslations) });
  };

  const updateOptionTranslation = (language: string, optionValue: string, value: string) => {
    const currentOptions = field.translations?.[language]?.options || {};
    updateTranslation(language, {
      options: {
        ...currentOptions,
        [optionValue]: value,
      },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-base">{t('fieldConfigDialog.translationsTitle')}</Label>
        <p className="text-sm text-muted-foreground">
          {t('fieldConfigDialog.translationsDescription')}
        </p>
      </div>
      <Tabs defaultValue={defaultLanguage}>
        <TabsList className="grid w-full grid-cols-2">
          {languages.map((language) => (
            <TabsTrigger key={language.code} value={language.code} className="text-xs">
              {language.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {languages.map((language) => {
          const translation = field.translations?.[language.code];
          return (
            <TabsContent key={language.code} value={language.code} className="space-y-3 mt-4">
              <div className="space-y-2">
                <Label>{t('fieldConfigDialog.translationLabel')}</Label>
                <Input
                  value={translation?.label || ''}
                  onChange={(e) => updateTranslation(language.code, { label: e.target.value })}
                  placeholder={field.label}
                />
                <p className="text-xs text-muted-foreground">
                  {t('fieldConfigDialog.translationOptional')}
                </p>
              </div>
              {field.type !== 'checkbox' && (
                <div className="space-y-2">
                  <Label>{t('fieldConfigDialog.translationPlaceholder')}</Label>
                  <Input
                    value={translation?.placeholder || ''}
                    onChange={(e) => updateTranslation(language.code, { placeholder: e.target.value })}
                    placeholder={field.placeholder || t('fieldConfigDialog.placeholderOptional')}
                  />
                </div>
              )}
              {field.type === 'select' && (field.options?.length || 0) > 0 && (
                <div className="space-y-2">
                  <Label>{t('fieldConfigDialog.optionTranslations')}</Label>
                  <div className="space-y-2">
                    {(field.options || []).map((option) => (
                      <div key={option.value} className="grid grid-cols-2 gap-2 items-center">
                        <span className="text-sm text-muted-foreground truncate">
                          {option.label}
                        </span>
                        <Input
                          value={translation?.options?.[option.value] || ''}
                          onChange={(e) =>
                            updateOptionTranslation(language.code, option.value, e.target.value)
                          }
                          placeholder={t('fieldConfigDialog.optionTranslationPlaceholder')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function getSupportedLanguage(language?: string) {
  if (!language) return 'en';
  if (language.toLowerCase().startsWith('de')) {
    return 'de';
  }
  return 'en';
}

function normalizeTranslations(
  translations: Record<string, FieldTranslation>
): Record<string, FieldTranslation> | undefined {
  const cleaned = Object.entries(translations).reduce<Record<string, FieldTranslation>>(
    (acc, [language, value]) => {
      const next: FieldTranslation = {};
      if (value.label?.trim()) {
        next.label = value.label.trim();
      }
      if (value.placeholder?.trim()) {
        next.placeholder = value.placeholder.trim();
      }
      if (value.options) {
        const cleanedOptions = Object.entries(value.options)
          .filter(([, optionValue]) => optionValue.trim())
          .reduce<Record<string, string>>((optionAcc, [optionKey, optionValue]) => {
            optionAcc[optionKey] = optionValue.trim();
            return optionAcc;
          }, {});
        if (Object.keys(cleanedOptions).length > 0) {
          next.options = cleanedOptions;
        }
      }

      if (Object.keys(next).length > 0) {
        acc[language] = next;
      }
      return acc;
    },
    {}
  );

  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}
