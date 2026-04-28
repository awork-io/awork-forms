import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { FieldConfigDialog } from './FieldConfigDialog';
import type { AworkIntegrationConfig } from './AworkIntegrationSettings';
import type { FormField } from '@/lib/form-types';

const emptyAworkConfig: AworkIntegrationConfig = {
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
};

describe('FieldConfigDialog', () => {
  it('reorders select field options', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const field: FormField = {
      id: 'field-1',
      type: 'select',
      label: 'Selection',
      required: false,
      options: [
        { label: 'First', value: 'first' },
        { label: 'Second', value: 'second' },
        { label: 'Third', value: 'third' },
      ],
    };

    render(
      <FieldConfigDialog
        field={field}
        open
        onOpenChange={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
        aworkConfig={emptyAworkConfig}
        onAworkConfigChange={vi.fn()}
        aworkCustomFields={[]}
      />
    );

    await user.click(screen.getAllByLabelText('Move option down')[0]);

    expect(onUpdate).toHaveBeenCalledWith('field-1', {
      options: [
        { label: 'Second', value: 'second' },
        { label: 'First', value: 'first' },
        { label: 'Third', value: 'third' },
      ],
    });
  });
});
