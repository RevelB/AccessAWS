'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getDeletedJobs, restoreDeletedJob, permanentlyDeleteJob } from '@/lib/deletedJobs';
import { client } from '@/lib/amplify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, parseISO } from 'date-fns';
import type { DeletedJob } from '@/lib/deletedJobs';

export default function DeletedJobsPage() {
  const [deletedJobs, setDeletedJobs] = useState<DeletedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringJobId, setRestoringJobId] = useState<string | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    
    const fetchDeletedJobs = async () => {
      try {
        const jobs = await getDeletedJobs();
        setDeletedJobs(jobs);
      } catch (error) {
        console.error('Failed to fetch deleted jobs:', error);
        toast({
          title: 'Error',
          description: 'Failed to load deleted jobs.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDeletedJobs();
  }, [user, toast]);

  const handleRestoreJob = async (deletedJob: DeletedJob) => {
    if (!user) return;
    
    setRestoringJobId(deletedJob.originalJobId);
    try {
      const newJobId = await restoreDeletedJob(deletedJob, user.userId);
      
      // Remove from the list
      setDeletedJobs(prev => prev.filter(job => job.originalJobId !== deletedJob.originalJobId));
      
      toast({
        title: 'Job Restored',
        description: `Job "${deletedJob.clockNumberMediaName}" has been successfully restored.`,
      });
      
      // Navigate to the restored job
      router.push(`/jobs/${newJobId}`);
    } catch (error) {
      console.error('Failed to restore job:', error);
      toast({
        title: 'Error',
        description: 'Failed to restore job.',
        variant: 'destructive',
      });
    } finally {
      setRestoringJobId(null);
    }
  };

  const handlePermanentlyDelete = async (deletedJob: DeletedJob) => {
    setDeletingJobId(deletedJob.originalJobId);
    try {
      // For now, we'll need to find the DeletedJobs record by listing all
      // In a production app, you might want to add a query by originalJobId
      const { data: allDeletedJobs } = await client.models.DeletedJobs.list();
      const deletedJobRecord = allDeletedJobs.find((job) => job.originalJobId === deletedJob.originalJobId);
      
      if (deletedJobRecord) {
        await permanentlyDeleteJob(deletedJobRecord.id);
        
        // Remove from the list
        setDeletedJobs(prev => prev.filter(job => job.originalJobId !== deletedJob.originalJobId));
        
        toast({
          title: 'Job Permanently Deleted',
          description: `Job "${deletedJob.clockNumberMediaName}" has been permanently deleted.`,
        });
      }
    } catch (error) {
      console.error('Failed to permanently delete job:', error);
      toast({
        title: 'Error',
        description: 'Failed to permanently delete job.',
        variant: 'destructive',
      });
    } finally {
      setDeletingJobId(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading deleted jobs...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Deleted Jobs</h1>
          <p className="text-muted-foreground">
            Manage and restore deleted jobs. Jobs are kept here for 30 days before being permanently deleted.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/open')}>
          Back to Dashboard
        </Button>
      </div>

      {deletedJobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Deleted Jobs</h3>
            <p className="text-muted-foreground text-center">
              There are no deleted jobs to display. Deleted jobs will appear here for 30 days.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {deletedJobs.map((deletedJob) => (
            <Card key={deletedJob.originalJobId}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {deletedJob.clockNumberMediaName}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{deletedJob.client}</Badge>
                      <Badge variant="outline">{deletedJob.agency}</Badge>
                      <Badge variant="outline">{deletedJob.status}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestoreJob(deletedJob)}
                      disabled={restoringJobId === deletedJob.originalJobId}
                    >
                      {restoringJobId === deletedJob.originalJobId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                      Restore
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={deletingJobId === deletedJob.originalJobId}
                        >
                          {deletingJobId === deletedJob.originalJobId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Delete Permanently
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Permanently Delete Job</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the job
                            "{deletedJob.clockNumberMediaName}" and all its data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handlePermanentlyDelete(deletedJob)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Permanently
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Order Number:</span> {deletedJob.orderNumber}
                  </div>
                  <div>
                    <span className="font-medium">Delivery Date:</span> {formatDate(deletedJob.deliveryDate)}
                  </div>
                  <div>
                    <span className="font-medium">Deleted:</span> {formatDate(deletedJob.deletedAt)}
                  </div>
                  <div>
                    <span className="font-medium">Deleted By:</span> {deletedJob.deletedBy}
                  </div>
                  <div>
                    <span className="font-medium">PO Reference:</span> {deletedJob.poReference}
                  </div>
                  <div>
                    <span className="font-medium">Destination:</span> {deletedJob.destination}
                  </div>
                </div>
                {deletedJob.deletionReason && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <span className="font-medium">Deletion Reason:</span> {deletedJob.deletionReason}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 