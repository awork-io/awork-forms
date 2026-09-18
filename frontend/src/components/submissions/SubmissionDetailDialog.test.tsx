import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Submission } from '@/lib/api';
import { SubmissionDetailDialog } from './SubmissionDetailDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const submission: Submission = {
  id: 1,
  formId: 1,
  formName: 'Briefing',
  dataJson: JSON.stringify({ attachments: [] }),
  status: 'completed',
  createdAt: '2026-09-18T12:00:00Z',
  updatedAt: '2026-09-18T12:00:00Z',
};

describe('SubmissionDetailDialog', () => {
  it('shows the empty value placeholder for an empty file array', () => {
    render(
      <SubmissionDetailDialog
        open
        onOpenChange={vi.fn()}
        submission={submission}
        fieldLabels={{ attachments: 'Attachments' }}
        formatFullDate={() => '18 September 2026'}
      />
    );

    expect(screen.getByText('submissions.emptyValue')).toBeInTheDocument();
  });
});
