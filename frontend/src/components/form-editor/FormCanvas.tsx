import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { type FormField } from '@/lib/form-types';
import { SortableFieldCard } from './SortableFieldCard';

interface FormCanvasProps {
  fields: FormField[];
  selectedFieldId: string | null;
  onFieldSelect: (fieldId: string) => void;
  onFieldDelete: (fieldId: string) => void;
  onFieldDuplicate: (fieldId: string) => void;
}

export function FormCanvas({
  fields,
  selectedFieldId,
  onFieldSelect,
  onFieldDelete,
  onFieldDuplicate,
}: FormCanvasProps) {
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
        className={`min-h-[200px] rounded-lg border-2 border-dashed transition-colors ${
          fields.length === 0
            ? 'border-muted-foreground/25 bg-muted/50'
            : 'border-transparent'
        } ${isOver ? 'border-primary bg-primary/5' : ''}`}
      >
        {fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <svg
              className="w-12 h-12 mb-4 opacity-50"
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
            <p className="text-sm font-medium">No fields yet</p>
            <p className="text-xs mt-1">
              Drag and drop fields from the sidebar
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field) => (
              <SortableFieldCard
                key={field.id}
                field={field}
                isSelected={selectedFieldId === field.id}
                onSelect={() => onFieldSelect(field.id)}
                onDelete={() => onFieldDelete(field.id)}
                onDuplicate={() => onFieldDuplicate(field.id)}
              />
            ))}
          </div>
        )}
      </div>
    </SortableContext>
  );
}
