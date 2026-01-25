import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import type { PublicForm } from '@/lib/api';
import type { FormField } from '@/lib/form-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

export function PublicFormPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const [form, setForm] = useState<PublicForm | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Load form data
  useEffect(() => {
    async function loadForm() {
      if (!publicId) {
        setError('Invalid form URL');
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
        setError(err instanceof Error ? err.message : 'Failed to load form');
      } finally {
        setIsLoading(false);
      }
    }

    loadForm();
  }, [publicId]);

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    fields.forEach((field) => {
      const value = formData[field.id];

      if (field.required) {
        if (field.type === 'checkbox') {
          if (!value) {
            errors[field.id] = 'This field is required';
          }
        } else if (!value || (typeof value === 'string' && value.trim() === '')) {
          errors[field.id] = 'This field is required';
        }
      }

      // Email validation
      if (field.type === 'email' && value && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors[field.id] = 'Please enter a valid email address';
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
      await api.submitPublicForm(publicId, formData);
      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
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
  const primaryColor = form?.primaryColor || '#6366f1';
  const backgroundColor = form?.backgroundColor || '#f8fafc';
  const logoUrl = form?.logoUrl
    ? form.logoUrl.startsWith('http')
      ? form.logoUrl
      : `http://localhost:5100${form.logoUrl}`
    : null;

  // Loading state
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor }}
      >
        <div className="animate-pulse text-gray-500">Loading form...</div>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Form Not Available</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (isSubmitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor }}
      >
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center animate-in fade-in zoom-in duration-500">
          {/* Animated checkmark */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
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
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-3">Thank You!</h2>
          <p className="text-gray-500 text-lg">
            Your submission has been received successfully.
          </p>

          {/* Confetti-like dots animation */}
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
        </div>
      </div>
    );
  }

  // Form view
  return (
    <div
      className="min-h-screen py-8 px-4 sm:py-12"
      style={{ backgroundColor }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header with accent color */}
          <div
            className="h-2"
            style={{ backgroundColor: primaryColor }}
          />

          <div className="p-6 sm:p-8 md:p-10">
            {/* Logo */}
            {logoUrl && (
              <div className="flex justify-center mb-6">
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="max-h-16 max-w-[200px] object-contain"
                />
              </div>
            )}

            {/* Title and description */}
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {form?.name}
              </h1>
              {form?.description && (
                <p className="text-gray-500 text-base sm:text-lg">
                  {form.description}
                </p>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Form fields */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Label
                    htmlFor={field.id}
                    className={cn(
                      'text-sm font-medium text-gray-700 mb-2 block',
                      field.type === 'checkbox' && 'sr-only'
                    )}
                  >
                    {field.label}
                    {field.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </Label>

                  {/* Text input */}
                  {field.type === 'text' && (
                    <Input
                      id={field.id}
                      type="text"
                      placeholder={field.placeholder}
                      value={(formData[field.id] as string) || ''}
                      onChange={(e) => updateField(field.id, e.target.value)}
                      className={cn(
                        'h-12 text-base rounded-xl border-gray-200 focus:ring-2 transition-all',
                        validationErrors[field.id] && 'border-red-500 focus:ring-red-200'
                      )}
                      style={{
                        '--tw-ring-color': `${primaryColor}40`,
                      } as React.CSSProperties}
                    />
                  )}

                  {/* Email input */}
                  {field.type === 'email' && (
                    <Input
                      id={field.id}
                      type="email"
                      placeholder={field.placeholder || 'email@example.com'}
                      value={(formData[field.id] as string) || ''}
                      onChange={(e) => updateField(field.id, e.target.value)}
                      className={cn(
                        'h-12 text-base rounded-xl border-gray-200 focus:ring-2 transition-all',
                        validationErrors[field.id] && 'border-red-500 focus:ring-red-200'
                      )}
                      style={{
                        '--tw-ring-color': `${primaryColor}40`,
                      } as React.CSSProperties}
                    />
                  )}

                  {/* Number input */}
                  {field.type === 'number' && (
                    <Input
                      id={field.id}
                      type="number"
                      placeholder={field.placeholder}
                      value={(formData[field.id] as string) || ''}
                      onChange={(e) => updateField(field.id, e.target.value)}
                      className={cn(
                        'h-12 text-base rounded-xl border-gray-200 focus:ring-2 transition-all',
                        validationErrors[field.id] && 'border-red-500 focus:ring-red-200'
                      )}
                      style={{
                        '--tw-ring-color': `${primaryColor}40`,
                      } as React.CSSProperties}
                    />
                  )}

                  {/* Textarea */}
                  {field.type === 'textarea' && (
                    <Textarea
                      id={field.id}
                      placeholder={field.placeholder}
                      value={(formData[field.id] as string) || ''}
                      onChange={(e) => updateField(field.id, e.target.value)}
                      rows={4}
                      className={cn(
                        'text-base rounded-xl border-gray-200 focus:ring-2 transition-all resize-none',
                        validationErrors[field.id] && 'border-red-500 focus:ring-red-200'
                      )}
                      style={{
                        '--tw-ring-color': `${primaryColor}40`,
                      } as React.CSSProperties}
                    />
                  )}

                  {/* Select dropdown */}
                  {field.type === 'select' && (
                    <Select
                      value={(formData[field.id] as string) || ''}
                      onValueChange={(value) => updateField(field.id, value)}
                    >
                      <SelectTrigger
                        className={cn(
                          'h-12 text-base rounded-xl border-gray-200 focus:ring-2 transition-all',
                          validationErrors[field.id] && 'border-red-500 focus:ring-red-200'
                        )}
                        style={{
                          '--tw-ring-color': `${primaryColor}40`,
                        } as React.CSSProperties}
                      >
                        <SelectValue placeholder={field.placeholder || 'Select an option'} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Checkbox */}
                  {field.type === 'checkbox' && (
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id={field.id}
                        checked={(formData[field.id] as boolean) || false}
                        onCheckedChange={(checked) => updateField(field.id, checked)}
                        className={cn(
                          'mt-0.5 h-5 w-5 rounded border-gray-300',
                          validationErrors[field.id] && 'border-red-500'
                        )}
                        style={{
                          '--primary': primaryColor,
                        } as React.CSSProperties}
                      />
                      <label
                        htmlFor={field.id}
                        className="text-sm text-gray-700 cursor-pointer leading-relaxed"
                      >
                        {field.label}
                        {field.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                    </div>
                  )}

                  {/* Date input */}
                  {field.type === 'date' && (
                    <Input
                      id={field.id}
                      type="date"
                      value={(formData[field.id] as string) || ''}
                      onChange={(e) => updateField(field.id, e.target.value)}
                      className={cn(
                        'h-12 text-base rounded-xl border-gray-200 focus:ring-2 transition-all',
                        validationErrors[field.id] && 'border-red-500 focus:ring-red-200'
                      )}
                      style={{
                        '--tw-ring-color': `${primaryColor}40`,
                      } as React.CSSProperties}
                    />
                  )}

                  {/* Validation error */}
                  {validationErrors[field.id] && (
                    <p className="mt-1.5 text-sm text-red-500 animate-in fade-in slide-in-from-top-1 duration-200">
                      {validationErrors[field.id]}
                    </p>
                  )}
                </div>
              ))}

              {/* Submit button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 text-base font-semibold rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{
                    backgroundColor: primaryColor,
                    color: 'white',
                  }}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Submitting...
                    </span>
                  ) : (
                    'Submit'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Powered by{' '}
          <span className="font-medium" style={{ color: primaryColor }}>
            awork Forms
          </span>
        </p>
      </div>
    </div>
  );
}
