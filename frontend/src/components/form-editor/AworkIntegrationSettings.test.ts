import { describe, expect, it } from 'vitest';
import { serializeAworkConfig, type AworkIntegrationConfig } from './AworkIntegrationSettings';

describe('serializeAworkConfig', () => {
  it('serializes cleared awork fields as null for full PUT', () => {
    const config: AworkIntegrationConfig = {
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
    };

    expect(serializeAworkConfig(config)).toEqual({
      actionType: null,
      aworkProjectId: null,
      aworkProjectTypeId: null,
      aworkTaskListId: null,
      aworkTaskStatusId: null,
      aworkTypeOfWorkId: null,
      aworkAssigneeId: null,
      aworkTaskIsPriority: false,
      aworkTaskTag: null,
      fieldMappingsJson: null,
    });
  });

  it('keeps selected values and mappings intact', () => {
    const config: AworkIntegrationConfig = {
      actionType: 'task',
      projectId: '11111111-1111-1111-1111-111111111111',
      projectTypeId: '22222222-2222-2222-2222-222222222222',
      taskListId: '33333333-3333-3333-3333-333333333333',
      taskStatusId: '44444444-4444-4444-4444-444444444444',
      typeOfWorkId: '55555555-5555-5555-5555-555555555555',
      assigneeId: '66666666-6666-6666-6666-666666666666',
      isPriority: true,
      taskTag: 'vip',
      taskFieldMappings: [{ formFieldId: 'a', aworkField: 'name', aworkFieldLabel: 'Name' }],
      projectFieldMappings: [{ formFieldId: 'b', aworkField: 'description', aworkFieldLabel: 'Description' }],
    };

    expect(serializeAworkConfig(config)).toEqual({
      actionType: 'task',
      aworkProjectId: '11111111-1111-1111-1111-111111111111',
      aworkProjectTypeId: '22222222-2222-2222-2222-222222222222',
      aworkTaskListId: '33333333-3333-3333-3333-333333333333',
      aworkTaskStatusId: '44444444-4444-4444-4444-444444444444',
      aworkTypeOfWorkId: '55555555-5555-5555-5555-555555555555',
      aworkAssigneeId: '66666666-6666-6666-6666-666666666666',
      aworkTaskIsPriority: true,
      aworkTaskTag: 'vip',
      fieldMappingsJson: JSON.stringify({
        taskFieldMappings: [{ formFieldId: 'a', aworkField: 'name', aworkFieldLabel: 'Name' }],
        projectFieldMappings: [{ formFieldId: 'b', aworkField: 'description', aworkFieldLabel: 'Description' }],
      }),
    });
  });
});
