import { useRef, useState, type KeyboardEvent } from 'react';
import type { TFunction } from 'i18next';
import { Star } from 'lucide-react';
import { type FormField, getRatingMax, getRatingSteps } from '@/lib/form-types';
import { cn } from '@/lib/utils';

interface RatingInputProps {
  field: FormField;
  value: unknown;
  onChange: (value: number | '') => void;
  hasError: boolean;
  labelId: string;
  minLabel?: string;
  maxLabel?: string;
  t: TFunction;
}

// Single-select scale with ARIA radio-group semantics: one tab stop (the selected step,
// or the first step when nothing is selected), arrow keys move the selection, Home/End
// jump to the ends. Clicking the selected step clears the value again.
export function RatingInput({ field, value, onChange, hasError, labelId, minLabel, maxLabel, t }: RatingInputProps) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const buttonRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const steps = getRatingSteps(field);
  const ratingMax = getRatingMax(field);
  const isNumeric = field.ratingStyle === 'numbers';
  const selected = typeof value === 'number' && steps.includes(value) ? value : null;
  const tabStop = selected ?? steps[0];

  const select = (rating: number, focus = false) => {
    onChange(rating);
    if (focus) buttonRefs.current[rating]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = steps.indexOf(selected ?? tabStop);
    let nextIndex: number | null = null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        nextIndex = (currentIndex + 1) % steps.length;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        nextIndex = (currentIndex - 1 + steps.length) % steps.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = steps.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    select(steps[nextIndex], true);
  };

  return (
    // Stars keep a compact row (columns capped at 2.75rem) while numeric steps fill the width;
    // both shrink instead of wrapping so the endpoint labels stay under the first and last step.
    <div className={cn('space-y-2', !isNumeric && 'w-fit max-w-full')}>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-required={field.required || undefined}
        className={cn(
          'grid gap-1 sm:gap-1.5 rounded-xl border-2 border-transparent p-1 transition-all duration-200',
          hasError && 'border-red-300'
        )}
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, ${isNumeric ? '1fr' : '2.75rem'}))` }}
        onKeyDown={handleKeyDown}
        onMouseLeave={() => setHoveredRating(null)}
      >
        {steps.map((rating) => {
          const isSelected = rating === selected;
          const isActive = hoveredRating !== null ? rating <= hoveredRating : selected !== null && rating <= selected;
          const commonProps = {
            type: 'button' as const,
            role: 'radio',
            'aria-checked': isSelected,
            'aria-label': t('publicForm.rating.optionLabel', { value: rating, max: ratingMax }),
            tabIndex: rating === tabStop ? 0 : -1,
            ref: (element: HTMLButtonElement | null) => {
              buttonRefs.current[rating] = element;
            },
            onClick: () => (isSelected ? onChange('') : select(rating)),
            onMouseEnter: () => setHoveredRating(rating),
          };

          if (isNumeric) {
            return (
              <button
                key={rating}
                {...commonProps}
                className={cn(
                  'flex h-10 sm:h-11 min-w-0 items-center justify-center rounded-lg sm:rounded-xl border-2 px-0.5 text-sm sm:text-base font-semibold transition-all duration-200 outline-none',
                  isSelected
                    ? 'border-blue-500 bg-blue-500 text-white shadow-[0_0_0_3px_rgba(77,154,255,0.16)]'
                    : isActive
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300',
                  'focus-visible:border-blue-500 focus-visible:shadow-[0_0_0_3px_rgba(77,154,255,0.16)]'
                )}
              >
                {rating}
              </button>
            );
          }

          return (
            <button
              key={rating}
              {...commonProps}
              className={cn(
                'mx-auto aspect-square w-full max-w-10 rounded-lg p-0.5 sm:p-1 transition-transform duration-150 outline-none hover:scale-110',
                'focus-visible:shadow-[0_0_0_3px_rgba(77,154,255,0.25)]'
              )}
            >
              <Star
                className={cn(
                  'h-full w-full transition-colors duration-150',
                  isActive ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-gray-300'
                )}
              />
            </button>
          );
        })}
      </div>
      {minLabel || maxLabel ? (
        <div className="flex justify-between gap-4 px-1 text-xs text-gray-500">
          <span>{minLabel}</span>
          <span className="text-right">{maxLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
