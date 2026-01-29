import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, type Form } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ShareFormDialog } from '@/components/form-editor/ShareFormDialog';
import { Plus, MoreVertical, Pencil, ClipboardList, Eye, Share2, Trash2, FileText, Layers, Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { trackEvent, trackScreenSeen } from '@/lib/tracking';

export function FormsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [forms, setForms] = useState<Form[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteFormId, setDeleteFormId] = useState<number | null>(null);
  const [newFormName, setNewFormName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [shareForm, setShareForm] = useState<Form | null>(null);

  const fetchForms = async () => {
    try {
      const data = await api.getForms();
      setForms(data);
    } catch {
      toast({
        title: t('common.error'),
        description: t('formsPage.toast.loadError'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
    trackScreenSeen(1); // Forms list screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateForm = async () => {
    if (!newFormName.trim()) {
      toast({
        title: t('common.error'),
        description: t('formsPage.toast.nameRequired'),
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      const form = await api.createForm({ name: newFormName.trim() });
      trackEvent('Forms User Action', { action: 'form_created', tool: 'awork-forms', formId: form.id });
      toast({
        title: t('common.success'),
        description: t('formsPage.toast.createSuccess'),
      });
      setIsCreateDialogOpen(false);
      setNewFormName('');
      navigate(`/forms/${form.id}/edit`);
    } catch {
      toast({
        title: t('common.error'),
        description: t('formsPage.toast.createError'),
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteForm = async () => {
    if (!deleteFormId) return;

    setIsDeleting(true);
    try {
      await api.deleteForm(deleteFormId);
      trackEvent('Forms User Action', { action: 'form_deleted', tool: 'awork-forms', formId: deleteFormId });
      toast({
        title: t('common.success'),
        description: t('formsPage.toast.deleteSuccess'),
      });
      setForms(forms.filter((f) => f.id !== deleteFormId));
      setDeleteFormId(null);
    } catch {
      toast({
        title: t('common.error'),
        description: t('formsPage.toast.deleteError'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language || 'en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">{t('common.loadingForms')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('formsPage.title')}</h1>
          <p className="text-muted-foreground mt-1 text-lg">{t('formsPage.subtitle')}</p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)} 
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('formsPage.createForm')}
        </Button>
      </div>

      {forms.length === 0 ? (
        <Card className="border-dashed border-2 border-blue-200/50 bg-gradient-to-br from-white/80 to-blue-50/30">
          <CardHeader className="text-center py-16">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 shadow-xl shadow-blue-500/30">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl">{t('formsPage.emptyTitle')}</CardTitle>
            <CardDescription className="max-w-sm mx-auto text-base mt-2">
              {t('formsPage.emptyDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pb-16">
            <Button 
              onClick={() => setIsCreateDialogOpen(true)} 
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5 h-12 px-8"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t('formsPage.emptyCta')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Card 
              key={form.id} 
              className="group hover:shadow-[0_20px_40px_-12px_rgba(0,109,250,0.15)] hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
              onClick={() => navigate(`/forms/${form.id}/edit`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">{form.name}</CardTitle>
                    {form.description && (
                      <CardDescription className="mt-1.5 line-clamp-2">{form.description}</CardDescription>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                        <span className="sr-only">{t('formsPage.actionsLabel')}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => navigate(`/forms/${form.id}/edit`)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        {t('common.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/forms/${form.id}/submissions`)}>
                        <ClipboardList className="w-4 h-4 mr-2" />
                        {t('formsPage.viewSubmissions')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.open(`/f/${form.publicId}`, '_blank')}>
                        <Eye className="w-4 h-4 mr-2" />
                        {t('formsPage.viewPublicForm')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShareForm(form)}>
                        <Share2 className="w-4 h-4 mr-2" />
                        {t('common.share')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteFormId(form.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('common.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    <span>{t('common.fieldsCount', { count: form.fieldCount })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Inbox className="w-4 h-4" />
                    <span>{t('common.submissionsCount', { count: form.submissionCount })}</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    form.isActive
                      ? 'bg-green-50 text-green-900 border border-green-100'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {form.isActive ? t('common.active') : t('common.inactive')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t('formsPage.updated', { date: formatDate(form.updatedAt) })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Form Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('formsPage.dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('formsPage.dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('formsPage.dialog.nameLabel')}</Label>
              <Input
                id="name"
                placeholder={t('formsPage.dialog.namePlaceholder')}
                value={newFormName}
                onChange={(e) => setNewFormName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateForm();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {t('formsPage.dialog.cancel')}
            </Button>
            <Button onClick={handleCreateForm} disabled={isCreating}>
              {isCreating ? t('formsPage.dialog.creating') : t('formsPage.dialog.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteFormId !== null} onOpenChange={() => setDeleteFormId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('formsPage.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('formsPage.deleteDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('formsPage.deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteForm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t('formsPage.deleteDialog.deleting') : t('formsPage.deleteDialog.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Form Dialog */}
      {shareForm && (
        <ShareFormDialog
          open={shareForm !== null}
          onOpenChange={(open) => !open && setShareForm(null)}
          publicId={shareForm.publicId}
          formName={shareForm.name}
          isActive={shareForm.isActive}
        />
      )}
    </div>
  );
}
