import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { api, type FormDetail } from '@/lib/api';
import {
  type FormField,
  type FieldType,
  FIELD_TYPES,
  createField,
} from '@/lib/form-types';
import { FieldTypeSidebar } from '@/components/form-editor/FieldTypeSidebar';
import { FieldCard } from '@/components/form-editor/FieldCard';
import { FieldConfigPanel } from '@/components/form-editor/FieldConfigPanel';
import { FormCanvas } from '@/components/form-editor/FormCanvas';
import {
  AworkIntegrationSettings,
  type AworkIntegrationConfig,
  parseAworkConfig,
  serializeAworkConfig,
} from '@/components/form-editor/AworkIntegrationSettings';
import {
  ArrowLeft,
  Save,
  Eye,
  Loader2,
} from 'lucide-react';

export function FormEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormDetail | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedFieldType, setDraggedFieldType] = useState<FieldType | null>(null);
  const [aworkConfig, setAworkConfig] = useState<AworkIntegrationConfig>({
    actionType: null,
    projectId: null,
    projectTypeId: null,
    taskFieldMappings: [],
    projectFieldMappings: [],
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadForm = useCallback(async (formId: number) => {
    try {
      const data = await api.getForm(formId);
      setForm(data);
      setFormName(data.name);
      setFormDescription(data.description || '');
      setIsActive(data.isActive);

      // Parse fields from JSON
      if (data.fieldsJson) {
        try {
          const parsedFields = JSON.parse(data.fieldsJson);
          setFields(Array.isArray(parsedFields) ? parsedFields : []);
        } catch {
          setFields([]);
        }
      }

      // Parse awork integration config
      setAworkConfig(parseAworkConfig(
        data.actionType,
        data.aworkProjectId,
        data.aworkProjectTypeId,
        data.fieldMappingsJson
      ));
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load form',
        variant: 'destructive',
      });
      navigate('/forms');
    } finally {
      setIsLoading(false);
    }
  }, [navigate, toast]);

  useEffect(() => {
    if (id) {
      loadForm(parseInt(id));
    }
  }, [id, loadForm]);

  const handleSave = async () => {
    if (!id || !formName.trim()) {
      toast({
        title: 'Error',
        description: 'Form name is required',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const aworkData = serializeAworkConfig(aworkConfig);
      await api.updateForm(parseInt(id), {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        fieldsJson: JSON.stringify(fields),
        isActive,
        ...aworkData,
      });
      toast({
        title: 'Saved',
        description: 'Form saved successfully',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save form',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeIdStr = active.id.toString();

    // Check if this is a field type being dragged from sidebar
    if (activeIdStr.startsWith('field-type-')) {
      const fieldType = activeIdStr.replace('field-type-', '') as FieldType;
      setDraggedFieldType(fieldType);
    } else {
      // Existing field being reordered
      setActiveId(activeIdStr);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Reset drag state
    setActiveId(null);
    setDraggedFieldType(null);

    if (!over) return;

    const activeIdStr = active.id.toString();
    const overIdStr = over.id.toString();

    // Check if dropping a new field type onto the canvas
    if (activeIdStr.startsWith('field-type-')) {
      const fieldType = activeIdStr.replace('field-type-', '') as FieldType;
      const newField = createField(fieldType);

      if (overIdStr === 'form-canvas' || fields.length === 0) {
        // Drop on empty canvas or canvas drop zone
        setFields([...fields, newField]);
      } else {
        // Drop on existing field - insert before that field
        const overIndex = fields.findIndex((f) => f.id === overIdStr);
        if (overIndex !== -1) {
          const newFields = [...fields];
          newFields.splice(overIndex, 0, newField);
          setFields(newFields);
        } else {
          setFields([...fields, newField]);
        }
      }
      setSelectedFieldId(newField.id);
      return;
    }

    // Reordering existing fields
    if (activeIdStr !== overIdStr && overIdStr !== 'form-canvas') {
      const oldIndex = fields.findIndex((f) => f.id === activeIdStr);
      const newIndex = fields.findIndex((f) => f.id === overIdStr);

      if (oldIndex !== -1 && newIndex !== -1) {
        setFields(arrayMove(fields, oldIndex, newIndex));
      }
    }
  };

  const handleFieldSelect = (fieldId: string) => {
    setSelectedFieldId(fieldId === selectedFieldId ? null : fieldId);
  };

  const handleFieldUpdate = (fieldId: string, updates: Partial<FormField>) => {
    setFields(
      fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
    );
  };

  const handleFieldDelete = (fieldId: string) => {
    setFields(fields.filter((f) => f.id !== fieldId));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const handleFieldDuplicate = (fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (field) {
      const newField = {
        ...field,
        id: crypto.randomUUID(),
        label: `${field.label} (Copy)`,
      };
      const index = fields.findIndex((f) => f.id === fieldId);
      const newFields = [...fields];
      newFields.splice(index + 1, 0, newField);
      setFields(newFields);
      setSelectedFieldId(newField.id);
    }
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/forms')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{formName || 'Untitled Form'}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={isActive ? 'default' : 'secondary'}>
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
              <span>·</span>
              <span>{fields.length} fields</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {form?.publicId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/f/${form.publicId}`, '_blank')}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Left Sidebar - Field Types */}
          <FieldTypeSidebar fieldTypes={FIELD_TYPES} />

          {/* Center - Form Canvas */}
          <div className="flex-1 overflow-auto bg-muted/30">
            <div className="max-w-2xl mx-auto p-6">
              {/* Form Settings */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base">Form Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="form-name">Form Name</Label>
                    <Input
                      id="form-name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Enter form name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="form-description">Description (optional)</Label>
                    <Textarea
                      id="form-description"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Describe what this form is for"
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Form Status</Label>
                      <p className="text-sm text-muted-foreground">
                        {isActive ? 'Form is accepting submissions' : 'Form is not accepting submissions'}
                      </p>
                    </div>
                    <Switch
                      checked={isActive}
                      onCheckedChange={setIsActive}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* awork Integration Settings */}
              <div className="mb-6">
                <AworkIntegrationSettings
                  formFields={fields}
                  config={aworkConfig}
                  onChange={setAworkConfig}
                />
              </div>

              <Separator className="my-6" />

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">Form Fields</h2>
                  <p className="text-sm text-muted-foreground">
                    Drag fields from the sidebar to add them
                  </p>
                </div>

                <FormCanvas
                  fields={fields}
                  selectedFieldId={selectedFieldId}
                  onFieldSelect={handleFieldSelect}
                  onFieldDelete={handleFieldDelete}
                  onFieldDuplicate={handleFieldDuplicate}
                />
              </div>
            </div>
          </div>

          {/* Right Sidebar - Field Configuration */}
          <div className="w-80 border-l bg-background shrink-0">
            <ScrollArea className="h-full">
              <div className="p-4">
                {selectedField ? (
                  <FieldConfigPanel
                    field={selectedField}
                    onUpdate={(updates) =>
                      handleFieldUpdate(selectedField.id, updates)
                    }
                    onClose={() => setSelectedFieldId(null)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <svg
                      className="w-10 h-10 mb-3 opacity-50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <p className="text-sm font-medium">No field selected</p>
                    <p className="text-xs mt-1 text-center px-4">
                      Click on a field to configure its properties
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeId && (
              <FieldCard
                field={fields.find((f) => f.id === activeId)!}
                isSelected={false}
                isDragging
              />
            )}
            {draggedFieldType && (
              <div className="bg-background border rounded-lg shadow-lg p-4 w-64 opacity-90">
                <p className="font-medium">
                  {FIELD_TYPES.find((ft) => ft.type === draggedFieldType)?.label}
                </p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
