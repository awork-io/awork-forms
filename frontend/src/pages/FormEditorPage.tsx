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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { api, type AworkCustomFieldDefinition, type FormDetail } from '@/lib/api';
import {
  type FormField,
  type FieldType,
  createField,
  getFieldTypeLabel,
} from '@/lib/form-types';
import { FieldCard } from '@/components/form-editor/FieldCard';
import { FieldConfigDialog } from '@/components/form-editor/FieldConfigDialog';
import { FormCanvas } from '@/components/form-editor/FormCanvas';
import {
  AworkIntegrationSettings,
  type AworkIntegrationConfig,
  parseAworkConfig,
  serializeAworkConfig,
} from '@/components/form-editor/AworkIntegrationSettings';
import {
  StyleEditor,
  type FormStyling,
  parseStyling,
  serializeStyling,
} from '@/components/form-editor/StyleEditor';
import { Loader2 } from 'lucide-react';
import { ShareFormDialog } from '@/components/form-editor/ShareFormDialog';
import { useTranslation } from 'react-i18next';
import { trackEvent, trackScreenSeen } from '@/lib/tracking';
import { FormEditorHeader } from '@/components/form-editor/FormEditorHeader';
import { FormEditorMetaPanel } from '@/components/form-editor/FormEditorMetaPanel';
import {
  resolveProjectMappingLabel,
  resolveTaskMappingLabel,
} from '@/components/form-editor/awork-field-options';

export function FormEditorPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormDetail | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [nameTranslations, setNameTranslations] = useState<Record<string, string>>({});
  const [descriptionTranslations, setDescriptionTranslations] = useState<Record<string, string>>({});
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedFieldType, setDraggedFieldType] = useState<FieldType | null>(null);
  const [aworkConfig, setAworkConfig] = useState<AworkIntegrationConfig>({
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
  });
  const [styling, setStyling] = useState<FormStyling>({
    primaryColor: '#3B82F6',
    backgroundColor: '#F8FAFC',
    logoUrl: null,
  });
  const [aworkCustomFields, setAworkCustomFields] = useState<AworkCustomFieldDefinition[]>([]);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [translationsEnabled, setTranslationsEnabled] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
        delay: 100,
        tolerance: 5,
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
      setNameTranslations(data.nameTranslations || {});
      setDescriptionTranslations(data.descriptionTranslations || {});
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
        data.aworkTaskListId,
        data.aworkTaskStatusId,
        data.aworkTypeOfWorkId,
        data.aworkAssigneeId,
        data.aworkTaskIsPriority,
        data.aworkTaskTag,
        data.fieldMappingsJson
      ));

      // Parse styling config
      setStyling(parseStyling(
        data.primaryColor,
        data.backgroundColor,
        data.logoUrl
      ));
    } catch {
      toast({
        title: t('common.error'),
        description: t('formEditor.toast.loadError'),
        variant: 'destructive',
      });
      navigate('/forms');
    } finally {
      setIsLoading(false);
    }
  }, [navigate, toast, t]);

  useEffect(() => {
    if (id) {
      loadForm(parseInt(id));
      trackScreenSeen(2); // Form editor screen
    }
  }, [id, loadForm]);

  const handleSave = async () => {
    if (!id || !formName.trim()) {
      toast({
        title: t('common.error'),
        description: t('formEditor.toast.nameRequired'),
        variant: 'destructive',
      });
      return;
    }

    // Validate project is selected when action type requires it
    const needsProject = aworkConfig.actionType === 'task' || aworkConfig.actionType === 'both';
    if (needsProject && !aworkConfig.projectId) {
      toast({
        title: t('common.error'),
        description: t('formEditor.toast.projectRequired'),
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const aworkData = serializeAworkConfig(aworkConfig);
      const stylingData = serializeStyling(styling);
      const normalizedNameTranslations = normalizeTranslations(nameTranslations, formName) ?? {};
      const normalizedDescriptionTranslations = normalizeTranslations(descriptionTranslations, formDescription) ?? {};
      await api.updateForm(parseInt(id), {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        nameTranslations: normalizedNameTranslations,
        descriptionTranslations: normalizedDescriptionTranslations,
        fieldsJson: JSON.stringify(fields),
        isActive,
        ...aworkData,
        ...stylingData,
      });
      trackEvent('Forms User Action', { 
        action: 'form_saved', 
        tool: 'awork-forms', 
        formId: parseInt(id),
        fieldCount: fields.length,
        actionType: aworkConfig.actionType,
      });
      toast({
        title: t('formEditor.toast.saveSuccessTitle'),
        description: t('formEditor.toast.saveSuccessDesc'),
      });
    } catch {
      toast({
        title: t('common.error'),
        description: t('formEditor.toast.saveError'),
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
      const newField = createField(fieldType, t);

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
    setSelectedFieldId(fieldId);
    setIsFieldDialogOpen(true);
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
    setAworkConfig((prev) => ({
      ...prev,
      taskFieldMappings: prev.taskFieldMappings.filter((mapping) => mapping.formFieldId !== fieldId),
      projectFieldMappings: prev.projectFieldMappings.filter((mapping) => mapping.formFieldId !== fieldId),
    }));
  };

  const handleFieldDuplicate = (fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (field) {
      const newField = {
        ...field,
        id: crypto.randomUUID(),
        label: `${field.label} (${t('formEditor.copySuffix')})`,
      };
      const index = fields.findIndex((f) => f.id === fieldId);
      const newFields = [...fields];
      newFields.splice(index + 1, 0, newField);
      setFields(newFields);
      setSelectedFieldId(newField.id);
    }
  };

  const handleAddField = (fieldType: FieldType, atIndex: number) => {
    const newField = createField(fieldType, t);
    const newFields = [...fields];
    newFields.splice(atIndex, 0, newField);
    setFields(newFields);
    setSelectedFieldId(newField.id);
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId);
  const defaultTranslationLanguage = getSupportedLanguage(i18n.resolvedLanguage || i18n.language);
  const showTaskMappings = aworkConfig.actionType === 'task' || aworkConfig.actionType === 'both';
  const showProjectMappings = aworkConfig.actionType === 'project' || aworkConfig.actionType === 'both';
  const taskMappingByFieldId = showTaskMappings
    ? Object.fromEntries(
        aworkConfig.taskFieldMappings.map((mapping) => [
          mapping.formFieldId,
          resolveTaskMappingLabel(mapping, t, aworkCustomFields),
        ])
      )
    : {};
  const projectMappingByFieldId = showProjectMappings
    ? Object.fromEntries(
        aworkConfig.projectFieldMappings.map((mapping) => [
          mapping.formFieldId,
          resolveProjectMappingLabel(mapping, t),
        ])
      )
    : {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <FormEditorHeader
        formName={formName}
        isActive={isActive}
        fieldsCount={fields.length}
        publicId={form?.publicId}
        onBack={() => navigate('/forms')}
        onPreview={() => window.open(`/f/${form?.publicId}`, '_blank')}
        onShare={() => setIsShareDialogOpen(true)}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Center - Form Canvas */}
        <div className="flex-1 overflow-auto bg-muted/30">
          <div className="max-w-2xl mx-auto p-6 pb-12">
            <FormEditorMetaPanel
              formName={formName}
              formDescription={formDescription}
              isActive={isActive}
              onFormNameChange={(event) => setFormName(event.target.value)}
              onFormDescriptionChange={(event) => setFormDescription(event.target.value)}
              onActiveChange={setIsActive}
              nameTranslations={nameTranslations}
              descriptionTranslations={descriptionTranslations}
              onNameTranslationChange={(language, value) =>
                setNameTranslations((prev) => ({ ...prev, [language]: value }))
              }
              onDescriptionTranslationChange={(language, value) =>
                setDescriptionTranslations((prev) => ({ ...prev, [language]: value }))
              }
              defaultTranslationLanguage={defaultTranslationLanguage}
              translationsEnabled={translationsEnabled}
              onTranslationsEnabledChange={setTranslationsEnabled}
            />

            {/* Form Styling */}
            {form && (
              <div className="mb-6">
                <StyleEditor
                  formId={form.id}
                  formName={formName}
                  formDescription={formDescription}
                  styling={styling}
                  onChange={setStyling}
                  fields={fields}
                />
              </div>
            )}

            {/* awork Integration Settings */}
            <div className="mb-6">
              <AworkIntegrationSettings
                formFields={fields}
                config={aworkConfig}
                onChange={setAworkConfig}
                onCustomFieldsChange={setAworkCustomFields}
              />
            </div>

            <Separator className="my-6" />

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {/* Form Fields */}
              <div className="space-y-4">
                <h2 className="text-base font-semibold">{t('formEditor.formFields')}</h2>

                <FormCanvas
                  fields={fields}
                  selectedFieldId={selectedFieldId}
                  onFieldSelect={handleFieldSelect}
                  onFieldDelete={handleFieldDelete}
                  onFieldDuplicate={handleFieldDuplicate}
                  onAddField={handleAddField}
                  taskMappingByFieldId={taskMappingByFieldId}
                  projectMappingByFieldId={projectMappingByFieldId}
                />
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
                      {getFieldTypeLabel(draggedFieldType, t)}
                    </p>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </div>

      {/* Share Form Dialog */}
      {form?.publicId && (
        <ShareFormDialog
          open={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          publicId={form.publicId}
          formName={formName || t('formEditor.untitled')}
          isActive={isActive}
        />
      )}

      {/* Field Config Dialog */}
      <FieldConfigDialog
        field={selectedField || null}
        open={isFieldDialogOpen}
        onOpenChange={setIsFieldDialogOpen}
        onUpdate={handleFieldUpdate}
        onDelete={handleFieldDelete}
        aworkConfig={aworkConfig}
        onAworkConfigChange={setAworkConfig}
        aworkCustomFields={aworkCustomFields}
        translationsEnabled={translationsEnabled}
      />
    </div>
  );
}

function getSupportedLanguage(language?: string) {
  if (!language) return 'en';
  if (language.toLowerCase().startsWith('de')) {
    return 'de';
  }
  return 'en';
}

function normalizeTranslations(
  translations: Record<string, string>,
  fallback: string
): Record<string, string> | undefined {
  const fallbackValue = fallback.trim();
  const cleaned = Object.entries(translations).reduce<Record<string, string>>(
    (acc, [language, value]) => {
      // Allow spaces during editing, only check if empty
      if (!value || value.length === 0) return acc;
      const trimmed = value.trim();
      if (fallbackValue && trimmed === fallbackValue) return acc;
      acc[language] = value; // Keep original value with spaces
      return acc;
    },
    {}
  );

  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}
