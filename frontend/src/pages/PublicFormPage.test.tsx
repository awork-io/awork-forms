import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicFormPage } from './PublicFormPage';

const mocks = vi.hoisted(() => ({
  getPublicForm: vi.fn(),
  uploadPublicFile: vi.fn(),
  submitPublicForm: vi.fn(),
  t: vi.fn((key: string) => key),
  i18n: { resolvedLanguage: 'en', language: 'en' },
}));

vi.mock('@/lib/api', () => ({
  api: mocks,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mocks.t,
    i18n: mocks.i18n,
  }),
}));

describe('PublicFormPage file uploads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPublicForm.mockResolvedValue({
      id: 1,
      publicId: 'form-id',
      name: 'Briefing',
      fieldsJson: JSON.stringify([
        { id: 'attachment', type: 'file', label: 'Attachment', required: true },
      ]),
      isActive: true,
    });
    mocks.uploadPublicFile.mockImplementation(async (_publicId: string, file: File) => ({
      fileName: file.name,
      fileUrl: `/api/files/${file.name}`,
      fileSize: file.size,
    }));
    mocks.submitPublicForm.mockResolvedValue({ success: true, message: 'Done', submissionId: 1 });
  });

  it('uploads and submits every selected file', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter initialEntries={['/f/form-id']}>
        <Routes>
          <Route path="/f/:publicId" element={<PublicFormPage />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText('Briefing');
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const brief = new File(['brief'], 'brief.pdf', { type: 'application/pdf' });
    const image = new File(['image'], 'image.png', { type: 'image/png' });

    await user.upload(input, [brief, image]);
    await screen.findByText('brief.pdf');
    expect(screen.getByText('image.png')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'publicForm.submit' }));

    await waitFor(() => expect(mocks.submitPublicForm).toHaveBeenCalledTimes(1));
    expect(mocks.uploadPublicFile).toHaveBeenCalledTimes(2);
    expect(mocks.submitPublicForm).toHaveBeenCalledWith('form-id', {
      attachment: [
        { fileName: 'brief.pdf', fileUrl: '/api/files/brief.pdf', fileSize: 5 },
        { fileName: 'image.png', fileUrl: '/api/files/image.png', fileSize: 5 },
      ],
    });
  });
});
