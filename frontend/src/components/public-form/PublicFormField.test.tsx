import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { FormField } from '@/lib/form-types';
import { PublicFormField } from './PublicFormField';

const field: FormField = {
  id: 'attachment',
  type: 'file',
  label: 'Attachment',
  required: false,
  acceptedFileTypes: '.pdf,.png',
  maxFileSizeMB: 10,
};

const t = vi.fn((key: string) => key) as unknown as TFunction;

function FileFieldHarness() {
  const [value, setValue] = useState<unknown>([]);
  return (
    <PublicFormField
      field={field}
      index={0}
      value={value}
      onChange={setValue}
      languageKeys={['en']}
      t={t}
    />
  );
}

describe('PublicFormField file upload', () => {
  it('adds multiple files and removes them individually', async () => {
    const user = userEvent.setup();
    const { container } = render(<FileFieldHarness />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const brief = new File(['brief'], 'brief.pdf', { type: 'application/pdf' });
    const image = new File(['image'], 'image.png', { type: 'image/png' });

    expect(input).toHaveAttribute('multiple');
    await user.upload(input, [brief, image]);

    expect(screen.getByText('brief.pdf')).toBeInTheDocument();
    expect(screen.getByText('image.png')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove brief.pdf' }));

    expect(screen.queryByText('brief.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('image.png')).toBeInTheDocument();
  });
});
