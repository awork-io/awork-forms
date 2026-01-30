import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField as FormFieldWrapper } from '@/components/ui/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Loader2, Link2, AlertCircle } from 'lucide-react';
import {
  api,
  type AworkProject,
  type AworkProjectType,
  type AworkTaskStatus,
  type AworkTaskList,
  type AworkTypeOfWork,
  type AworkUser,
  type AworkCustomFieldDefinition,
} from '@/lib/api';
import type { FormField } from '@/lib/form-types';
import { useTranslation } from 'react-i18next';

export type ActionType = 'task' | 'project' | 'both' | null;

export interface FieldMapping {
  formFieldId: string;
  aworkField: string;
  aworkFieldLabel: string;
}

export interface AworkIntegrationConfig {
  actionType: ActionType;
  projectId: string | null;
  projectTypeId: string | null;
  taskListId: string | null;
  taskStatusId: string | null;
  typeOfWorkId: string | null;
  assigneeId: string | null;
  isPriority: boolean;
  taskTag: string | null;
  taskFieldMappings: FieldMapping[];
  projectFieldMappings: FieldMapping[];
}

interface AworkIntegrationSettingsProps {
  formFields: FormField[];
  config: AworkIntegrationConfig;
  onChange: Dispatch<SetStateAction<AworkIntegrationConfig>>;
  onCustomFieldsChange?: (fields: AworkCustomFieldDefinition[]) => void;
}

export function AworkIntegrationSettings({
  formFields,
  config,
  onChange,
  onCustomFieldsChange,
}: AworkIntegrationSettingsProps) {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<AworkProject[]>([]);
  const [projectTypes, setProjectTypes] = useState<AworkProjectType[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<AworkTaskStatus[]>([]);
  const [taskLists, setTaskLists] = useState<AworkTaskList[]>([]);
  const [typesOfWork, setTypesOfWork] = useState<AworkTypeOfWork[]>([]);
  const [users, setUsers] = useState<AworkUser[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingProjectTypes, setIsLoadingProjectTypes] = useState(false);
  const [isLoadingTaskData, setIsLoadingTaskData] = useState(false);
  const [aworkError, setAworkError] = useState<string | null>(null);

  // Fetch awork projects
  const fetchProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    setAworkError(null);
    try {
      const data = await api.getAworkProjects();
      setProjects(data);
    } catch (err) {
      const error = err as Error;
      if (error.message.includes('TOKEN_EXPIRED') || error.message.includes('Unauthorized')) {
        setAworkError(t('aworkIntegration.errors.sessionExpired'));
      } else {
        setAworkError(t('aworkIntegration.errors.loadProjects'));
      }
    } finally {
      setIsLoadingProjects(false);
    }
  }, [t]);

  // Fetch awork project types
  const fetchProjectTypes = useCallback(async () => {
    setIsLoadingProjectTypes(true);
    setAworkError(null);
    try {
      const data = await api.getAworkProjectTypes();
      setProjectTypes(data);
    } catch (err) {
      const error = err as Error;
      if (error.message.includes('TOKEN_EXPIRED') || error.message.includes('Unauthorized')) {
        setAworkError(t('aworkIntegration.errors.sessionExpired'));
      } else {
        setAworkError(t('aworkIntegration.errors.loadProjectTypes'));
      }
    } finally {
      setIsLoadingProjectTypes(false);
    }
  }, [t]);

  // Fetch task custom field definitions (workspace-wide, not project-specific)
  const fetchTaskCustomFields = useCallback(async () => {
    try {
      const customFieldsData = await api.getAworkTaskCustomFields();
      onCustomFieldsChange?.(customFieldsData.filter(f => !f.isArchived));
    } catch (err) {
      const error = err as Error;
      if (error.message.includes('TOKEN_EXPIRED') || error.message.includes('Unauthorized')) {
        setAworkError(t('aworkIntegration.errors.sessionExpired'));
      }
      onCustomFieldsChange?.([]);
    }
  }, [onCustomFieldsChange, t]);

  // Fetch task-related data (statuses, lists, types of work, users)
  const fetchTaskData = useCallback(async (projectId: string) => {
    setIsLoadingTaskData(true);
    setAworkError(null);
    try {
      const [statusesData, listsData, typesData, usersData] = await Promise.all([
        api.getAworkTaskStatuses(projectId),
        api.getAworkTaskLists(projectId),
        api.getAworkTypesOfWork(),
        api.getAworkUsers(),
      ]);
      setTaskStatuses(statusesData);
      setTaskLists(listsData);
      setTypesOfWork(typesData.filter((type) => !type.isArchived));
      setUsers(usersData.filter(u => !u.isArchived && !u.isExternal));
    } catch (err) {
      const error = err as Error;
      if (error.message.includes('TOKEN_EXPIRED') || error.message.includes('Unauthorized')) {
        setAworkError(t('aworkIntegration.errors.sessionExpired'));
      } else {
        setAworkError(t('aworkIntegration.errors.loadTaskData'));
      }
    } finally {
      setIsLoadingTaskData(false);
    }
  }, [t]);

  // Load awork data when action type requires it
  useEffect(() => {
    if (config.actionType === 'task' || config.actionType === 'both') {
      fetchProjects();
      fetchTaskCustomFields();
    } else {
      onCustomFieldsChange?.([]);
    }
    if (config.actionType === 'project' || config.actionType === 'both') {
      fetchProjectTypes();
    }
  }, [config.actionType, fetchProjects, fetchProjectTypes, fetchTaskCustomFields, onCustomFieldsChange]);

  // Load task-specific data when project is selected
  useEffect(() => {
    if (config.projectId && (config.actionType === 'task' || config.actionType === 'both')) {
      fetchTaskData(config.projectId);
    } else {
      // Reset task data when no project is selected
      setTaskStatuses([]);
      setTaskLists([]);
      setTypesOfWork([]);
      setUsers([]);
    }
  }, [config.projectId, config.actionType, fetchTaskData]);

  const handleActionTypeChange = (value: string) => {
    const actionType = value === 'none' ? null : (value as ActionType);
    onChange((prev) => ({
      ...prev,
      actionType,
      // Reset selections when action type changes
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
    }));
  };

  const handleProjectChange = (projectId: string) => {
    onChange((prev) => ({
      ...prev,
      projectId: projectId === 'none' ? null : projectId,
      // Reset task-specific settings when project changes
      taskListId: null,
      taskStatusId: null,
    }));
  };

  const handleProjectTypeChange = (projectTypeId: string) => {
    onChange((prev) => ({
      ...prev,
      projectTypeId: projectTypeId === 'none' ? null : projectTypeId,
    }));
  };

  const handleTaskListChange = (taskListId: string) => {
    onChange((prev) => ({
      ...prev,
      taskListId: taskListId === 'none' ? null : taskListId,
    }));
  };

  const handleTaskStatusChange = (taskStatusId: string) => {
    onChange((prev) => ({
      ...prev,
      taskStatusId: taskStatusId === 'none' ? null : taskStatusId,
    }));
  };

  const handleTypeOfWorkChange = (typeOfWorkId: string) => {
    onChange((prev) => ({
      ...prev,
      typeOfWorkId: typeOfWorkId === 'none' ? null : typeOfWorkId,
    }));
  };

  const handleAssigneeChange = (assigneeId: string) => {
    onChange((prev) => ({
      ...prev,
      assigneeId: assigneeId === 'none' ? null : assigneeId,
    }));
  };

  const handlePriorityChange = (isPriority: boolean) => {
    onChange((prev) => ({
      ...prev,
      isPriority,
    }));
  };

  const showTaskSettings = config.actionType === 'task' || config.actionType === 'both';
  const showProjectSettings = config.actionType === 'project' || config.actionType === 'both';

  const getUserDisplayName = (user: AworkUser): string => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.email || t('aworkIntegration.unknownUser');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          {t('aworkIntegration.title')}
        </CardTitle>
        <CardDescription>
          {t('aworkIntegration.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Alert */}
        {aworkError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{aworkError}</AlertDescription>
          </Alert>
        )}

        {/* Action Type Selector */}
        <FormFieldWrapper label={t('aworkIntegration.actionType.label')}>
          <Select
            value={config.actionType || 'none'}
            onValueChange={handleActionTypeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('aworkIntegration.actionType.placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('aworkIntegration.actionType.none')}</SelectItem>
              <SelectItem value="task">{t('aworkIntegration.actionType.task')}</SelectItem>
            </SelectContent>
          </Select>
        </FormFieldWrapper>

        {/* Task Settings */}
        {showTaskSettings && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{t('aworkIntegration.task.badge')}</Badge>
                <span className="text-sm font-medium">{t('aworkIntegration.task.settings')}</span>
              </div>

              {/* Project Selector */}
              <FormFieldWrapper
                label={t('aworkIntegration.task.addToProject')}
                required
                error={!config.projectId && !isLoadingProjects ? t('aworkIntegration.task.projectRequired') : undefined}
              >
                {isLoadingProjects ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('aworkIntegration.task.loadingProjects')}
                  </div>
                ) : (
                  <SearchableSelect
                    options={projects.map((project) => ({
                      value: project.id,
                      label: project.name,
                    }))}
                    value={config.projectId}
                    onValueChange={handleProjectChange}
                    placeholder={t('aworkIntegration.task.selectProject')}
                    searchPlaceholder={t('aworkIntegration.task.searchProjects')}
                    emptyText={t('aworkIntegration.task.noProjectsFound')}
                  />
                )}
                {projects.length === 0 && !isLoadingProjects && !aworkError && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchProjects}
                    className="mt-2"
                  >
                    {t('aworkIntegration.task.loadProjects')}
                  </Button>
                )}
              </FormFieldWrapper>

              {/* Task List Selector */}
              {config.projectId && (
                <FormFieldWrapper label={t('aworkIntegration.task.taskList')}>
                  {isLoadingTaskData ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('aworkIntegration.task.loadingTaskLists')}
                    </div>
                  ) : (
                    <SearchableSelect
                      options={[
                        { value: 'none', label: t('aworkIntegration.task.defaultTaskList') },
                        ...taskLists.map((list) => ({
                          value: list.id,
                          label: list.name,
                        })),
                      ]}
                      value={config.taskListId || 'none'}
                      onValueChange={handleTaskListChange}
                      placeholder={t('aworkIntegration.task.selectTaskList')}
                      searchPlaceholder={t('aworkIntegration.task.searchTaskLists')}
                      emptyText={t('aworkIntegration.task.noTaskListsFound')}
                    />
                  )}
                </FormFieldWrapper>
              )}

              {/* Task Status Selector */}
              {config.projectId && (
                <FormFieldWrapper label={t('aworkIntegration.task.taskStatus')}>
                  {isLoadingTaskData ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('aworkIntegration.task.loadingStatuses')}
                    </div>
                  ) : (
                    <SearchableSelect
                      options={[
                        { value: 'none', label: t('aworkIntegration.task.defaultStatus') },
                        ...taskStatuses.map((status) => ({
                          value: status.id,
                          label: status.name,
                        })),
                      ]}
                      value={config.taskStatusId || 'none'}
                      onValueChange={handleTaskStatusChange}
                      placeholder={t('aworkIntegration.task.selectStatus')}
                      searchPlaceholder={t('aworkIntegration.task.searchStatuses')}
                      emptyText={t('aworkIntegration.task.noStatusesFound')}
                    />
                  )}
                </FormFieldWrapper>
              )}

              {/* Type of Work Selector */}
              {config.projectId && (
                <FormFieldWrapper label={t('aworkIntegration.task.typeOfWork')}>
                  {isLoadingTaskData ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('aworkIntegration.task.loadingTypesOfWork')}
                    </div>
                  ) : (
                    <SearchableSelect
                      options={[
                        { value: 'none', label: t('aworkIntegration.task.noTypeOfWork') },
                        ...typesOfWork.map((type) => ({
                          value: type.id,
                          label: type.name,
                        })),
                      ]}
                      value={config.typeOfWorkId || 'none'}
                      onValueChange={handleTypeOfWorkChange}
                      placeholder={t('aworkIntegration.task.selectTypeOfWork')}
                      searchPlaceholder={t('aworkIntegration.task.searchTypesOfWork')}
                      emptyText={t('aworkIntegration.task.noTypesOfWorkFound')}
                    />
                  )}
                </FormFieldWrapper>
              )}

              {/* Assignee Selector */}
              {config.projectId && (
                <FormFieldWrapper label={t('aworkIntegration.task.assignTo')}>
                  {isLoadingTaskData ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('aworkIntegration.task.loadingUsers')}
                    </div>
                  ) : (
                    <SearchableSelect
                      options={[
                        { value: 'none', label: t('aworkIntegration.task.unassigned') },
                        ...users.map((user) => ({
                          value: user.id,
                          label: getUserDisplayName(user),
                          icon: user.profileImage ? (
                            <img 
                              src={user.profileImage} 
                              alt="" 
                              className="w-7 h-7 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium">
                              {(user.firstName?.[0] || user.email?.[0] || '?').toUpperCase()}
                            </div>
                          ),
                        })),
                      ]}
                      value={config.assigneeId || 'none'}
                      onValueChange={handleAssigneeChange}
                      placeholder={t('aworkIntegration.task.selectAssignee')}
                      searchPlaceholder={t('aworkIntegration.task.searchUsers')}
                      emptyText={t('aworkIntegration.task.noUsersFound')}
                    />
                  )}
                </FormFieldWrapper>
              )}

              {/* Priority Toggle */}
              {config.projectId && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('aworkIntegration.task.priority')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('aworkIntegration.task.priorityHelp')}
                    </p>
                  </div>
                  <Switch
                    checked={config.isPriority}
                    onCheckedChange={handlePriorityChange}
                  />
                </div>
              )}

              {/* Task Tag */}
              {config.projectId && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('aworkIntegration.task.tag', 'Tag')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('aworkIntegration.task.tagHelp', 'Add a tag to all tasks created from this form')}
                      </p>
                    </div>
                    <Switch
                      checked={config.taskTag !== null}
                      onCheckedChange={(enabled) =>
                        onChange((prev) => ({ ...prev, taskTag: enabled ? '' : null }))
                      }
                    />
                  </div>
                  {config.taskTag !== null && (
                    <Input
                      placeholder={t('aworkIntegration.task.tagPlaceholder', 'Enter tag name...')}
                      value={config.taskTag}
                      onChange={(e) =>
                        onChange((prev) => ({ ...prev, taskTag: e.target.value }))
                      }
                    />
                  )}
                </div>
              )}

            </div>
          </>
        )}

        {/* Project Settings */}
        {showProjectSettings && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{t('aworkIntegration.project.badge')}</Badge>
                <span className="text-sm font-medium">{t('aworkIntegration.project.settings')}</span>
              </div>

              <div className="space-y-2">
                <Label>{t('aworkIntegration.project.projectType')}</Label>
                {isLoadingProjectTypes ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('aworkIntegration.project.loadingProjectTypes')}
                  </div>
                ) : (
                  <SearchableSelect
                    options={[
                      { value: 'none', label: t('aworkIntegration.project.selectProjectTypePlaceholder') },
                      ...projectTypes.map((pt) => ({
                        value: pt.id,
                        label: pt.name,
                      })),
                    ]}
                    value={config.projectTypeId || 'none'}
                    onValueChange={handleProjectTypeChange}
                    placeholder={t('aworkIntegration.project.selectProjectType')}
                    searchPlaceholder={t('aworkIntegration.project.searchProjectTypes')}
                    emptyText={t('aworkIntegration.project.noProjectTypesFound')}
                  />
                )}
                {projectTypes.length === 0 && !isLoadingProjectTypes && !aworkError && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchProjectTypes}
                    className="mt-2"
                  >
                    {t('aworkIntegration.project.loadProjectTypes')}
                  </Button>
                )}
              </div>

            </div>
          </>
        )}

        {/* No form fields message */}
        {config.actionType && formFields.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('aworkIntegration.noFields')}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// Helper to parse config from form data
export function parseAworkConfig(
  actionType: string | null | undefined,
  projectId: string | null | undefined,
  projectTypeId: string | null | undefined,
  taskListId: string | null | undefined,
  taskStatusId: string | null | undefined,
  typeOfWorkId: string | null | undefined,
  assigneeId: string | null | undefined,
  isPriority: boolean | null | undefined,
  taskTag: string | null | undefined,
  fieldMappingsJson: string | null | undefined
): AworkIntegrationConfig {
  let taskFieldMappings: FieldMapping[] = [];
  let projectFieldMappings: FieldMapping[] = [];

  if (fieldMappingsJson) {
    try {
      const parsed = JSON.parse(fieldMappingsJson);
      taskFieldMappings = parsed.taskFieldMappings || [];
      projectFieldMappings = parsed.projectFieldMappings || [];
    } catch {
      // Invalid JSON, use defaults
    }
  }

  return {
    actionType: (actionType as ActionType) || null,
    projectId: projectId || null,
    projectTypeId: projectTypeId || null,
    taskListId: taskListId || null,
    taskStatusId: taskStatusId || null,
    typeOfWorkId: typeOfWorkId || null,
    assigneeId: assigneeId || null,
    isPriority: isPriority || false,
    taskTag: taskTag ?? null,
    taskFieldMappings,
    projectFieldMappings,
  };
}

// Helper to serialize config for saving
export function serializeAworkConfig(config: AworkIntegrationConfig): {
  actionType: string | undefined;
  aworkProjectId: string | undefined;
  aworkProjectTypeId: string | undefined;
  aworkTaskListId: string | undefined;
  aworkTaskStatusId: string | undefined;
  aworkTypeOfWorkId: string | undefined;
  aworkAssigneeId: string | undefined;
  aworkTaskIsPriority: boolean | undefined;
  aworkTaskTag: string | undefined;
  fieldMappingsJson: string | undefined;
} {
  const hasTaskMappings = config.taskFieldMappings.length > 0;
  const hasProjectMappings = config.projectFieldMappings.length > 0;

  return {
    actionType: config.actionType || undefined,
    aworkProjectId: config.projectId || undefined,
    aworkProjectTypeId: config.projectTypeId || undefined,
    aworkTaskListId: config.taskListId || undefined,
    aworkTaskStatusId: config.taskStatusId || undefined,
    aworkTypeOfWorkId: config.typeOfWorkId || undefined,
    aworkAssigneeId: config.assigneeId || undefined,
    aworkTaskIsPriority: config.isPriority ?? undefined,
    aworkTaskTag: config.taskTag === null ? undefined : config.taskTag,
    fieldMappingsJson: (hasTaskMappings || hasProjectMappings)
      ? JSON.stringify({
          taskFieldMappings: config.taskFieldMappings,
          projectFieldMappings: config.projectFieldMappings,
        })
      : undefined,
  };
}
