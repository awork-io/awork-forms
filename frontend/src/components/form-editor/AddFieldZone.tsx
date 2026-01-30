import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { type FieldType, type FieldTypeInfo, getTranslatedFieldTypes } from '@/lib/form-types';
import {
  Type,
  Mail,
  Hash,
  AlignLeft,
  ChevronDown,
  CheckSquare,
  Calendar,
  Paperclip,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AddFieldZoneProps {
  onAddField: (fieldType: FieldType) => void;
  isFirst?: boolean;
}

export function AddFieldZone({ onAddField, isFirst }: AddFieldZoneProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const fieldTypes = getTranslatedFieldTypes(t);

  const handleSelect = (fieldType: FieldType) => {
    onAddField(fieldType);
    setIsOpen(false);
  };

  return (
    <div className={`group relative ${isFirst ? 'pt-0' : 'py-2'}`}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-[12px] border-2 border-dashed
              border-gray-200 hover:border-primary/40 hover:bg-primary/5
              text-gray-400 hover:text-primary
              transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs font-medium">{t('addField.button')}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="center">
          <div className="grid grid-cols-2 gap-1">
            {fieldTypes.map((fieldType) => (
              <FieldTypeButton
                key={fieldType.type}
                fieldType={fieldType}
                onClick={() => handleSelect(fieldType.type)}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface FieldTypeButtonProps {
  fieldType: FieldTypeInfo;
  onClick: () => void;
}

function FieldTypeButton({ fieldType, onClick }: FieldTypeButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 p-2 rounded-[8px] hover:bg-accent
        text-left transition-colors"
    >
      <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
        <FieldTypeIcon iconName={fieldType.icon} className="w-3.5 h-3.5 text-primary" />
      </div>
      <span className="text-sm font-medium truncate">{fieldType.label}</span>
    </button>
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
    case 'Paperclip':
      return <Paperclip className={className} />;
    default:
      return <Type className={className} />;
  }
}
