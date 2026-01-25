import { type FormField } from '@/lib/form-types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Type,
  Mail,
  Hash,
  AlignLeft,
  ChevronDown,
  CheckSquare,
  Calendar,
  GripVertical,
  MoreVertical,
  Copy,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldCardProps {
  field: FormField;
  isSelected: boolean;
  isDragging?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function FieldCard({
  field,
  isSelected,
  isDragging,
  onSelect,
  onDelete,
  onDuplicate,
  dragHandleProps,
}: FieldCardProps) {
  return (
    <Card
      className={cn(
        'transition-all cursor-pointer group',
        isSelected && 'ring-2 ring-primary border-primary',
        isDragging && 'shadow-lg opacity-90'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <div
            {...dragHandleProps}
            className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
          >
            <GripVertical className="w-5 h-5" />
          </div>

          {/* Field Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <FieldIcon type={field.type} className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* Field Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{field.label}</p>
              {field.required && (
                <Badge variant="secondary" className="text-xs">
                  Required
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground capitalize">
              {getFieldTypeLabel(field.type)}
              {field.placeholder && (
                <span className="text-muted-foreground/60">
                  {' · '}
                  {field.placeholder}
                </span>
              )}
            </p>
            {field.type === 'select' && field.options && (
              <p className="text-xs text-muted-foreground mt-1">
                {field.options.length} option{field.options.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Actions */}
          <div
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Field Preview */}
        <div className="mt-3 pl-8">
          <FieldPreview field={field} />
        </div>
      </CardContent>
    </Card>
  );
}

function FieldIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'text':
      return <Type className={className} />;
    case 'email':
      return <Mail className={className} />;
    case 'number':
      return <Hash className={className} />;
    case 'textarea':
      return <AlignLeft className={className} />;
    case 'select':
      return <ChevronDown className={className} />;
    case 'checkbox':
      return <CheckSquare className={className} />;
    case 'date':
      return <Calendar className={className} />;
    default:
      return <Type className={className} />;
  }
}

function FieldPreview({ field }: { field: FormField }) {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'number':
      return (
        <div className="h-9 rounded-md border bg-muted/50 px-3 flex items-center text-sm text-muted-foreground">
          {field.placeholder || `Enter ${field.type}`}
        </div>
      );
    case 'textarea':
      return (
        <div className="h-20 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          {field.placeholder || 'Enter text...'}
        </div>
      );
    case 'select':
      return (
        <div className="h-9 rounded-md border bg-muted/50 px-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>Select an option</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      );
    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border bg-muted/50" />
          <span className="text-sm text-muted-foreground">{field.label}</span>
        </div>
      );
    case 'date':
      return (
        <div className="h-9 rounded-md border bg-muted/50 px-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>Select a date</span>
          <Calendar className="w-4 h-4" />
        </div>
      );
    default:
      return null;
  }
}

function getFieldTypeLabel(type: string): string {
  switch (type) {
    case 'text':
      return 'Text';
    case 'email':
      return 'Email';
    case 'number':
      return 'Number';
    case 'textarea':
      return 'Long Text';
    case 'select':
      return 'Dropdown';
    case 'checkbox':
      return 'Checkbox';
    case 'date':
      return 'Date';
    default:
      return type;
  }
}
