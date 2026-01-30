import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, Loader2, Save, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FormEditorHeaderProps {
  formName: string;
  isActive: boolean;
  fieldsCount: number;
  publicId?: string | null;
  onBack: () => void;
  onPreview: () => void;
  onShare: () => void;
  onSave: () => void;
  isSaving: boolean;
}

export function FormEditorHeader({
  formName,
  isActive,
  fieldsCount,
  publicId,
  onBack,
  onPreview,
  onShare,
  onSave,
  isSaving,
}: FormEditorHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="border-b bg-white/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-muted/80">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold">{formName || t('formEditor.untitled')}</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge
            variant={isActive ? 'default' : 'secondary'}
            className={isActive ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0' : ''}
          >
            {isActive ? t('common.active') : t('common.inactive')}
          </Badge>
          <span>·</span>
          <span>{t('common.fieldsCount', { count: fieldsCount })}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {publicId ? (
          <>
            <Button variant="secondary" size="sm" onClick={onPreview}>
              <Eye className="w-4 h-4 mr-2" />
              {t('formEditor.preview')}
            </Button>
            <Button variant="secondary" size="sm" onClick={onShare}>
              <Share2 className="w-4 h-4 mr-2" />
              {t('formEditor.share')}
            </Button>
          </>
        ) : null}
        <Button size="sm" onClick={onSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {t('formEditor.save')}
        </Button>
      </div>
    </div>
  );
}
