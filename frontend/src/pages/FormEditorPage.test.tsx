import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ChangeEvent } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormEditorPage } from './FormEditorPage';

const mocks = vi.hoisted(() => ({
  getFormMock: vi.fn(),
  updateFormMock: vi.fn(),
  toastMock: vi.fn(),
  tMock: vi.fn((key: string) => key),
  i18nMock: { resolvedLanguage: 'en', language: 'en' },
}));

vi.mock('@/lib/api', () => ({
  api: {
    getForm: mocks.getFormMock,
    updateForm: mocks.updateFormMock,
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toastMock }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mocks.tMock,
    i18n: mocks.i18nMock,
  }),
}));

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn(),
  trackScreenSeen: vi.fn(),
}));

vi.mock('@/components/form-editor/FormEditorHeader', () => ({
  FormEditorHeader: ({ onSave, isSaving }: { onSave: () => void; isSaving: boolean }) => (
    <button type="button" onClick={onSave} disabled={isSaving}>
      save
    </button>
  ),
}));

vi.mock('@/components/form-editor/FormEditorMetaPanel', () => ({
  FormEditorMetaPanel: ({
    formName,
    formDescription,
    onFormNameChange,
    onFormDescriptionChange,
  }: {
    formName: string;
    formDescription: string;
    onFormNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onFormDescriptionChange: (event: ChangeEvent<HTMLInputElement>) => void;
  }) => (
    <div>
      <input aria-label="form-name" value={formName} onChange={onFormNameChange} />
      <input aria-label="form-description" value={formDescription} onChange={onFormDescriptionChange} />
    </div>
  ),
}));

vi.mock('@/components/form-editor/FormCanvas', () => ({
  FormCanvas: ({ onFieldDuplicate }: { onFieldDuplicate: (fieldId: string) => void }) => (
    <button type="button" onClick={() => onFieldDuplicate('field-1')}>
      duplicate-field
    </button>
  ),
}));

vi.mock('@/components/form-editor/FieldCard', () => ({
  FieldCard: () => <div />,
}));

vi.mock('@/components/form-editor/FieldConfigDialog', () => ({
  FieldConfigDialog: () => null,
}));

vi.mock('@/components/form-editor/ShareFormDialog', () => ({
  ShareFormDialog: () => null,
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <div />,
}));

vi.mock('@/components/form-editor/AworkIntegrationSettings', async () => {
  const actual = await vi.importActual<typeof import('@/components/form-editor/AworkIntegrationSettings')>(
    '@/components/form-editor/AworkIntegrationSettings'
  );
  return {
    ...actual,
    AworkIntegrationSettings: ({
      onChange,
    }: {
      onChange: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void;
    }) => (
      <button
        type="button"
        onClick={() =>
          onChange((prev: Record<string, unknown>) => ({
            ...prev,
            actionType: null,
            projectId: null,
            projectTypeId: null,
            taskListId: null,
            taskStatusId: null,
            typeOfWorkId: null,
            assigneeId: null,
            isPriority: false,
            taskTag: null,
            taskFieldMappings: [],
            projectFieldMappings: [],
          }))
        }
      >
        clear-awork
      </button>
    ),
  };
});

vi.mock('@/components/form-editor/StyleEditor', async () => {
  const actual = await vi.importActual<typeof import('@/components/form-editor/StyleEditor')>(
    '@/components/form-editor/StyleEditor'
  );
  return {
    ...actual,
    StyleEditor: () => <div />,
  };
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/forms/42']}>
      <Routes>
        <Route path="/forms/:id" element={<FormEditorPage />} />
      </Routes>
    </MemoryRouter>
  );
}

const baseForm = {
  id: 42,
  publicId: 'f9da3c2c-8e95-4ba9-8f1c-4f7f5513b9cd',
  name: 'Payload Form',
  description: 'Payload Description',
  fieldsJson: '[]',
  isSharedWithWorkspace: true,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  submissionCount: 0,
  fieldCount: 0,
  actionType: null,
  aworkProjectId: null,
  aworkProjectTypeId: null,
  aworkTaskListId: null,
  aworkTaskStatusId: null,
  aworkTypeOfWorkId: null,
  aworkAssigneeId: null,
  aworkTaskIsPriority: false,
  aworkTaskTag: null,
  fieldMappingsJson: null,
  primaryColor: '#111111',
  backgroundColor: '#eeeeee',
  logoUrl: '/logos/form.png',
};

describe('FormEditorPage save payload', () => {
  beforeEach(() => {
    mocks.getFormMock.mockReset();
    mocks.updateFormMock.mockReset();
    mocks.toastMock.mockReset();
  });

  it('sends full PUT payload with all keys', async () => {
    mocks.getFormMock.mockResolvedValue(baseForm);
    mocks.updateFormMock.mockResolvedValueOnce(baseForm);
    const user = userEvent.setup();

    renderPage();

    await waitFor(() => expect(mocks.getFormMock).toHaveBeenCalledWith(42));
    await user.click(await screen.findByRole('button', { name: 'save' }));

    await waitFor(() => expect(mocks.updateFormMock).toHaveBeenCalledTimes(1));
    expect(mocks.updateFormMock).toHaveBeenCalledWith(42, {
      name: 'Payload Form',
      description: 'Payload Description',
      nameTranslations: null,
      descriptionTranslations: null,
      fieldsJson: '[]',
      isSharedWithWorkspace: true,
      isActive: true,
      actionType: null,
      aworkProjectId: null,
      aworkProjectTypeId: null,
      aworkTaskListId: null,
      aworkTaskStatusId: null,
      aworkTypeOfWorkId: null,
      aworkAssigneeId: null,
      aworkTaskIsPriority: false,
      aworkTaskTag: null,
      fieldMappingsJson: null,
      primaryColor: '#111111',
      backgroundColor: '#eeeeee',
      logoUrl: '/logos/form.png',
    });
  });

  it('sends null clears when user clears fields', async () => {
    mocks.getFormMock.mockResolvedValue({
      ...baseForm,
      actionType: 'task',
      aworkProjectId: '11111111-1111-1111-1111-111111111111',
      aworkTaskListId: '22222222-2222-2222-2222-222222222222',
      aworkTaskStatusId: '33333333-3333-3333-3333-333333333333',
      aworkTypeOfWorkId: '44444444-4444-4444-4444-444444444444',
      aworkAssigneeId: '55555555-5555-5555-5555-555555555555',
      aworkTaskTag: 'vip',
      fieldMappingsJson: '{"taskFieldMappings":[{"formFieldId":"f1","aworkField":"name"}]}',
    });
    mocks.updateFormMock.mockResolvedValueOnce(baseForm);
    const user = userEvent.setup();

    renderPage();

    await waitFor(() => expect(mocks.getFormMock).toHaveBeenCalledWith(42));
    await user.clear(await screen.findByLabelText('form-description'));
    await user.click(screen.getByRole('button', { name: 'clear-awork' }));
    await user.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => expect(mocks.updateFormMock).toHaveBeenCalledTimes(1));
    expect(mocks.updateFormMock).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        description: null,
        actionType: null,
        aworkProjectId: null,
        aworkProjectTypeId: null,
        aworkTaskListId: null,
        aworkTaskStatusId: null,
        aworkTypeOfWorkId: null,
        aworkAssigneeId: null,
        aworkTaskTag: null,
        fieldMappingsJson: null,
      })
    );
  });

  it('copies awork mappings when duplicating a field', async () => {
    mocks.getFormMock.mockResolvedValue({
      ...baseForm,
      fieldsJson: JSON.stringify([{ id: 'field-1', type: 'text', label: 'Source', required: false }]),
      fieldMappingsJson: JSON.stringify({
        taskFieldMappings: [{ formFieldId: 'field-1', aworkField: 'description', aworkFieldLabel: 'Description' }],
        projectFieldMappings: [{ formFieldId: 'field-1', aworkField: 'name', aworkFieldLabel: 'Project Name' }],
      }),
    });
    mocks.updateFormMock.mockResolvedValueOnce(baseForm);
    const user = userEvent.setup();

    renderPage();

    await waitFor(() => expect(mocks.getFormMock).toHaveBeenCalledWith(42));
    await user.click(screen.getByRole('button', { name: 'duplicate-field' }));
    await user.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => expect(mocks.updateFormMock).toHaveBeenCalledTimes(1));
    const payload = mocks.updateFormMock.mock.calls[0][1];
    const mappings = JSON.parse(payload.fieldMappingsJson);
    const duplicatedField = JSON.parse(payload.fieldsJson).find((field: { id: string }) => field.id !== 'field-1');

    expect(duplicatedField).toMatchObject({ label: 'Source (formEditor.copySuffix)' });
    expect(mappings.taskFieldMappings).toEqual(expect.arrayContaining([
      { formFieldId: 'field-1', aworkField: 'description', aworkFieldLabel: 'Description' },
      { formFieldId: duplicatedField.id, aworkField: 'description', aworkFieldLabel: 'Description' },
    ]));
    expect(mappings.projectFieldMappings).toEqual(expect.arrayContaining([
      { formFieldId: 'field-1', aworkField: 'name', aworkFieldLabel: 'Project Name' },
      { formFieldId: duplicatedField.id, aworkField: 'name', aworkFieldLabel: 'Project Name' },
    ]));
  });
});
