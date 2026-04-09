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
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

type AworkLoadIssue = 'none' | 'access' | 'generic';

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
  const [projectsIssue, setProjectsIssue] = useState<AworkLoadIssue>('none');
  const [projectTypesIssue, setProjectTypesIssue] = useState<AworkLoadIssue>('none');
  const [taskDataIssue, setTaskDataIssue] = useState<AworkLoadIssue>('none');
  const [taskCustomFieldsIssue, setTaskCustomFieldsIssue] = useState<AworkLoadIssue>('none');

  // Fetch awork projects
  const fetchProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    setProjectsIssue('none');
    try {
      const data = await api.getAworkProjects();
      setProjects(data);
    } catch (err) {
      setProjectsIssue(getAworkLoadIssue(err as Error));
      setProjects([]);
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  // Fetch awork project types
  const fetchProjectTypes = useCallback(async () => {
    setIsLoadingProjectTypes(true);
    setProjectTypesIssue('none');
    try {
      const data = await api.getAworkProjectTypes();
      setProjectTypes(data);
    } catch (err) {
      setProjectTypesIssue(getAworkLoadIssue(err as Error));
      setProjectTypes([]);
    } finally {
      setIsLoadingProjectTypes(false);
    }
  }, []);

  // Fetch task custom field definitions (workspace-wide, not project-specific)
  const fetchTaskCustomFields = useCallback(async () => {
    try {
      setTaskCustomFieldsIssue('none');
      const customFieldsData = await api.getAworkTaskCustomFields();
      onCustomFieldsChange?.(customFieldsData.filter(f => !f.isArchived));
    } catch (err) {
      setTaskCustomFieldsIssue(getAworkLoadIssue(err as Error));
      onCustomFieldsChange?.([]);
    }
  }, [onCustomFieldsChange]);

  // Fetch task-related data (statuses, lists, types of work, users)
  const fetchTaskData = useCallback(async (projectId: string) => {
    setIsLoadingTaskData(true);
    setTaskDataIssue('none');
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
      setTaskDataIssue(getAworkLoadIssue(err as Error));
      setTaskStatuses([]);
      setTaskLists([]);
      setTypesOfWork([]);
      setUsers([]);
    } finally {
      setIsLoadingTaskData(false);
    }
  }, []);

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

  const getProjectCompanyName = (project: AworkProject): string | null => {
    return project.company?.name?.trim() || null;
  };

  const getProjectDisplayLabel = (project: AworkProject): string => {
    const companyName = getProjectCompanyName(project);
    if (!companyName) return project.name;
    return `${project.name} · ${companyName}`;
  };

  const projectMissing = Boolean(config.projectId) &&
    !isLoadingProjects &&
    !projects.some((project) => project.id === config.projectId);
  const projectTypeMissing = Boolean(config.projectTypeId) &&
    !isLoadingProjectTypes &&
    !projectTypes.some((projectType) => projectType.id === config.projectTypeId);
  const taskListMissing = Boolean(config.taskListId) &&
    !isLoadingTaskData &&
    !taskLists.some((taskList) => taskList.id === config.taskListId);
  const taskStatusMissing = Boolean(config.taskStatusId) &&
    !isLoadingTaskData &&
    !taskStatuses.some((taskStatus) => taskStatus.id === config.taskStatusId);
  const typeOfWorkMissing = Boolean(config.typeOfWorkId) &&
    !isLoadingTaskData &&
    !typesOfWork.some((typeOfWork) => typeOfWork.id === config.typeOfWorkId);
  const assigneeMissing = Boolean(config.assigneeId) &&
    !isLoadingTaskData &&
    !users.some((user) => user.id === config.assigneeId);

  const hasLimitedAworkAccess =
    projectMissing ||
    projectTypeMissing ||
    taskListMissing ||
    taskStatusMissing ||
    typeOfWorkMissing ||
    assigneeMissing ||
    projectsIssue === 'access' ||
    projectTypesIssue === 'access' ||
    taskDataIssue === 'access' ||
    taskCustomFieldsIssue === 'access';

  const aworkError = projectsIssue === 'generic'
    ? t('aworkIntegration.errors.loadProjects')
    : projectTypesIssue === 'generic'
      ? t('aworkIntegration.errors.loadProjectTypes')
      : taskDataIssue === 'generic' || taskCustomFieldsIssue === 'generic'
        ? t('aworkIntegration.errors.loadTaskData')
        : null;

  const projectOptions = withConfiguredFallback(
    projects.map((project) => ({
      value: project.id,
      label: getProjectDisplayLabel(project),
      secondaryLabel: project.projectKey || undefined,
    })),
    config.projectId,
    t('aworkIntegration.task.configuredProjectUnavailable'),
    t('aworkIntegration.unavailableSelection')
  );

  const projectTypeOptions = withConfiguredFallback(
    projectTypes.map((projectType) => ({
      value: projectType.id,
      label: projectType.name,
    })),
    config.projectTypeId,
    t('aworkIntegration.project.configuredProjectTypeUnavailable'),
    t('aworkIntegration.unavailableSelection')
  );

  const taskListOptions = withConfiguredFallback(
    taskLists.map((list) => ({
      value: list.id,
      label: list.name,
    })),
    config.taskListId,
    t('aworkIntegration.task.configuredTaskListUnavailable'),
    t('aworkIntegration.unavailableSelection')
  );

  const taskStatusOptions = withConfiguredFallback(
    taskStatuses.map((status) => ({
      value: status.id,
      label: status.name,
    })),
    config.taskStatusId,
    t('aworkIntegration.task.configuredTaskStatusUnavailable'),
    t('aworkIntegration.unavailableSelection')
  );

  const typeOfWorkOptions = withConfiguredFallback(
    typesOfWork.map((type) => ({
      value: type.id,
      label: type.name,
    })),
    config.typeOfWorkId,
    t('aworkIntegration.task.configuredTypeOfWorkUnavailable'),
    t('aworkIntegration.unavailableSelection')
  );

  const assigneeOptions = withConfiguredFallback(
    users.map((user) => ({
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
    config.assigneeId,
    t('aworkIntegration.task.configuredAssigneeUnavailable'),
    t('aworkIntegration.unavailableSelection')
  );

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
        {hasLimitedAworkAccess && (
          <Alert className="border-amber-200 bg-amber-50/80 text-amber-950 [&>svg]:text-amber-700">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('aworkIntegration.permissionNotice.title')}</AlertTitle>
            <AlertDescription>{t('aworkIntegration.permissionNotice.body')}</AlertDescription>
          </Alert>
        )}

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
                    options={projectOptions}
                    value={config.projectId}
                    onValueChange={handleProjectChange}
                    placeholder={t('aworkIntegration.task.selectProject')}
                    searchPlaceholder={t('aworkIntegration.task.searchProjects')}
                    emptyText={t('aworkIntegration.task.noProjectsFound')}
                  />
                )}
                {projectMissing && (
                  <p className="mt-2 text-sm text-amber-800">
                    {t('aworkIntegration.task.projectAccessHint')}
                  </p>
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
                      options={taskListOptions}
                      value={config.taskListId}
                      onValueChange={handleTaskListChange}
                      placeholder={t('aworkIntegration.task.selectTaskList')}
                      searchPlaceholder={t('aworkIntegration.task.searchTaskLists')}
                      emptyText={t('aworkIntegration.task.noTaskListsFound')}
                      clearable
                    />
                  )}
                  {taskListMissing && (
                    <p className="mt-2 text-sm text-amber-800">
                      {t('aworkIntegration.task.taskListAccessHint')}
                    </p>
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
                      options={taskStatusOptions}
                      value={config.taskStatusId}
                      onValueChange={handleTaskStatusChange}
                      placeholder={t('aworkIntegration.task.selectStatus')}
                      searchPlaceholder={t('aworkIntegration.task.searchStatuses')}
                      emptyText={t('aworkIntegration.task.noStatusesFound')}
                      clearable
                    />
                  )}
                  {taskStatusMissing && (
                    <p className="mt-2 text-sm text-amber-800">
                      {t('aworkIntegration.task.taskStatusAccessHint')}
                    </p>
                  )}
                </FormFieldWrapper>
              )}

              {/* Type of Work Selector */}
              {config.projectId && (
                <FormFieldWrapper
                  label={t('aworkIntegration.task.typeOfWork')}
                  required
                  description={t('aworkIntegration.task.typeOfWorkHelp')}
                >
                  {isLoadingTaskData ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('aworkIntegration.task.loadingTypesOfWork')}
                    </div>
                ) : (
                  <SearchableSelect
                      options={typeOfWorkOptions}
                      value={config.typeOfWorkId}
                      onValueChange={handleTypeOfWorkChange}
                      placeholder={t('aworkIntegration.task.selectTypeOfWork')}
                      searchPlaceholder={t('aworkIntegration.task.searchTypesOfWork')}
                      emptyText={t('aworkIntegration.task.noTypesOfWorkFound')}
                      clearable
                    />
                  )}
                  {typeOfWorkMissing && (
                    <p className="mt-2 text-sm text-amber-800">
                      {t('aworkIntegration.task.typeOfWorkAccessHint')}
                    </p>
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
                      options={assigneeOptions}
                      value={config.assigneeId}
                      onValueChange={handleAssigneeChange}
                      placeholder={t('aworkIntegration.task.selectAssignee')}
                      searchPlaceholder={t('aworkIntegration.task.searchUsers')}
                      emptyText={t('aworkIntegration.task.noUsersFound')}
                      clearable
                    />
                  )}
                  {assigneeMissing && (
                    <p className="mt-2 text-sm text-amber-800">
                      {t('aworkIntegration.task.assigneeAccessHint')}
                    </p>
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
                    options={projectTypeOptions}
                    value={config.projectTypeId}
                    onValueChange={handleProjectTypeChange}
                    placeholder={t('aworkIntegration.project.selectProjectType')}
                    searchPlaceholder={t('aworkIntegration.project.searchProjectTypes')}
                    emptyText={t('aworkIntegration.project.noProjectTypesFound')}
                    clearable
                  />
                )}
                {projectTypeMissing && (
                  <p className="mt-2 text-sm text-amber-800">
                    {t('aworkIntegration.project.projectTypeAccessHint')}
                  </p>
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

function getAworkLoadIssue(error: Error): AworkLoadIssue {
  if (
    error.message.includes('TOKEN_EXPIRED') ||
    error.message.includes('Unauthorized') ||
    error.message.includes('401') ||
    error.message.includes('403') ||
    error.message.includes('Forbidden')
  ) {
    return 'access';
  }

  return 'generic';
}

function withConfiguredFallback(
  options: SearchableSelectOption[],
  selectedValue: string | null,
  fallbackLabel: string,
  fallbackSecondaryLabel: string
) {
  if (!selectedValue || options.some((option) => option.value === selectedValue)) {
    return options;
  }

  return [
    ...options,
    {
      value: selectedValue,
      label: fallbackLabel,
      secondaryLabel: fallbackSecondaryLabel,
    },
  ];
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
  aworkAssigneeId: string | null;
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
    aworkAssigneeId: config.assigneeId ?? null,
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
