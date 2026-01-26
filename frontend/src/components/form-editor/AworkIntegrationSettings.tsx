import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Loader2, Link2, AlertCircle, CheckCircle2 } from 'lucide-react';
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
import { ArrowRight } from 'lucide-react';

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
  taskFieldMappings: FieldMapping[];
  projectFieldMappings: FieldMapping[];
}

// Standard awork project fields that can be mapped
const AWORK_PROJECT_FIELDS = [
  { value: 'name', label: 'Project Name' },
  { value: 'description', label: 'Description' },
  { value: 'startDate', label: 'Start Date' },
  { value: 'dueDate', label: 'Due Date' },
];

// Standard awork task fields that can be mapped
const AWORK_TASK_FIELDS = [
  { value: 'name', label: 'Task Name' },
  { value: 'description', label: 'Description' },
  { value: 'dueOn', label: 'Due Date' },
  { value: 'startOn', label: 'Start Date' },
  { value: 'plannedDuration', label: 'Planned Duration (seconds)' },
];

interface AworkIntegrationSettingsProps {
  formFields: FormField[];
  config: AworkIntegrationConfig;
  onChange: (config: AworkIntegrationConfig) => void;
}

export function AworkIntegrationSettings({
  formFields,
  config,
  onChange,
}: AworkIntegrationSettingsProps) {
  const [projects, setProjects] = useState<AworkProject[]>([]);
  const [projectTypes, setProjectTypes] = useState<AworkProjectType[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<AworkTaskStatus[]>([]);
  const [taskLists, setTaskLists] = useState<AworkTaskList[]>([]);
  const [typesOfWork, setTypesOfWork] = useState<AworkTypeOfWork[]>([]);
  const [users, setUsers] = useState<AworkUser[]>([]);
  const [customFields, setCustomFields] = useState<AworkCustomFieldDefinition[]>([]);
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
        setAworkError('Your awork session has expired. Please re-authenticate with awork.');
      } else {
        setAworkError('Failed to load awork projects.');
      }
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

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
        setAworkError('Your awork session has expired. Please re-authenticate with awork.');
      } else {
        setAworkError('Failed to load awork project types.');
      }
    } finally {
      setIsLoadingProjectTypes(false);
    }
  }, []);

  // Fetch task-related data (statuses, lists, types of work, users, custom fields)
  const fetchTaskData = useCallback(async (projectId: string) => {
    setIsLoadingTaskData(true);
    setAworkError(null);
    try {
      const [statusesData, listsData, typesData, usersData, customFieldsData] = await Promise.all([
        api.getAworkTaskStatuses(projectId),
        api.getAworkTaskLists(projectId),
        api.getAworkTypesOfWork(),
        api.getAworkUsers(),
        api.getAworkCustomFields(),
      ]);
      setTaskStatuses(statusesData);
      setTaskLists(listsData);
      setTypesOfWork(typesData.filter(t => !t.isArchived));
      setUsers(usersData.filter(u => !u.isArchived && !u.isExternal));
      setCustomFields(customFieldsData.filter(f => !f.isArchived));
    } catch (err) {
      const error = err as Error;
      if (error.message.includes('TOKEN_EXPIRED') || error.message.includes('Unauthorized')) {
        setAworkError('Your awork session has expired. Please re-authenticate with awork.');
      } else {
        setAworkError('Failed to load task configuration data.');
      }
    } finally {
      setIsLoadingTaskData(false);
    }
  }, []);

  // Load awork data when action type requires it
  useEffect(() => {
    if (config.actionType === 'task' || config.actionType === 'both') {
      fetchProjects();
    }
    if (config.actionType === 'project' || config.actionType === 'both') {
      fetchProjectTypes();
    }
  }, [config.actionType, fetchProjects, fetchProjectTypes]);

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
    onChange({
      ...config,
      actionType,
      // Reset selections when action type changes
      projectId: null,
      projectTypeId: null,
      taskListId: null,
      taskStatusId: null,
      typeOfWorkId: null,
      assigneeId: null,
      isPriority: false,
      taskFieldMappings: [],
      projectFieldMappings: [],
    });
  };

  const handleProjectChange = (projectId: string) => {
    onChange({
      ...config,
      projectId: projectId === 'none' ? null : projectId,
      // Reset task-specific settings when project changes
      taskListId: null,
      taskStatusId: null,
    });
  };

  const handleProjectTypeChange = (projectTypeId: string) => {
    onChange({
      ...config,
      projectTypeId: projectTypeId === 'none' ? null : projectTypeId,
    });
  };

  const handleTaskListChange = (taskListId: string) => {
    onChange({
      ...config,
      taskListId: taskListId === 'none' ? null : taskListId,
    });
  };

  const handleTaskStatusChange = (taskStatusId: string) => {
    onChange({
      ...config,
      taskStatusId: taskStatusId === 'none' ? null : taskStatusId,
    });
  };

  const handleTypeOfWorkChange = (typeOfWorkId: string) => {
    onChange({
      ...config,
      typeOfWorkId: typeOfWorkId === 'none' ? null : typeOfWorkId,
    });
  };

  const handleAssigneeChange = (assigneeId: string) => {
    onChange({
      ...config,
      assigneeId: assigneeId === 'none' ? null : assigneeId,
    });
  };

  const handlePriorityChange = (isPriority: boolean) => {
    onChange({
      ...config,
      isPriority,
    });
  };

  const updateTaskMapping = (formFieldId: string, aworkField: string) => {
    const aworkFieldInfo = AWORK_TASK_FIELDS.find(f => f.value === aworkField);
    const existing = config.taskFieldMappings.filter(m => m.formFieldId !== formFieldId);

    if (aworkField === 'none') {
      onChange({ ...config, taskFieldMappings: existing });
    } else {
      onChange({
        ...config,
        taskFieldMappings: [
          ...existing,
          {
            formFieldId,
            aworkField,
            aworkFieldLabel: aworkFieldInfo?.label || aworkField,
          },
        ],
      });
    }
  };

  const updateProjectMapping = (formFieldId: string, aworkField: string) => {
    const aworkFieldInfo = AWORK_PROJECT_FIELDS.find(f => f.value === aworkField);
    const existing = config.projectFieldMappings.filter(m => m.formFieldId !== formFieldId);

    if (aworkField === 'none') {
      onChange({ ...config, projectFieldMappings: existing });
    } else {
      onChange({
        ...config,
        projectFieldMappings: [
          ...existing,
          {
            formFieldId,
            aworkField,
            aworkFieldLabel: aworkFieldInfo?.label || aworkField,
          },
        ],
      });
    }
  };

  const getTaskMappingForField = (formFieldId: string): string => {
    const mapping = config.taskFieldMappings.find(m => m.formFieldId === formFieldId);
    return mapping?.aworkField || 'none';
  };

  const getProjectMappingForField = (formFieldId: string): string => {
    const mapping = config.projectFieldMappings.find(m => m.formFieldId === formFieldId);
    return mapping?.aworkField || 'none';
  };

  const showTaskSettings = config.actionType === 'task' || config.actionType === 'both';
  const showProjectSettings = config.actionType === 'project' || config.actionType === 'both';

  const getUserDisplayName = (user: AworkUser): string => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.email || 'Unknown User';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          awork Integration
        </CardTitle>
        <CardDescription>
          Configure what happens in awork when this form is submitted
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
        <div className="space-y-2">
          <Label>When form is submitted</Label>
          <Select
            value={config.actionType || 'none'}
            onValueChange={handleActionTypeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Do nothing</SelectItem>
              <SelectItem value="task">Create a Task</SelectItem>
              <SelectItem value="project">Create a Project</SelectItem>
              <SelectItem value="both">Create both Task and Project</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Task Settings */}
        {showTaskSettings && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Task</Badge>
                <span className="text-sm font-medium">Task Settings</span>
              </div>

              {/* Project Selector */}
              <div className="space-y-2">
                <Label>Add task to project</Label>
                {isLoadingProjects ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading projects...
                  </div>
                ) : (
                  <Select
                    value={config.projectId || 'none'}
                    onValueChange={handleProjectChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select a project...</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {projects.length === 0 && !isLoadingProjects && !aworkError && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchProjects}
                    className="mt-2"
                  >
                    Load Projects
                  </Button>
                )}
              </div>

              {/* Task List Selector */}
              {config.projectId && (
                <div className="space-y-2">
                  <Label>Task list</Label>
                  {isLoadingTaskData ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading task lists...
                    </div>
                  ) : (
                    <Select
                      value={config.taskListId || 'none'}
                      onValueChange={handleTaskListChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a task list" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Default (no specific list)</SelectItem>
                        {taskLists.map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            {list.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Task Status Selector */}
              {config.projectId && (
                <div className="space-y-2">
                  <Label>Initial task status</Label>
                  {isLoadingTaskData ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading statuses...
                    </div>
                  ) : (
                    <Select
                      value={config.taskStatusId || 'none'}
                      onValueChange={handleTaskStatusChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Default status</SelectItem>
                        {taskStatuses.map((status) => (
                          <SelectItem key={status.id} value={status.id}>
                            {status.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Type of Work Selector */}
              {config.projectId && (
                <div className="space-y-2">
                  <Label>Type of work</Label>
                  {isLoadingTaskData ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading types of work...
                    </div>
                  ) : (
                    <Select
                      value={config.typeOfWorkId || 'none'}
                      onValueChange={handleTypeOfWorkChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type of work" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No type of work</SelectItem>
                        {typesOfWork.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Assignee Selector */}
              {config.projectId && (
                <div className="space-y-2">
                  <Label>Assign to</Label>
                  {isLoadingTaskData ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading users...
                    </div>
                  ) : (
                    <Select
                      value={config.assigneeId || 'none'}
                      onValueChange={handleAssigneeChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {getUserDisplayName(user)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Priority Toggle */}
              {config.projectId && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mark as priority</Label>
                    <p className="text-sm text-muted-foreground">
                      Created tasks will be marked as high priority
                    </p>
                  </div>
                  <Switch
                    checked={config.isPriority}
                    onCheckedChange={handlePriorityChange}
                  />
                </div>
              )}

              {/* Task Field Mappings */}
              {formFields.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Map form fields to task</Label>
                    {config.taskFieldMappings.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {config.taskFieldMappings.length} mapped
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    {formFields.map((field) => (
                      <div key={field.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                        <span className="text-sm min-w-[140px] font-medium truncate" title={field.label}>
                          {field.label}
                        </span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        <Select
                          value={getTaskMappingForField(field.id)}
                          onValueChange={(value) => updateTaskMapping(field.id, value)}
                        >
                          <SelectTrigger className="flex-1 h-9">
                            <SelectValue placeholder="Not mapped" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              <span className="text-muted-foreground">Not mapped</span>
                            </SelectItem>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Default Fields
                            </div>
                            {AWORK_TASK_FIELDS.map((aworkField) => (
                              <SelectItem key={aworkField.value} value={aworkField.value}>
                                {aworkField.label}
                              </SelectItem>
                            ))}
                            {customFields.length > 0 && (
                              <>
                                <Separator className="my-1" />
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  Custom Fields
                                </div>
                                {customFields.map((cf) => (
                                  <SelectItem key={`custom:${cf.id}`} value={`custom:${cf.id}`}>
                                    <div className="flex items-center gap-2">
                                      <span>{cf.name}</span>
                                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                                        {cf.type}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
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
                <Badge variant="outline" className="text-xs">Project</Badge>
                <span className="text-sm font-medium">Project Settings</span>
              </div>

              <div className="space-y-2">
                <Label>Project type</Label>
                {isLoadingProjectTypes ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading project types...
                  </div>
                ) : (
                  <Select
                    value={config.projectTypeId || 'none'}
                    onValueChange={handleProjectTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select a project type...</SelectItem>
                      {projectTypes.map((pt) => (
                        <SelectItem key={pt.id} value={pt.id}>
                          {pt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {projectTypes.length === 0 && !isLoadingProjectTypes && !aworkError && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchProjectTypes}
                    className="mt-2"
                  >
                    Load Project Types
                  </Button>
                )}
              </div>

              {/* Project Field Mappings */}
              {formFields.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Map form fields to project</Label>
                    {config.projectFieldMappings.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {config.projectFieldMappings.length} mapped
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2 pl-2 border-l-2 border-muted">
                    {formFields.map((field) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <span className="text-sm w-32 truncate" title={field.label}>
                          {field.label}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <Select
                          value={getProjectMappingForField(field.id)}
                          onValueChange={(value) => updateProjectMapping(field.id, value)}
                        >
                          <SelectTrigger className="w-40 h-8 text-xs">
                            <SelectValue placeholder="Not mapped" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Not mapped</SelectItem>
                            {AWORK_PROJECT_FIELDS.map((aworkField) => (
                              <SelectItem key={aworkField.value} value={aworkField.value}>
                                {aworkField.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* No form fields message */}
        {config.actionType && formFields.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Add form fields first to configure field mappings.
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
    aworkTaskIsPriority: config.isPriority || undefined,
    fieldMappingsJson: (hasTaskMappings || hasProjectMappings)
      ? JSON.stringify({
          taskFieldMappings: config.taskFieldMappings,
          projectFieldMappings: config.projectFieldMappings,
        })
      : undefined,
  };
}
