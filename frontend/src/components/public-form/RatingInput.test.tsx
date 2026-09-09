import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TFunction } from 'i18next';
import { describe, expect, it, vi } from 'vitest';
import type { FormField } from '@/lib/form-types';
import { RatingInput } from './RatingInput';

const t = ((key: string, options?: Record<string, unknown>) =>
  options ? `${options.value} of ${options.max}` : key) as unknown as TFunction;

const starField: FormField = { id: 'q1', type: 'rating', label: 'Rating', required: false, ratingMax: 5, ratingStyle: 'stars' };
const npsField: FormField = { id: 'q2', type: 'rating', label: 'NPS', required: false, ratingMin: 0, ratingMax: 10, ratingStyle: 'numbers' };

function renderRating(field: FormField, value: unknown, onChange = vi.fn()) {
  render(<RatingInput field={field} value={value} onChange={onChange} hasError={false} labelId="label" t={t} />);
  return onChange;
}

describe('RatingInput', () => {
  it('renders one radio per step and exposes a single tab stop', () => {
    renderRating(starField, 3);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(5);
    expect(radios.filter((radio) => radio.tabIndex === 0)).toHaveLength(1);
    expect(screen.getByRole('radio', { name: '3 of 5' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: '3 of 5' }).tabIndex).toBe(0);
  });

  it('moves the selection with arrow keys and Home/End', async () => {
    const user = userEvent.setup();
    const onChange = renderRating(starField, 3);

    await user.tab();
    expect(screen.getByRole('radio', { name: '3 of 5' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith(4);
    expect(screen.getByRole('radio', { name: '4 of 5' })).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith(2);

    await user.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith(5);

    await user.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it('clears the value when the selected step is clicked again', async () => {
    const user = userEvent.setup();
    const onChange = renderRating(starField, 4);

    await user.click(screen.getByRole('radio', { name: '4 of 5' }));
    expect(onChange).toHaveBeenLastCalledWith('');

    await user.click(screen.getByRole('radio', { name: '2 of 5' }));
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it('renders a 0-based numeric scale and treats 0 as a selection', () => {
    renderRating(npsField, 0);
    expect(screen.getAllByRole('radio')).toHaveLength(11);
    expect(screen.getByRole('radio', { name: '0 of 10' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: '10 of 10' })).toHaveTextContent('10');
  });
});
