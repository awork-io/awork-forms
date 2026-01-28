import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import type { PublicForm, SubmissionResponse } from '@/lib/api';
import type { FieldTranslation, FormField } from '@/lib/form-types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/i18n-errors';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

const aworkGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)';

export function PublicFormPage() {
  const { t, i18n } = useTranslation();
  const { publicId } = useParams<{ publicId: string }>();
  const [form, setForm] = useState<PublicForm | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResponse | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const languageKeys = getLanguageKeys(i18n.resolvedLanguage || i18n.language);

  // Load form data
  useEffect(() => {
    async function loadForm() {
      if (!publicId) {
        setError(t('publicForm.invalidUrl'));
        setIsLoading(false);
        return;
      }

      try {
        const formData = await api.getPublicForm(publicId);
        setForm(formData);

        // Parse fields
        const parsedFields = JSON.parse(formData.fieldsJson || '[]') as FormField[];
        setFields(parsedFields);

        // Initialize form data with default values
        const initialData: Record<string, unknown> = {};
        parsedFields.forEach((field) => {
          if (field.type === 'checkbox') {
            initialData[field.id] = false;
          } else {
            initialData[field.id] = '';
          }
        });
        setFormData(initialData);
      } catch (err) {
        setError(getErrorMessage(err, t, 'publicForm.loadError'));
      } finally {
        setIsLoading(false);
      }
    }

    loadForm();
  }, [publicId, t]);

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    fields.forEach((field) => {
      const value = formData[field.id];

      if (field.required) {
        if (field.type === 'checkbox') {
          if (!value) {
            errors[field.id] = t('publicForm.requiredError');
          }
        } else if (!value || (typeof value === 'string' && value.trim() === '')) {
          errors[field.id] = t('publicForm.requiredError');
        }
      }

      // Email validation
      if (field.type === 'email' && value && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors[field.id] = t('publicForm.emailError');
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicId || !form) return;

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Process form data - upload files first
      const processedData: Record<string, unknown> = {};
      
      for (const [fieldId, value] of Object.entries(formData)) {
        if (value instanceof File) {
          // Upload file and store metadata
          const uploadResult = await api.uploadPublicFile(publicId, value);
          processedData[fieldId] = {
            fileName: uploadResult.fileName,
            fileUrl: uploadResult.fileUrl,
            fileSize: uploadResult.fileSize,
          };
        } else {
          processedData[fieldId] = value;
        }
      }

      const response = await api.submitPublicForm(publicId, processedData);
      setSubmissionResult(response);
      setIsSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err, t, 'publicForm.submissionFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update field value
  const updateField = (fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    // Clear validation error when user types
    if (validationErrors[fieldId]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  // Get custom styles
  const apiBaseUrl = import.meta.env.VITE_API_URL || '';
  const primaryColor = form?.primaryColor || '#6366f1';
  const backgroundColor = form?.backgroundColor || '#f8fafc';
  const logoUrl = form?.logoUrl
    ? form.logoUrl.startsWith('http')
      ? form.logoUrl
      : `${apiBaseUrl}${form.logoUrl}`
    : null;

  // Loading state
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor }}
      >
        <div className="animate-pulse text-gray-500">{t('publicForm.loading')}</div>
      </div>
    );
  }

  // Error state
  if (error && !form) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor }}
      >
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('publicForm.notAvailableTitle')}</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (isSubmitted) {
    const hasIntegrationError = submissionResult?.integrationStatus === 'failed';

    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor }}
      >
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center animate-in fade-in zoom-in duration-500">
          {/* Animated checkmark */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300"
            style={{ backgroundColor: hasIntegrationError ? '#fef3c7' : `${primaryColor}20` }}
          >
            {hasIntegrationError ? (
              <svg
                className="w-10 h-10 animate-in zoom-in duration-500 delay-200 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            ) : (
              <svg
                className="w-10 h-10 animate-in zoom-in duration-500 delay-200"
                style={{ color: primaryColor }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {hasIntegrationError ? t('publicForm.submissionReceived') : t('publicForm.thankYou')}
          </h2>
          <p className="text-gray-500 text-lg">
            {t('publicForm.submissionSuccess')}
          </p>

          {/* Integration error warning */}
          {hasIntegrationError && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-left animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    {t('publicForm.integrationNoticeTitle')}
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    {t('publicForm.integrationNoticeBody')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Confetti-like dots animation - only show on full success */}
          {!hasIntegrationError && (
            <div className="relative h-8 mt-6">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-bounce"
                  style={{
                    backgroundColor: primaryColor,
                    left: `${20 + i * 15}%`,
                    animationDelay: `${i * 0.1}s`,
                    opacity: 0.6 + i * 0.1,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render field input
  const renderField = (field: FormField, index: number) => {
    const isFocused = focusedField === field.id;
    const hasError = !!validationErrors[field.id];
    const fieldTranslation = getFieldTranslation(field, languageKeys);
    const fieldLabel = fieldTranslation?.label || field.label;
    const fieldPlaceholder = fieldTranslation?.placeholder || field.placeholder;
    
    const inputClasses = cn(
      'w-full px-3 py-3 text-base bg-white border-2 rounded-xl transition-all duration-300 outline-none',
      'placeholder:text-gray-400',
      isFocused && !hasError && 'border-blue-500 shadow-[0_0_0_3px_rgba(77,154,255,0.1)]',
      !isFocused && !hasError && 'border-gray-200 hover:border-gray-300',
      hasError && 'border-red-400 shadow-[0_0_0_3px_rgba(255,67,152,0.1)]'
    );

    const commonProps = {
      onFocus: () => setFocusedField(field.id),
      onBlur: () => setFocusedField(null),
    };

    return (
      <div
        key={field.id}
        className="group"
        style={{ 
          animationDelay: `${index * 80}ms`,
          animation: 'fadeInUp 0.6s ease-out forwards',
          opacity: 0,
        }}
      >
        {/* Field container with subtle hover effect */}
        <div className={cn(
          'p-2 rounded-xl transition-all duration-300',
          isFocused ? 'bg-blue-50/50' : 'bg-transparent hover:bg-gray-50/40'
        )}>
          {field.type !== 'checkbox' && (
            <Label
              htmlFor={field.id}
              className={cn(
                'block text-sm font-semibold mb-2 transition-colors duration-200',
                isFocused ? 'text-blue-600' : 'text-gray-700'
              )}
            >
              {fieldLabel}
              {field.required && (
                <span className="text-red-400 ml-1">*</span>
              )}
            </Label>
          )}

          {field.type === 'text' && (
            <input
              id={field.id}
              type="text"
              placeholder={fieldPlaceholder || t('publicForm.placeholders.text')}
              value={(formData[field.id] as string) || ''}
              onChange={(e) => updateField(field.id, e.target.value)}
              className={inputClasses}
              {...commonProps}
            />
          )}

          {field.type === 'email' && (
            <input
              id={field.id}
              type="email"
              placeholder={fieldPlaceholder || t('publicForm.placeholders.email')}
              value={(formData[field.id] as string) || ''}
              onChange={(e) => updateField(field.id, e.target.value)}
              className={inputClasses}
              {...commonProps}
            />
          )}

          {field.type === 'number' && (
            <input
              id={field.id}
              type="number"
              placeholder={fieldPlaceholder || t('publicForm.placeholders.number')}
              value={(formData[field.id] as string) || ''}
              onChange={(e) => updateField(field.id, e.target.value)}
              className={inputClasses}
              {...commonProps}
            />
          )}

          {field.type === 'textarea' && (
            <textarea
              id={field.id}
              placeholder={fieldPlaceholder || t('publicForm.placeholders.textarea')}
              value={(formData[field.id] as string) || ''}
              onChange={(e) => updateField(field.id, e.target.value)}
              rows={4}
              className={cn(inputClasses, 'resize-none')}
              {...commonProps}
            />
          )}

          {field.type === 'select' && (
            <Select
              value={(formData[field.id] as string) || ''}
              onValueChange={(value) => updateField(field.id, value)}
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
          )}

          {field.type === 'checkbox' && (
            <label
              htmlFor={field.id}
              className="flex items-center gap-3 cursor-pointer group/checkbox"
            >
              <div className={cn(
                'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200',
                formData[field.id] 
                  ? 'bg-blue-500 border-blue-500' 
                  : 'border-gray-300 group-hover/checkbox:border-blue-400'
              )}>
                {Boolean(formData[field.id]) && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <Checkbox
                id={field.id}
                checked={(formData[field.id] as boolean) || false}
                onCheckedChange={(checked) => updateField(field.id, checked)}
                className="sr-only"
              />
              <span className="text-sm text-gray-700">
                {fieldLabel}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </span>
            </label>
          )}

          {field.type === 'date' && (
            <input
              id={field.id}
              type="date"
              value={(formData[field.id] as string) || ''}
              onChange={(e) => updateField(field.id, e.target.value)}
              className={inputClasses}
              {...commonProps}
            />
          )}

          {field.type === 'file' && (
            <div
              className={cn(
                'relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 text-center cursor-pointer',
                isFocused ? 'border-blue-400 bg-blue-50/50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50/50'
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setFocusedField(field.id);
              }}
              onDragLeave={() => setFocusedField(null)}
              onDrop={(e) => {
                e.preventDefault();
                setFocusedField(null);
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                  updateField(field.id, files[0]);
                }
              }}
              onClick={() => document.getElementById(`file-${field.id}`)?.click()}
            >
              <input
                id={`file-${field.id}`}
                type="file"
                className="sr-only"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    updateField(field.id, files[0]);
                  }
                }}
              />
              {formData[field.id] ? (
                <div className="flex items-center justify-center gap-2 text-gray-700">
                  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">{(formData[field.id] as File).name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateField(field.id, null);
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
          )}

          {/* Validation error */}
          {validationErrors[field.id] && (
            <p className="mt-3 text-sm text-red-500 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {validationErrors[field.id]}
            </p>
          )}
        </div>
      </div>
    );
  };

  // Progress calculation
  const filledFields = fields.filter(f => {
    const val = formData[f.id];
    return f.type === 'checkbox' ? val === true : val && String(val).trim() !== '';
  }).length;
  const progress = fields.length > 0 ? (filledFields / fields.length) * 100 : 0;

  // Form view
  return (
    <div className="min-h-screen" style={{ backgroundColor }}>
      {/* CSS for animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 1; }
          50% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(0.95); opacity: 1; }
        }
      `}</style>

      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-1/3 -right-1/4 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
          style={{ background: aworkGradient }}
        />
        <div 
          className="absolute -bottom-1/3 -left-1/4 w-[400px] h-[400px] rounded-full opacity-15 blur-3xl"
          style={{ background: 'linear-gradient(135deg, #4d9aff 0%, #a157f6 100%)' }}
        />
      </div>

      {/* Main content */}
      <div className="relative min-h-screen flex flex-col">
        {/* Progress bar */}
        {fields.length > 1 && (
          <div className="fixed top-0 left-0 right-0 z-50">
            <div className="h-1 bg-gray-200/50 backdrop-blur-sm">
              <div 
                className="h-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${progress}%`,
                  background: aworkGradient,
                }}
              />
            </div>
          </div>
        )}

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center py-12 px-4 sm:py-16">
          <div className="w-full max-w-2xl">
            {/* Form card */}
            <div 
              className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl shadow-gray-900/10 overflow-hidden"
              style={{ animation: 'fadeInUp 0.8s ease-out forwards' }}
            >
              {/* Header gradient bar */}
              <div 
                className="h-2"
                style={{ background: aworkGradient }}
              />

              {/* Form content */}
              <div className="p-6 sm:p-8">
                {/* Language switcher */}
                <div className="flex justify-end mb-4 -mt-2">
                  <LanguageSwitcher variant="minimal" />
                </div>

                {/* Logo */}
                {logoUrl && (
                  <div className="flex justify-center mb-6">
                    <img
                      src={logoUrl}
                      alt={t('publicForm.logoAlt')}
                      className="max-h-10 max-w-[140px] object-contain"
                    />
                  </div>
                )}

                {/* Title and description */}
                <div className="text-center mb-6">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 tracking-tight">
                    {getTranslatedText(form?.nameTranslations, form?.name || '', languageKeys)}
                  </h1>
                  {getTranslatedText(form?.descriptionTranslations, form?.description || '', languageKeys) && (
                    <p className="text-base text-gray-500 max-w-md mx-auto leading-relaxed">
                      {getTranslatedText(form?.descriptionTranslations, form?.description || '', languageKeys)}
                    </p>
                  )}
                </div>

                {/* Field counter */}
                {fields.length > 1 && (
                  <div className="flex justify-center mb-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-xs text-gray-600">
                      <span className="font-semibold text-blue-600">{filledFields}</span>
                      <span>/</span>
                      <span>{fields.length}</span>
                      <span>{t('publicForm.progressCompleted')}</span>
                    </span>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-2">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                {/* Form fields */}
                <form onSubmit={handleSubmit} className="space-y-2">
                  {fields.map((field, index) => renderField(field, index))}

                  {/* Submit button */}
                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className={cn(
                        'w-full h-11 text-base font-semibold rounded-xl transition-all duration-300',
                        'shadow-md hover:shadow-lg',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        !isSubmitting && 'hover:scale-[1.01] active:scale-[0.99]'
                      )}
                      style={{
                        background: aworkGradient,
                        color: 'white',
                      }}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          {t('publicForm.submitting')}
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1.5">
                          {t('publicForm.submit')}
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </span>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex items-center justify-center">
              <p className="text-xs text-gray-400">
                {t('publicForm.poweredByPrefix')}{' '}
                <a 
                  href="https://awork.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-500 hover:text-blue-600 transition-colors"
                >
                  {t('brand.full')}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getLanguageKeys(language: string) {
  const trimmed = (language || 'en').toLowerCase();
  const base = trimmed.split('-')[0];
  return base && base !== trimmed ? [trimmed, base] : [trimmed];
}

function getTranslatedText(
  translations: Record<string, string> | undefined,
  fallback: string,
  languageKeys: string[]
) {
  for (const key of languageKeys) {
    const value = translations?.[key];
    if (value) return value;
  }
  return fallback;
}

function getFieldTranslation(field: FormField, languageKeys: string[]): FieldTranslation | undefined {
  for (const key of languageKeys) {
    const translation = field.translations?.[key];
    if (translation) return translation;
  }
  return undefined;
}
