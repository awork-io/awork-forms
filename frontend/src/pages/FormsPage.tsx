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

export function FormsPage() {
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
        title: 'Error',
        description: 'Failed to load forms',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateForm = async () => {
    if (!newFormName.trim()) {
      toast({
        title: 'Error',
        description: 'Form name is required',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      const form = await api.createForm({ name: newFormName.trim() });
      toast({
        title: 'Success',
        description: 'Form created successfully',
      });
      setIsCreateDialogOpen(false);
      setNewFormName('');
      // Navigate to form editor (will be implemented later)
      navigate(`/forms/${form.id}/edit`);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create form',
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
      toast({
        title: 'Success',
        description: 'Form deleted successfully',
      });
      setForms(forms.filter((f) => f.id !== deleteFormId));
      setDeleteFormId(null);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete form',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading forms...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Forms</h1>
          <p className="text-muted-foreground mt-1">Create and manage your forms</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Create Form
        </Button>
      </div>

      {forms.length === 0 ? (
        <Card className="border-dashed border-2 bg-white/60">
          <CardHeader className="text-center py-12">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-xl">No forms yet</CardTitle>
            <CardDescription className="max-w-sm mx-auto">
              Create your first form to start collecting submissions and creating tasks in awork.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pb-12">
            <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Form
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Card 
              key={form.id} 
              className="group hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 cursor-pointer bg-white/80 backdrop-blur-sm"
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
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => navigate(`/forms/${form.id}/edit`)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/forms/${form.id}/submissions`)}>
                        <ClipboardList className="w-4 h-4 mr-2" />
                        View Submissions
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.open(`/f/${form.publicId}`, '_blank')}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Public Form
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShareForm(form)}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteFormId(form.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    <span>{form.fieldCount} fields</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Inbox className="w-4 h-4" />
                    <span>{form.submissionCount} submissions</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    form.isActive
                      ? 'bg-green-50 text-green-900 border border-green-100'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {form.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Updated {formatDate(form.updatedAt)}
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
            <DialogTitle>Create New Form</DialogTitle>
            <DialogDescription>
              Enter a name for your new form. You can add fields and configure settings after creating it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Form Name</Label>
              <Input
                id="name"
                placeholder="e.g., Contact Form, Support Request"
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
              Cancel
            </Button>
            <Button onClick={handleCreateForm} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Form'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteFormId !== null} onOpenChange={() => setDeleteFormId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this form? This action cannot be undone. All submissions associated with this form will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteForm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
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
