// Field types supported by the form editor
export type FieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'date'
  | 'file';

export interface SelectOption {
  label: string;
  value: string;
}

export interface FieldTranslation {
  label?: string;
  placeholder?: string;
  options?: Record<string, string>;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  translations?: Record<string, FieldTranslation>;
  options?: SelectOption[]; // For select fields
  acceptedFileTypes?: string; // For file fields (e.g., ".pdf,.doc,.docx")
  maxFileSizeMB?: number; // For file fields
}

export interface FormFieldWithPosition extends FormField {
  order: number;
}

// Field type metadata for the sidebar
export interface FieldTypeInfo {
  type: FieldType;
  label: string;
  icon: string;
  description: string;
}

export const FIELD_TYPES: FieldTypeInfo[] = [
  {
    type: 'text',
    label: 'Text',
    icon: 'Type',
    description: 'Single line text input',
  },
  {
    type: 'email',
    label: 'Email',
    icon: 'Mail',
    description: 'Email address input',
  },
  {
    type: 'number',
    label: 'Number',
    icon: 'Hash',
    description: 'Numeric input',
  },
  {
    type: 'textarea',
    label: 'Long Text',
    icon: 'AlignLeft',
    description: 'Multi-line text area',
  },
  {
    type: 'select',
    label: 'Dropdown',
    icon: 'ChevronDown',
    description: 'Select from options',
  },
  {
    type: 'checkbox',
    label: 'Checkbox',
    icon: 'CheckSquare',
    description: 'Yes/No checkbox',
  },
  {
    type: 'date',
    label: 'Date',
    icon: 'Calendar',
    description: 'Date picker',
  },
  {
    type: 'file',
    label: 'File Upload',
    icon: 'Paperclip',
    description: 'Upload files',
  },
];

const FIELD_TYPE_TRANSLATION_KEYS: Record<
  FieldType,
  { labelKey: string; descriptionKey: string; defaultLabelKey: string }
> = {
  text: {
    labelKey: 'fieldTypes.text.label',
    descriptionKey: 'fieldTypes.text.description',
    defaultLabelKey: 'fieldDefaults.text',
  },
  email: {
    labelKey: 'fieldTypes.email.label',
    descriptionKey: 'fieldTypes.email.description',
    defaultLabelKey: 'fieldDefaults.email',
  },
  number: {
    labelKey: 'fieldTypes.number.label',
    descriptionKey: 'fieldTypes.number.description',
    defaultLabelKey: 'fieldDefaults.number',
  },
  textarea: {
    labelKey: 'fieldTypes.textarea.label',
    descriptionKey: 'fieldTypes.textarea.description',
    defaultLabelKey: 'fieldDefaults.textarea',
  },
  select: {
    labelKey: 'fieldTypes.select.label',
    descriptionKey: 'fieldTypes.select.description',
    defaultLabelKey: 'fieldDefaults.select',
  },
  checkbox: {
    labelKey: 'fieldTypes.checkbox.label',
    descriptionKey: 'fieldTypes.checkbox.description',
    defaultLabelKey: 'fieldDefaults.checkbox',
  },
  date: {
    labelKey: 'fieldTypes.date.label',
    descriptionKey: 'fieldTypes.date.description',
    defaultLabelKey: 'fieldDefaults.date',
  },
  file: {
    labelKey: 'fieldTypes.file.label',
    descriptionKey: 'fieldTypes.file.description',
    defaultLabelKey: 'fieldDefaults.file',
  },
};

const FIELD_TYPE_FALLBACKS: Record<
  FieldType,
  { label: string; description: string; defaultLabel: string }
> = {
  text: {
    label: 'Text',
    description: 'Single line text input',
    defaultLabel: 'Text Field',
  },
  email: {
    label: 'Email',
    description: 'Email address input',
    defaultLabel: 'Email Address',
  },
  number: {
    label: 'Number',
    description: 'Numeric input',
    defaultLabel: 'Number',
  },
  textarea: {
    label: 'Long Text',
    description: 'Multi-line text area',
    defaultLabel: 'Description',
  },
  select: {
    label: 'Dropdown',
    description: 'Select from options',
    defaultLabel: 'Select Option',
  },
  checkbox: {
    label: 'Checkbox',
    description: 'Yes/No checkbox',
    defaultLabel: 'I agree',
  },
  date: {
    label: 'Date',
    description: 'Date picker',
    defaultLabel: 'Date',
  },
  file: {
    label: 'File Upload',
    description: 'Upload files',
    defaultLabel: 'Attachment',
  },
};

const OPTION_LABEL_KEYS = {
  option1: 'fieldDefaults.option1',
  option2: 'fieldDefaults.option2',
} as const;

export function getFieldTypeLabel(type: FieldType, t?: TFunction): string {
  const meta = FIELD_TYPE_TRANSLATION_KEYS[type];
  if (!meta) return type;
  if (t) return t(meta.labelKey);
  return FIELD_TYPE_FALLBACKS[type].label;
}

export function getFieldTypeDescription(type: FieldType, t?: TFunction): string {
  const meta = FIELD_TYPE_TRANSLATION_KEYS[type];
  if (!meta) return type;
  if (t) return t(meta.descriptionKey);
  return FIELD_TYPE_FALLBACKS[type].description;
}

export function getTranslatedFieldTypes(t?: TFunction): FieldTypeInfo[] {
  return FIELD_TYPES.map((fieldType) => ({
    ...fieldType,
    label: getFieldTypeLabel(fieldType.type, t),
    description: getFieldTypeDescription(fieldType.type, t),
  }));
}

// Create a new field with default values
export function createField(type: FieldType, t?: TFunction): FormField {
  const baseField = {
    id: crypto.randomUUID(),
    type,
    label: getDefaultLabel(type, t),
    required: false,
    placeholder: '',
  };

  if (type === 'select') {
    return {
      ...baseField,
      options: [
        { label: getDefaultOptionLabel('option1', t), value: 'option1' },
        { label: getDefaultOptionLabel('option2', t), value: 'option2' },
      ],
    };
  }

  if (type === 'file') {
    return {
      ...baseField,
      acceptedFileTypes: '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg',
      maxFileSizeMB: 10,
    };
  }

  return baseField;
}

function getDefaultLabel(type: FieldType, t?: TFunction): string {
  const meta = FIELD_TYPE_TRANSLATION_KEYS[type];
  if (meta && t) {
    return t(meta.defaultLabelKey);
  }
  switch (type) {
    case 'text':
      return 'Text Field';
    case 'email':
      return 'Email Address';
    case 'number':
      return 'Number';
    case 'textarea':
      return 'Description';
    case 'select':
      return 'Select Option';
    case 'checkbox':
      return 'I agree';
    case 'date':
      return 'Date';
    case 'file':
      return 'Attachment';
    default:
      return 'Field';
  }
}

function getDefaultOptionLabel(
  option: keyof typeof OPTION_LABEL_KEYS,
  t?: TFunction
): string {
  if (t) {
    return t(OPTION_LABEL_KEYS[option]);
  }
  return option === 'option1' ? 'Option 1' : 'Option 2';
}
import type { TFunction } from 'i18next';
