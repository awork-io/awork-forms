import { isFileValue } from '@/lib/form-types';

export function parseSubmissionData(dataJson: string): Record<string, unknown> {
  try {
    return JSON.parse(dataJson);
  } catch {
    return {};
  }
}

export function getSubmissionPreview(dataJson: string): string {
  const data = parseSubmissionData(dataJson);
  const entries = Object.entries(data);
  if (entries.length === 0) return '-';

  const preview = entries.slice(0, 2).map(([, value]) => {
    if (isFileValue(value)) return value.fileName;
    const strValue = String(value);
    return strValue.length > 25 ? `${strValue.substring(0, 25)}...` : strValue;
  });

  return preview.join(', ');
}
