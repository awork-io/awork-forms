import { useState } from 'react';
import type { TFunction } from 'i18next';
import type { FormField } from '@/lib/form-types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getFieldTranslation } from '@/components/public-form/utils';

interface PublicFormFieldProps {
  field: FormField;
  index: number;
  value: unknown;
  onChange: (value: unknown) => void;
  validationError?: string;
  languageKeys: string[];
  t: TFunction;
}

export function PublicFormField({
  field,
  index,
  value,
  onChange,
  validationError,
  languageKeys,
  t,
}: PublicFormFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const fieldTranslation = getFieldTranslation(field, languageKeys);
  const fieldLabel = fieldTranslation?.label || field.label;
  const fieldPlaceholder = fieldTranslation?.placeholder || field.placeholder;
  const hasError = Boolean(validationError);

  const inputClasses = cn(
    'w-full px-3 py-3 text-base bg-white border-2 rounded-xl transition-all duration-300 outline-none',
    'placeholder:text-gray-400',
    isFocused && !hasError && 'border-blue-500 shadow-[0_0_0_3px_rgba(77,154,255,0.1)]',
    !isFocused && !hasError && 'border-gray-200 hover:border-gray-300',
    hasError && 'border-red-400 shadow-[0_0_0_3px_rgba(255,67,152,0.1)]'
  );

  const commonFocusProps = {
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
  };

  return (
    <div
      className="group"
      style={{
        animationDelay: `${index * 80}ms`,
        animation: 'fadeInUp 0.6s ease-out forwards',
        opacity: 0,
      }}
    >
      <div
        className={cn(
          'p-2 rounded-xl transition-all duration-300',
          isFocused ? 'bg-blue-50/50' : 'bg-transparent hover:bg-gray-50/40'
        )}
      >
        {field.type !== 'checkbox' ? (
          <Label
            htmlFor={field.id}
            className={cn(
              'block text-base font-semibold mb-2 transition-colors duration-200',
              isFocused ? 'text-blue-600' : 'text-gray-700'
            )}
          >
            {fieldLabel}
            {field.required ? <span className="text-red-400 ml-1">*</span> : null}
          </Label>
        ) : null}

        {field.type === 'text' ? (
          <input
            id={field.id}
            type="text"
            placeholder={fieldPlaceholder || t('publicForm.placeholders.text')}
            value={(value as string) || ''}
            onChange={(event) => onChange(event.target.value)}
            className={inputClasses}
            {...commonFocusProps}
          />
        ) : null}

        {field.type === 'email' ? (
          <input
            id={field.id}
            type="email"
            placeholder={fieldPlaceholder || t('publicForm.placeholders.email')}
            value={(value as string) || ''}
            onChange={(event) => onChange(event.target.value)}
            className={inputClasses}
            {...commonFocusProps}
          />
        ) : null}

        {field.type === 'number' ? (
          <input
            id={field.id}
            type="number"
            placeholder={fieldPlaceholder || t('publicForm.placeholders.number')}
            value={(value as string) || ''}
            onChange={(event) => onChange(event.target.value)}
            className={inputClasses}
            {...commonFocusProps}
          />
        ) : null}

        {field.type === 'textarea' ? (
          <textarea
            id={field.id}
            placeholder={fieldPlaceholder || t('publicForm.placeholders.textarea')}
            value={(value as string) || ''}
            onChange={(event) => onChange(event.target.value)}
            rows={4}
            className={cn(inputClasses, 'resize-none')}
            {...commonFocusProps}
          />
        ) : null}

        {field.type === 'select' ? (
          <Select
            value={(value as string) || ''}
            onValueChange={(nextValue) => onChange(nextValue)}
          >
            <SelectTrigger className={inputClasses}>
              <SelectValue placeholder={fieldPlaceholder || t('publicForm.placeholders.select')} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {field.options?.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="py-3 px-4 text-base cursor-pointer"
                >
                  {fieldTranslation?.options?.[option.value] || option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {field.type === 'checkbox' ? (
          <label htmlFor={field.id} className="flex items-center gap-3 cursor-pointer group/checkbox">
            <div
              className={cn(
                'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200',
                value ? 'bg-blue-500 border-blue-500' : 'border-gray-300 group-hover/checkbox:border-blue-400'
              )}
            >
              {value ? (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : null}
            </div>
            <Checkbox
              id={field.id}
              checked={(value as boolean) || false}
              onCheckedChange={(checked) => onChange(checked)}
              className="sr-only"
            />
            <span className="text-base text-gray-700">
              {fieldLabel}
              {field.required ? <span className="text-red-400 ml-1">*</span> : null}
            </span>
          </label>
        ) : null}

        {field.type === 'date' ? (
          <input
            id={field.id}
            type="date"
            value={(value as string) || ''}
            onChange={(event) => onChange(event.target.value)}
            className={inputClasses}
            {...commonFocusProps}
          />
        ) : null}

        {field.type === 'file' ? (
          <div
            className={cn(
              'relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 text-center cursor-pointer',
              isFocused ? 'border-blue-400 bg-blue-50/50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50/50'
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setIsFocused(true);
            }}
            onDragLeave={() => setIsFocused(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsFocused(false);
              const files = event.dataTransfer.files;
              if (files.length > 0) {
                onChange(files[0]);
              }
            }}
            onClick={() => document.getElementById(`file-${field.id}`)?.click()}
          >
            <input
              id={`file-${field.id}`}
              type="file"
              className="sr-only"
              onChange={(event) => {
                const files = event.target.files;
                if (files && files.length > 0) {
                  onChange(files[0]);
                }
              }}
            />
            {value instanceof File ? (
              <div className="flex items-center justify-center gap-2 text-gray-700">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">{value.name}</span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onChange(null);
                  }}
                  className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="mx-auto w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-blue-600">{t('publicForm.fileUpload.clickToUpload')}</span>{' '}
                  {t('publicForm.fileUpload.dragAndDrop')}
                </p>
                <p className="text-xs text-gray-400">{t('publicForm.fileUpload.fileTypes')}</p>
              </div>
            )}
          </div>
        ) : null}

        {validationError ? (
          <p className="mt-3 text-sm text-red-500 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {validationError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
