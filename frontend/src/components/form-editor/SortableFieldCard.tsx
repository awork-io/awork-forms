import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type FormField } from '@/lib/form-types';
import { FieldCard } from './FieldCard';

interface SortableFieldCardProps {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  taskMappingLabel?: string;
  projectMappingLabel?: string;
}

export function SortableFieldCard({
  field,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  taskMappingLabel,
  projectMappingLabel,
}: SortableFieldCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: field.id,
    data: {
      type: 'field',
      field,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <FieldCard
        field={field}
        isSelected={isSelected}
        isDragging={isDragging}
        onSelect={onSelect}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        taskMappingLabel={taskMappingLabel}
        projectMappingLabel={projectMappingLabel}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}
