import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { PublicForm, SubmissionResponse } from '@/lib/api';
import type { FormField } from '@/lib/form-types';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/i18n-errors';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { AWORK_GRADIENT } from '@/components/public-form/constants';
import { PublicFormShell } from '@/components/public-form/PublicFormShell';
import { PublicFormLoading } from '@/components/public-form/PublicFormLoading';
import { PublicFormErrorState } from '@/components/public-form/PublicFormErrorState';
import { PublicFormSuccessState } from '@/components/public-form/PublicFormSuccessState';
import { PublicFormField } from '@/components/public-form/PublicFormField';
import { getLanguageKeys, getTranslatedText } from '@/components/public-form/utils';

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
  const languageKeys = getLanguageKeys(i18n.resolvedLanguage || i18n.language);

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

        const parsedFields = JSON.parse(formData.fieldsJson || '[]') as FormField[];
        setFields(parsedFields);

        const initialData: Record<string, unknown> = {};
        parsedFields.forEach((field) => {
          initialData[field.id] = field.type === 'checkbox' ? false : '';
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!publicId || !form) return;

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const processedData: Record<string, unknown> = {};

      for (const [fieldId, value] of Object.entries(formData)) {
        if (value instanceof File) {
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

  const updateField = (fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    if (validationErrors[fieldId]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const apiBaseUrl = import.meta.env.VITE_API_URL || '';
  const primaryColor = form?.primaryColor || '#6366f1';
  const backgroundColor = form?.backgroundColor || '#f8fafc';
  const logoUrl = form?.logoUrl
    ? form.logoUrl.startsWith('http')
      ? form.logoUrl
      : `${apiBaseUrl}${form.logoUrl}`
    : null;

  if (isLoading) {
    return <PublicFormLoading backgroundColor={backgroundColor} />;
  }

  if (error && !form) {
    return <PublicFormErrorState backgroundColor={backgroundColor} error={error} />;
  }

  if (isSubmitted) {
    return (
      <PublicFormSuccessState
        backgroundColor={backgroundColor}
        primaryColor={primaryColor}
        submissionResult={submissionResult}
      />
    );
  }

  const filledFields = fields.filter((field) => {
    const value = formData[field.id];
    return field.type === 'checkbox' ? value === true : value && String(value).trim() !== '';
  }).length;
  const progress = fields.length > 0 ? (filledFields / fields.length) * 100 : 0;

  return (
    <PublicFormShell backgroundColor={backgroundColor} progress={progress} showProgress={fields.length > 1}>
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:py-16">
        <div className="w-full max-w-2xl">
          <div
            className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl shadow-gray-900/10 overflow-hidden"
            style={{ animation: 'fadeInUp 0.8s ease-out forwards' }}
          >
            <div className="h-2" style={{ background: AWORK_GRADIENT }} />

            <div className="p-6 sm:p-8">
              <div className="flex justify-end mb-4 -mt-2">
                <LanguageSwitcher variant="minimal" />
              </div>

              {logoUrl ? (
                <div className="flex justify-center mb-6">
                  <img
                    src={logoUrl}
                    alt={t('publicForm.logoAlt')}
                    className="max-h-10 max-w-[140px] object-contain"
                  />
                </div>
              ) : null}

              <div className="text-center mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 tracking-tight">
                  {getTranslatedText(form?.nameTranslations, form?.name || '', languageKeys)}
                </h1>
                {getTranslatedText(form?.descriptionTranslations, form?.description || '', languageKeys) ? (
                  <p className="text-base text-gray-500 max-w-md mx-auto leading-relaxed">
                    {getTranslatedText(form?.descriptionTranslations, form?.description || '', languageKeys)}
                  </p>
                ) : null}
              </div>

              {fields.length > 1 ? (
                <div className="flex justify-center mb-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-xs text-gray-600">
                    <span className="font-semibold text-blue-600">{filledFields}</span>
                    <span>/</span>
                    <span>{fields.length}</span>
                    <span>{t('publicForm.progressCompleted')}</span>
                  </span>
                </div>
              ) : null}

              {error ? (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-2">
                {fields.map((field, index) => (
                  <PublicFormField
                    key={field.id}
                    field={field}
                    index={index}
                    value={formData[field.id]}
                    onChange={(value) => updateField(field.id, value)}
                    validationError={validationErrors[field.id]}
                    languageKeys={languageKeys}
                    t={t}
                  />
                ))}

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
                      background: AWORK_GRADIENT,
                      color: 'white',
                    }}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
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
    </PublicFormShell>
  );
}
