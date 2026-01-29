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
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { api, type FormDetail } from '@/lib/api';
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
import {
  ArrowLeft,
  Save,
  Eye,
  Loader2,
  Share2,
} from 'lucide-react';
import { ShareFormDialog } from '@/components/form-editor/ShareFormDialog';
import { useTranslation } from 'react-i18next';
import { trackEvent, trackScreenSeen } from '@/lib/tracking';

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
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);

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
  const translationLanguages = [
    { code: 'de', label: t('language.german') },
    { code: 'en', label: t('language.english') },
  ];

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
      <div className="border-b bg-white/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/forms')}
            className="hover:bg-muted/80"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">{formName || t('formEditor.untitled')}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge 
                variant={isActive ? 'default' : 'secondary'}
                className={isActive ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0' : ''}
              >
                {isActive ? t('common.active') : t('common.inactive')}
              </Badge>
              <span>·</span>
              <span>{t('common.fieldsCount', { count: fields.length })}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {form?.publicId && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/f/${form.publicId}`, '_blank')}
                className="hover:bg-muted/80"
              >
                <Eye className="w-4 h-4 mr-2" />
                {t('formEditor.preview')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsShareDialogOpen(true)}
                className="hover:bg-muted/80"
              >
                <Share2 className="w-4 h-4 mr-2" />
                {t('formEditor.share')}
              </Button>
            </>
          )}
          <Button 
            size="sm" 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {t('formEditor.save')}
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
          {/* Center - Form Canvas */}
          <div className="flex-1 overflow-auto bg-muted/30">
            <div className="max-w-2xl mx-auto p-6">
              {/* Form Settings */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base">{t('formEditor.formSettings')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="form-name">{t('formEditor.formName')}</Label>
                    <Input
                      id="form-name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder={t('formEditor.formNamePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="form-description">{t('formEditor.descriptionLabel')}</Label>
                    <Textarea
                      id="form-description"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder={t('formEditor.descriptionPlaceholder')}
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('formEditor.formStatus')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {isActive ? t('formEditor.formStatusActive') : t('formEditor.formStatusInactive')}
                      </p>
                    </div>
                    <Switch
                      checked={isActive}
                      onCheckedChange={setIsActive}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base">{t('formEditor.translations.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {t('formEditor.translations.description')}
                  </p>
                  <Tabs defaultValue={defaultTranslationLanguage} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      {translationLanguages.map((language) => (
                        <TabsTrigger key={language.code} value={language.code} className="text-xs">
                          {language.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {translationLanguages.map((language) => (
                      <TabsContent key={language.code} value={language.code} className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label>{t('formEditor.translations.formName')}</Label>
                          <Input
                            value={nameTranslations[language.code] || ''}
                            onChange={(e) =>
                              setNameTranslations((prev) => ({
                                ...prev,
                                [language.code]: e.target.value,
                              }))
                            }
                            placeholder={formName || t('formEditor.formNamePlaceholder')}
                          />
                          <p className="text-xs text-muted-foreground">
                            {t('formEditor.translations.fallbackHint')}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>{t('formEditor.translations.formDescription')}</Label>
                          <Textarea
                            value={descriptionTranslations[language.code] || ''}
                            onChange={(e) =>
                              setDescriptionTranslations((prev) => ({
                                ...prev,
                                [language.code]: e.target.value,
                              }))
                            }
                            placeholder={formDescription || t('formEditor.descriptionPlaceholder')}
                            rows={2}
                          />
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>

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
                />
              </div>

              <Separator className="my-6" />

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
                />
              </div>
            </div>
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
      const trimmed = value.trim();
      if (!trimmed) return acc;
      if (fallbackValue && trimmed === fallbackValue) return acc;
      acc[language] = trimmed;
      return acc;
    },
    {}
  );

  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}
