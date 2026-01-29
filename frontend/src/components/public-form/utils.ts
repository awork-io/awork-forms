import type { FieldTranslation, FormField } from '@/lib/form-types';

export function getLanguageKeys(language: string) {
  const trimmed = (language || 'en').toLowerCase();
  const base = trimmed.split('-')[0];
  return base && base !== trimmed ? [trimmed, base] : [trimmed];
}

export function getTranslatedText(
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

export function getFieldTranslation(field: FormField, languageKeys: string[]): FieldTranslation | undefined {
  for (const key of languageKeys) {
    const translation = field.translations?.[key];
    if (translation) return translation;
  }
  return undefined;
}
