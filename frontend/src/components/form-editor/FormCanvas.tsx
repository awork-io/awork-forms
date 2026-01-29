import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { type FormField, type FieldType } from '@/lib/form-types';
import { SortableFieldCard } from './SortableFieldCard';
import { AddFieldZone } from './AddFieldZone';
import { useTranslation } from 'react-i18next';

interface FormCanvasProps {
  fields: FormField[];
  selectedFieldId: string | null;
  onFieldSelect: (fieldId: string) => void;
  onFieldDelete: (fieldId: string) => void;
  onFieldDuplicate: (fieldId: string) => void;
  onAddField: (fieldType: FieldType, atIndex: number) => void;
  taskMappingByFieldId?: Record<string, string>;
  projectMappingByFieldId?: Record<string, string>;
}

export function FormCanvas({
  fields,
  selectedFieldId,
  onFieldSelect,
  onFieldDelete,
  onFieldDuplicate,
  onAddField,
  taskMappingByFieldId,
  projectMappingByFieldId,
}: FormCanvasProps) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({
    id: 'form-canvas',
  });

  return (
    <SortableContext
      items={fields.map((f) => f.id)}
      strategy={verticalListSortingStrategy}
    >
      <div
        ref={setNodeRef}
        className={`min-h-[200px] rounded-lg transition-colors ${
          isOver ? 'bg-primary/5' : ''
        }`}
      >
        {fields.length === 0 ? (
          <div className="border-2 border-dashed border-muted-foreground/25 bg-muted/50 rounded-lg">
            <AddFieldZone onAddField={(type) => onAddField(type, 0)} isFirst />
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <svg
                className="w-10 h-10 mb-3 opacity-40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <p className="text-sm font-medium">{t('formCanvas.emptyTitle')}</p>
              <p className="text-xs mt-1">
                {t('formCanvas.emptySubtitle')}
              </p>
            </div>
          </div>
        ) : (
          <div>
            {fields.map((field, index) => (
              <div key={field.id}>
                <AddFieldZone onAddField={(type) => onAddField(type, index)} />
                <SortableFieldCard
                  field={field}
                  isSelected={selectedFieldId === field.id}
                  onSelect={() => onFieldSelect(field.id)}
                  onDelete={() => onFieldDelete(field.id)}
                  onDuplicate={() => onFieldDuplicate(field.id)}
                  taskMappingLabel={taskMappingByFieldId?.[field.id]}
                  projectMappingLabel={projectMappingByFieldId?.[field.id]}
                />
              </div>
            ))}
            <AddFieldZone onAddField={(type) => onAddField(type, fields.length)} />
          </div>
        )}
      </div>
    </SortableContext>
  );
}
