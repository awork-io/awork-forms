import { act, render, screen } from '@testing-library/react';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { describe, expect, it } from 'vitest';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

function SelectHarness({ onReady }: { onReady: (setValue: Dispatch<SetStateAction<string>>) => void }) {
  const [value, setValue] = useState('');
  onReady(setValue);

  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger aria-label="Choice">
        <SelectValue placeholder="Choose an option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="first">First option</SelectItem>
        <SelectItem value="second">Second option</SelectItem>
      </SelectContent>
    </Select>
  );
}

function simulateBrowserTranslation(element: Element) {
  const text = document.createTreeWalker(element, NodeFilter.SHOW_TEXT).nextNode();
  if (!text) throw new Error('Expected a text node to translate');

  const translated = document.createElement('font');
  translated.textContent = text.textContent;
  text.parentNode!.replaceChild(translated, text);
}

describe('Select', () => {
  it('can change values after browser translation replaces the visible text', () => {
    let setValue!: Dispatch<SetStateAction<string>>;
    render(<SelectHarness onReady={(setter) => { setValue = setter; }} />);

    const value = screen.getByRole('combobox').querySelector('[data-slot="select-value"]');
    expect(value).not.toBeNull();

    simulateBrowserTranslation(value!);
    act(() => setValue('first'));
    expect(value).toHaveTextContent('First option');

    simulateBrowserTranslation(value!);
    act(() => setValue('second'));
    expect(value).toHaveTextContent('Second option');
  });
});
