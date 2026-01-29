import type { TFunction } from 'i18next';
import type { AworkCustomFieldDefinition } from '@/lib/api';

export interface AworkFieldOption {
  value: string;
  labelKey: string;
  fallbackLabel: string;
}

export interface AworkFieldMapping {
  aworkField: string;
  aworkFieldLabel: string;
}

export const AWORK_PROJECT_FIELDS: AworkFieldOption[] = [
  { value: 'name', labelKey: 'aworkIntegration.projectFields.name', fallbackLabel: 'Project Name' },
  { value: 'description', labelKey: 'aworkIntegration.projectFields.description', fallbackLabel: 'Description' },
  { value: 'startDate', labelKey: 'aworkIntegration.projectFields.startDate', fallbackLabel: 'Start Date' },
  { value: 'dueDate', labelKey: 'aworkIntegration.projectFields.dueDate', fallbackLabel: 'Due Date' },
];

export const AWORK_TASK_FIELDS: AworkFieldOption[] = [
  { value: 'name', labelKey: 'aworkIntegration.taskFields.name', fallbackLabel: 'Task Name' },
  { value: 'description', labelKey: 'aworkIntegration.taskFields.description', fallbackLabel: 'Description' },
  { value: 'dueOn', labelKey: 'aworkIntegration.taskFields.dueOn', fallbackLabel: 'Due Date' },
  { value: 'startOn', labelKey: 'aworkIntegration.taskFields.startOn', fallbackLabel: 'Start Date' },
  { value: 'plannedDuration', labelKey: 'aworkIntegration.taskFields.plannedDuration', fallbackLabel: 'Planned Duration (seconds)' },
  { value: 'tags', labelKey: 'aworkIntegration.taskFields.tags', fallbackLabel: 'Tags (comma-separated)' },
];

export function resolveTaskMappingLabel(
  mapping: AworkFieldMapping,
  t: TFunction,
  customFields: AworkCustomFieldDefinition[]
) {
  return resolveMappingLabel(mapping, t, customFields, AWORK_TASK_FIELDS);
}

export function resolveProjectMappingLabel(
  mapping: AworkFieldMapping,
  t: TFunction
) {
  return resolveMappingLabel(mapping, t, [], AWORK_PROJECT_FIELDS);
}

function resolveMappingLabel(
  mapping: AworkFieldMapping,
  t: TFunction,
  customFields: AworkCustomFieldDefinition[],
  defaultFields: AworkFieldOption[]
) {
  const isCustom = mapping.aworkField.startsWith('custom:');
  const defaultField = defaultFields.find((item) => item.value === mapping.aworkField);
  const translatedDefault = defaultField ? t(defaultField.labelKey) : null;

  if (!isCustom) {
    if (mapping.aworkFieldLabel && !mapping.aworkFieldLabel.startsWith('custom:')) {
      return mapping.aworkFieldLabel;
    }
    return translatedDefault || mapping.aworkFieldLabel || mapping.aworkField;
  }

  const customFieldId = mapping.aworkField.replace('custom:', '');
  const customField = customFields.find((item) => item.id === customFieldId);
  if (customField?.name) return customField.name;

  if (mapping.aworkFieldLabel && !mapping.aworkFieldLabel.startsWith('custom:')) {
    return mapping.aworkFieldLabel;
  }

  return t('common.customFields');
}
