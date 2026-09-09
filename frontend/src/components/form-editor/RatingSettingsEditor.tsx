import {
  type FormField,
  type RatingStyle,
  RATING_MAX_SCALE,
  RATING_MIN_SCALE,
  getRatingMax,
  getRatingMin,
} from '@/lib/form-types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';

interface RatingSettingsEditorProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
}

const SCALE_OPTIONS = Array.from(
  { length: RATING_MAX_SCALE - RATING_MIN_SCALE + 1 },
  (_, index) => RATING_MIN_SCALE + index
);

export function RatingSettingsEditor({ field, onUpdate }: RatingSettingsEditorProps) {
  const { t } = useTranslation();
  const ratingMax = getRatingMax(field);
  const ratingStyle: RatingStyle = field.ratingStyle === 'numbers' ? 'numbers' : 'stars';
  const ratingMin = getRatingMin(field);

  return (
    <div className="space-y-4">
      <Label className="text-base">{t('fieldConfigDialog.ratingSettings')}</Label>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="rating-scale">{t('fieldConfigDialog.ratingScale')}</Label>
          <Select value={String(ratingMax)} onValueChange={(value) => onUpdate({ ratingMax: Number(value) })}>
            <SelectTrigger id="rating-scale">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCALE_OPTIONS.map((scale) => (
                <SelectItem key={scale} value={String(scale)}>
                  {t('fieldConfigDialog.ratingScaleOption', { max: scale })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rating-style">{t('fieldConfigDialog.ratingStyle')}</Label>
          <Select value={ratingStyle} onValueChange={(value) => onUpdate({ ratingStyle: value as RatingStyle })}>
            <SelectTrigger id="rating-style">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stars">{t('fieldConfigDialog.ratingStyleStars')}</SelectItem>
              <SelectItem value="numbers">{t('fieldConfigDialog.ratingStyleNumbers')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {ratingStyle === 'numbers' && (
        <div className="space-y-2">
          <Label htmlFor="rating-min">{t('fieldConfigDialog.ratingMin')}</Label>
          <Select
            value={String(ratingMin)}
            onValueChange={(value) => onUpdate({ ratingMin: value === '0' ? 0 : 1 })}
          >
            <SelectTrigger id="rating-min">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">{t('fieldConfigDialog.ratingMinOne')}</SelectItem>
              <SelectItem value="0">{t('fieldConfigDialog.ratingMinZero')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="rating-min-label">{t('fieldConfigDialog.ratingMinLabel')}</Label>
          <Input
            id="rating-min-label"
            value={field.ratingMinLabel || ''}
            onChange={(e) => onUpdate({ ratingMinLabel: e.target.value })}
            placeholder={t('fieldConfigDialog.ratingMinLabelPlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rating-max-label">{t('fieldConfigDialog.ratingMaxLabel')}</Label>
          <Input
            id="rating-max-label"
            value={field.ratingMaxLabel || ''}
            onChange={(e) => onUpdate({ ratingMaxLabel: e.target.value })}
            placeholder={t('fieldConfigDialog.ratingMaxLabelPlaceholder')}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t('fieldConfigDialog.ratingLabelsHelp')}</p>
    </div>
  );
}
