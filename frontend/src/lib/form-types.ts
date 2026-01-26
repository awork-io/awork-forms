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

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
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

// Create a new field with default values
export function createField(type: FieldType): FormField {
  const baseField = {
    id: crypto.randomUUID(),
    type,
    label: getDefaultLabel(type),
    required: false,
    placeholder: '',
  };

  if (type === 'select') {
    return {
      ...baseField,
      options: [
        { label: 'Option 1', value: 'option1' },
        { label: 'Option 2', value: 'option2' },
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

function getDefaultLabel(type: FieldType): string {
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
