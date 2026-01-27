import { useDraggable } from '@dnd-kit/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type FieldTypeInfo, getFieldTypeLabel, getFieldTypeDescription } from '@/lib/form-types';
import {
  Type,
  Mail,
  Hash,
  AlignLeft,
  ChevronDown,
  CheckSquare,
  Calendar,
  GripVertical,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FieldTypeSidebarProps {
  fieldTypes: FieldTypeInfo[];
}

export function FieldTypeSidebar({ fieldTypes }: FieldTypeSidebarProps) {
  const { t } = useTranslation();
  const translatedFieldTypes = fieldTypes.map((fieldType) => ({
    ...fieldType,
    label: getFieldTypeLabel(fieldType.type, t),
    description: getFieldTypeDescription(fieldType.type, t),
  }));
  return (
    <div className="w-64 border-r bg-background shrink-0">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm">{t('fieldTypeSidebar.title')}</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {t('fieldTypeSidebar.subtitle')}
        </p>
      </div>
      <ScrollArea className="h-[calc(100vh-12rem)]">
        <div className="p-3 space-y-2">
          {translatedFieldTypes.map((fieldType) => (
            <DraggableFieldType key={fieldType.type} fieldType={fieldType} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface DraggableFieldTypeProps {
  fieldType: FieldTypeInfo;
}

function DraggableFieldType({ fieldType }: DraggableFieldTypeProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `field-type-${fieldType.type}`,
    data: {
      type: 'field-type',
      fieldType: fieldType.type,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 p-3 rounded-lg border bg-background cursor-grab active:cursor-grabbing transition-all hover:border-primary/50 hover:shadow-sm ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      <div className="text-muted-foreground">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
        <FieldTypeIcon iconName={fieldType.icon} className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{fieldType.label}</p>
        <p className="text-xs text-muted-foreground truncate">
          {fieldType.description}
        </p>
      </div>
    </div>
  );
}

function FieldTypeIcon({ iconName, className }: { iconName: string; className?: string }) {
  switch (iconName) {
    case 'Type':
      return <Type className={className} />;
    case 'Mail':
      return <Mail className={className} />;
    case 'Hash':
      return <Hash className={className} />;
    case 'AlignLeft':
      return <AlignLeft className={className} />;
    case 'ChevronDown':
      return <ChevronDown className={className} />;
    case 'CheckSquare':
      return <CheckSquare className={className} />;
    case 'Calendar':
      return <Calendar className={className} />;
    default:
      return <Type className={className} />;
  }
}
