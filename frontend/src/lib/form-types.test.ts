import { describe, it, expect } from 'vitest';
import { createField, FIELD_TYPES, isInputField, type FieldType } from './form-types';

describe('FIELD_TYPES', () => {
  it('should contain all expected field types', () => {
    const expectedTypes: FieldType[] = ['text', 'email', 'number', 'textarea', 'select', 'checkbox', 'date', 'file', 'section', 'divider'];
    const actualTypes = FIELD_TYPES.map(f => f.type);

    expect(actualTypes).toEqual(expectedTypes);
  });

  it('should have label, icon, and description for each type', () => {
    FIELD_TYPES.forEach(fieldType => {
      expect(fieldType.label).toBeTruthy();
      expect(fieldType.icon).toBeTruthy();
      expect(fieldType.description).toBeTruthy();
    });
  });

  it('should have 10 field types', () => {
    expect(FIELD_TYPES).toHaveLength(10);
  });
});

describe('createField', () => {
  it('should create a text field with correct defaults', () => {
    const field = createField('text');

    expect(field.type).toBe('text');
    expect(field.label).toBe('Text Field');
    expect(field.required).toBe(false);
    expect(field.placeholder).toBe('');
    expect(field.id).toBeTruthy();
    expect(field.options).toBeUndefined();
  });

  it('should create an email field with correct defaults', () => {
    const field = createField('email');

    expect(field.type).toBe('email');
    expect(field.label).toBe('Email Address');
    expect(field.required).toBe(false);
  });

  it('should create a number field with correct defaults', () => {
    const field = createField('number');

    expect(field.type).toBe('number');
    expect(field.label).toBe('Number');
  });

  it('should create a textarea field with correct defaults', () => {
    const field = createField('textarea');

    expect(field.type).toBe('textarea');
    expect(field.label).toBe('Description');
  });

  it('should create a checkbox field with correct defaults', () => {
    const field = createField('checkbox');

    expect(field.type).toBe('checkbox');
    expect(field.label).toBe('I agree');
  });

  it('should create a date field with correct defaults', () => {
    const field = createField('date');

    expect(field.type).toBe('date');
    expect(field.label).toBe('Date');
  });

  it('should create a select field with default options', () => {
    const field = createField('select');

    expect(field.type).toBe('select');
    expect(field.label).toBe('Select Option');
    expect(field.options).toBeDefined();
    expect(field.options).toHaveLength(2);
    expect(field.options![0]).toEqual({ label: 'Option 1', value: 'option1' });
    expect(field.options![1]).toEqual({ label: 'Option 2', value: 'option2' });
  });

  it('should create a section block with correct defaults', () => {
    const field = createField('section');

    expect(field.type).toBe('section');
    expect(field.label).toBe('Section title');
    expect(field.required).toBe(false);
  });

  it('should create a divider block with correct defaults', () => {
    const field = createField('divider');

    expect(field.type).toBe('divider');
    expect(field.label).toBe('Divider');
    expect(field.required).toBe(false);
  });

  it('should generate unique IDs for each field', () => {
    const field1 = createField('text');
    const field2 = createField('text');

    expect(field1.id).not.toBe(field2.id);
  });

  it('should generate valid UUID format for field ID', () => {
    const field = createField('text');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    expect(field.id).toMatch(uuidRegex);
  });
});

describe('isInputField', () => {
  it('returns false for display-only blocks', () => {
    expect(isInputField(createField('section'))).toBe(false);
    expect(isInputField(createField('divider'))).toBe(false);
  });

  it('returns true for submitted fields', () => {
    expect(isInputField(createField('text'))).toBe(true);
  });
});
