import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Check, Copy, ExternalLink, Link2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ShareFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicId: string;
  formName: string;
  isActive: boolean;
}

export function ShareFormDialog({
  open,
  onOpenChange,
  publicId,
  formName,
  isActive,
}: ShareFormDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const publicUrl = `${window.location.origin}/f/${publicId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast({
        title: t('shareForm.toast.copiedTitle'),
        description: t('shareForm.toast.copiedDesc'),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: t('shareForm.toast.copyFailedTitle'),
        description: t('shareForm.toast.copyFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleOpenForm = () => {
    window.open(publicUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            {t('shareForm.title')}
          </DialogTitle>
          <DialogDescription>
            {t('shareForm.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="public-url">{t('shareForm.publicLink')}</Label>
              <Badge variant={isActive ? 'default' : 'secondary'}>
                {isActive ? t('common.active') : t('common.inactive')}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Input
                id="public-url"
                value={publicUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span className="sr-only">{t('shareForm.copyLinkSr')}</span>
              </Button>
            </div>
            {!isActive && (
              <p className="text-sm text-muted-foreground">
                {t('shareForm.inactiveNotice')}
              </p>
            )}
          </div>

          <div className="rounded-lg border bg-muted/50 p-4">
            <h4 className="font-medium text-sm mb-2">{formName}</h4>
            <p className="text-xs text-muted-foreground break-all">{publicUrl}</p>
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleOpenForm}>
            <ExternalLink className="w-4 h-4 mr-2" />
            {t('shareForm.openForm')}
          </Button>
          <Button onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                {t('shareForm.copied')}
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                {t('shareForm.copyLink')}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
