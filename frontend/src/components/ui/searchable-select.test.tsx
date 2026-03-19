import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SearchableSelect, type SearchableSelectOption } from './searchable-select';

describe('SearchableSelect', () => {
  const options: SearchableSelectOption[] = [
    { value: 'name', label: 'Name', group: 'Default fields' },
    { value: 'description', label: 'Description', group: 'Default fields' },
    { value: 'alpha', label: 'Alpha field', group: 'Custom fields' },
    { value: 'zeta', label: 'Zeta field', group: 'Custom fields' },
  ];
  const pinnedOptions: SearchableSelectOption[] = [
    { value: 'none', label: 'Not mapped' },
  ];
  const ungroupedOptions: SearchableSelectOption[] = [
    { value: 'zeta', label: 'Zeta field' },
    { value: 'alpha', label: 'Alpha field' },
    { value: 'beta', label: 'Beta field' },
  ];

  it('keeps ungrouped options alphabetized by label', async () => {
    const user = userEvent.setup();
    render(
      <SearchableSelect
        options={ungroupedOptions}
        value={null}
        onValueChange={vi.fn()}
        placeholder="Select..."
      />
    );

    await user.click(screen.getByRole('combobox'));

    const buttons = screen
      .getAllByRole('button')
      .filter((button) => /field$/i.test(button.textContent ?? ''));

    expect(buttons.map((button) => button.textContent)).toEqual([
      expect.stringContaining('Alpha field'),
      expect.stringContaining('Beta field'),
      expect.stringContaining('Zeta field'),
    ]);
  });

  it('pins not mapped first, preserves default field order, and keeps custom fields alphabetized when provided that way', async () => {
    const user = userEvent.setup();
    render(
      <SearchableSelect
        options={options}
        pinnedOptions={pinnedOptions}
        value="none"
        onValueChange={vi.fn()}
        placeholder="Select..."
      />
    );

    await user.click(screen.getByRole('combobox'));

    const notMappedButton = screen.getByRole('button', { name: /not mapped/i });
    expect(notMappedButton).toBeInTheDocument();

    const headings = screen.getAllByText(/fields$/i);
    expect(headings.map((node) => node.textContent)).toEqual([
      'Default fields',
      'Custom fields',
    ]);

    const defaultGroup = headings[0].parentElement;
    const customGroup = headings[1].parentElement;

    expect(defaultGroup).not.toBeNull();
    expect(customGroup).not.toBeNull();

    const defaultButtons = within(defaultGroup as HTMLElement).getAllByRole('button');
    expect(defaultButtons.map((button) => button.textContent)).toEqual([
      expect.stringContaining('Name'),
      expect.stringContaining('Description'),
    ]);

    const customButtons = within(customGroup as HTMLElement).getAllByRole('button');
    expect(customButtons.map((button) => button.textContent)).toEqual([
      expect.stringContaining('Alpha field'),
      expect.stringContaining('Zeta field'),
    ]);
  });

  it('keeps category grouping when filtering search results', async () => {
    const user = userEvent.setup();
    render(
      <SearchableSelect
        options={options}
        pinnedOptions={pinnedOptions}
        value="none"
        onValueChange={vi.fn()}
        placeholder="Select..."
        searchPlaceholder="Search..."
      />
    );

    await user.click(screen.getByRole('combobox'));
    await user.type(screen.getByPlaceholderText('Search...'), 'field');

    expect(screen.getByText('Default fields')).toBeInTheDocument();
    expect(screen.getByText('Custom fields')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Alpha field')).toBeInTheDocument();
    expect(screen.getByText('Zeta field')).toBeInTheDocument();
  });

  it('renders a natively scrollable result list', async () => {
    const user = userEvent.setup();
    render(
      <SearchableSelect
        options={options}
        pinnedOptions={pinnedOptions}
        value="none"
        onValueChange={vi.fn()}
        placeholder="Select..."
      />
    );

    await user.click(screen.getByRole('combobox'));

    const scrollContainer = screen.getByText('Default fields').closest('.overflow-y-auto');
    expect(scrollContainer).not.toBeNull();
  });
});
