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
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const publicUrl = `${window.location.origin}/f/${publicId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast({
        title: 'Link copied',
        description: 'The form link has been copied to your clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy the link to clipboard',
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
            Share Form
          </DialogTitle>
          <DialogDescription>
            Share this link with anyone who should fill out your form.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="public-url">Public Link</Label>
              <Badge variant={isActive ? 'default' : 'secondary'}>
                {isActive ? 'Active' : 'Inactive'}
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
                <span className="sr-only">Copy link</span>
              </Button>
            </div>
            {!isActive && (
              <p className="text-sm text-muted-foreground">
                This form is currently inactive. Users who visit this link will see a message that the form is not accepting submissions.
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
            Open Form
          </Button>
          <Button onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
