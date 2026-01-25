import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api, type Submission, type FormDetail } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export function SubmissionsPage() {
  const { formId } = useParams<{ formId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [form, setForm] = useState<FormDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (formId) {
          // Fetch form details and submissions for specific form
          const [formData, submissionsData] = await Promise.all([
            api.getForm(parseInt(formId)),
            api.getFormSubmissions(parseInt(formId)),
          ]);
          setForm(formData);
          setSubmissions(submissionsData);
        } else {
          // Fetch all submissions across all forms
          const submissionsData = await api.getSubmissions();
          setSubmissions(submissionsData);
        }
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load submissions',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            Failed
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge variant="secondary">
            Pending
          </Badge>
        );
    }
  };

  const parseSubmissionData = (dataJson: string): Record<string, unknown> => {
    try {
      return JSON.parse(dataJson);
    } catch {
      return {};
    }
  };

  const getSubmissionPreview = (dataJson: string): string => {
    const data = parseSubmissionData(dataJson);
    const entries = Object.entries(data);
    if (entries.length === 0) return 'No data';

    // Get first few values as preview
    const preview = entries
      .slice(0, 2)
      .map(([, value]) => {
        const strValue = String(value);
        return strValue.length > 30 ? strValue.substring(0, 30) + '...' : strValue;
      })
      .join(', ');

    return preview || 'No data';
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading submissions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {formId && (
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-auto"
                onClick={() => navigate('/forms')}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Forms
              </Button>
            )}
          </div>
          <h1 className="text-2xl font-semibold">
            {form ? `${form.name} - Submissions` : 'All Submissions'}
          </h1>
          <p className="text-muted-foreground">
            {form
              ? `View all submissions for this form`
              : 'View submissions across all your forms'}
          </p>
        </div>
        {formId && (
          <Button variant="outline" onClick={() => navigate(`/forms/${formId}/edit`)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Form
          </Button>
        )}
      </div>

      {submissions.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <CardTitle>No submissions yet</CardTitle>
            <CardDescription>
              {form
                ? 'Share your form to start receiving submissions.'
                : 'Create forms and share them to start receiving submissions.'}
            </CardDescription>
          </CardHeader>
          {form && (
            <CardContent className="text-center">
              <Button
                variant="outline"
                onClick={() => {
                  const url = `${window.location.origin}/f/${form.publicId}`;
                  navigator.clipboard.writeText(url);
                  toast({
                    title: 'Copied',
                    description: 'Form link copied to clipboard',
                  });
                }}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Form Link
              </Button>
            </CardContent>
          )}
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {!formId && <TableHead>Form</TableHead>}
                  <TableHead>Data Preview</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>awork</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    {!formId && (
                      <TableCell>
                        <Link
                          to={`/forms/${submission.formId}/submissions`}
                          className="text-primary hover:underline font-medium"
                        >
                          {submission.formName}
                        </Link>
                      </TableCell>
                    )}
                    <TableCell className="max-w-[300px] truncate">
                      {getSubmissionPreview(submission.dataJson)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(submission.status)}
                      {submission.errorMessage && (
                        <span
                          className="ml-2 text-muted-foreground cursor-help"
                          title={submission.errorMessage}
                        >
                          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {submission.aworkProjectId && (
                          <a
                            href={`https://app.awork.com/projects/${submission.aworkProjectId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            Project
                          </a>
                        )}
                        {submission.aworkTaskId && (
                          <a
                            href={`https://app.awork.com/tasks/${submission.aworkTaskId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            Task
                          </a>
                        )}
                        {!submission.aworkProjectId && !submission.aworkTaskId && (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(submission.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedSubmission(submission)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Submission Detail Dialog */}
      <Dialog open={selectedSubmission !== null} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
            <DialogDescription>
              Submitted on {selectedSubmission && formatDate(selectedSubmission.createdAt)}
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <div className="mt-1">{getStatusBadge(selectedSubmission.status)}</div>
                </div>
                {selectedSubmission.errorMessage && (
                  <div className="flex-1">
                    <span className="text-sm text-muted-foreground">Error:</span>
                    <p className="mt-1 text-sm text-destructive">{selectedSubmission.errorMessage}</p>
                  </div>
                )}
              </div>

              {(selectedSubmission.aworkProjectId || selectedSubmission.aworkTaskId) && (
                <div>
                  <span className="text-sm text-muted-foreground">awork Links:</span>
                  <div className="mt-1 flex gap-2">
                    {selectedSubmission.aworkProjectId && (
                      <a
                        href={`https://app.awork.com/projects/${selectedSubmission.aworkProjectId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View Project in awork
                      </a>
                    )}
                    {selectedSubmission.aworkTaskId && (
                      <a
                        href={`https://app.awork.com/tasks/${selectedSubmission.aworkTaskId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View Task in awork
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div>
                <span className="text-sm text-muted-foreground">Submitted Data:</span>
                <div className="mt-2 bg-muted rounded-lg p-4">
                  <table className="w-full">
                    <tbody>
                      {Object.entries(parseSubmissionData(selectedSubmission.dataJson)).map(([key, value]) => (
                        <tr key={key} className="border-b border-border last:border-0">
                          <td className="py-2 pr-4 text-sm font-medium text-muted-foreground align-top w-1/3">
                            {key}
                          </td>
                          <td className="py-2 text-sm break-words">
                            {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
