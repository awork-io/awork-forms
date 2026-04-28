import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { FieldConfigDialog } from './FieldConfigDialog';
import type { AworkIntegrationConfig } from './AworkIntegrationSettings';
import type { FormField } from '@/lib/form-types';

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core');
  return {
    ...actual,
    DndContext: ({
      children,
      onDragEnd,
    }: {
      children: React.ReactNode;
      onDragEnd: (event: { active: { id: string }; over: { id: string } }) => void;
    }) => (
      <div>
        {children}
        <button
          type="button"
          onClick={() => onDragEnd({ active: { id: 'first-0' }, over: { id: 'second-1' } })}
        >
          Simulate drag
        </button>
      </div>
    ),
  };
});

vi.mock('@dnd-kit/sortable', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/sortable')>('@dnd-kit/sortable');
  return {
    ...actual,
    useSortable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
      isDragging: false,
    }),
  };
});

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

    await user.click(screen.getByRole('button', { name: 'Simulate drag' }));

    expect(onUpdate).toHaveBeenCalledWith('field-1', {
      options: [
        { label: 'Second', value: 'second' },
        { label: 'First', value: 'first' },
        { label: 'Third', value: 'third' },
      ],
    });
  });
});
