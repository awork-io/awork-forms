export function formatDateForLocale(
  dateString: string,
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions
) {
  return new Date(dateString).toLocaleString(locale || 'en', options);
}
