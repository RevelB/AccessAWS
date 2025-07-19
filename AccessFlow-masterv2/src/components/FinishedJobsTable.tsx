
'use client';

import { getFirestore, collection, query, where, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Job, ServiceDetail } from '@/lib/types';
import { JobStatus } from '@/lib/types';
import { format, parseISO, isValid } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Loader2, ArrowUp, ArrowDown, ChevronsUpDown, FileText, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from './ui/button';

const FINISHED_JOB_COLUMNS: { key: keyof Job | 'actions' | 'services'; label: string; sortable: boolean }[] = [
  { key: 'deliveryDate', label: 'Delivery Date', sortable: true },
  { key: 'clockNumberMediaName', label: 'Clock No./Media Name', sortable: true },
  { key: 'services', label: 'Services', sortable: false },
  { key: 'rate', label: 'Rate (£)', sortable: false },
  { key: 'adjusted', label: 'Adjusted (£)', sortable: false },
  { key: 'inputter', label: 'Inputter', sortable: false },
  { key: 'verifier', label: 'Verifier', sortable: false },
  { key: 'poReference', label: 'PO#', sortable: false },
  { key: 'extcosts', label: 'Ext. Costs (£)', sortable: false },
  { key: 'billingnotes', label: 'Billing Notes', sortable: false },
];

type SortableColumn = 'deliveryDate' | 'clockNumberMediaName';

interface PendingUpdate {
  jobId: string;
  field: 'rate' | 'adjusted' | 'extcosts';
  newValue: number;
  displayValue: string;
}

interface PendingRevert {
  jobId: string;
  clockNumberMediaName: string;
}

export function FinishedJobsTable() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortableColumn>('deliveryDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string>>>({});
  
  const [isUpdating, setIsUpdating] = useState<string | null>(null); // format: "jobId-fieldName"
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<PendingUpdate | null>(null);
  const [isRevertAlertOpen, setIsRevertAlertOpen] = useState(false);
  const [pendingRevert, setPendingRevert] = useState<PendingRevert | null>(null);
  
  const db = getFirestore(app);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      
      const q = query(
        collection(db, 'jobs'), 
        where('status', '==', JobStatus.Finished),
        orderBy('updatedAt', 'desc') // Fetch by most recently updated
      );

      try {
        const querySnapshot = await getDocs(q);
        const jobsList: Job[] = [];
        const initialValues: Record<string, Record<string, string>> = {};

        querySnapshot.forEach((doc) => {
          const jobData = { id: doc.id, ...(doc.data() as Omit<Job, 'id'>) };
          jobsList.push(jobData);
          
          initialValues[jobData.id] = {
            rate: jobData.rate !== undefined ? String(jobData.rate) : '',
            adjusted: jobData.adjusted !== undefined ? String(jobData.adjusted) : '',
            inputter: jobData.inputter || '',
            verifier: jobData.verifier || '',
            poReference: jobData.poReference || '',
            extcosts: jobData.extcosts !== undefined ? String(jobData.extcosts) : '',
            billingnotes: jobData.billingnotes || '',
          };
        });
        setJobs(jobsList);
        setFieldValues(initialValues);
      } catch (error) {
        console.error("Error fetching finished jobs:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [db]);

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      let comparison = 0;
      if (sortBy === 'deliveryDate') {
        const dateA = isValid(parseISO(aValue as string)) ? parseISO(aValue as string) : new Date(0);
        const dateB = isValid(parseISO(bValue as string)) ? parseISO(bValue as string) : new Date(0);
        if (dateA < dateB) comparison = -1;
        if (dateA > dateB) comparison = 1;
      } else {
        comparison = (aValue as string).localeCompare(bValue as string);
      }

      return sortDirection === 'asc' ? comparison : comparison * -1;
    });
  }, [jobs, sortBy, sortDirection]);

  const handleSort = useCallback((columnKey: SortableColumn) => {
    if (sortBy === columnKey) {
      setSortDirection(prevDirection => (prevDirection === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnKey);
      setSortDirection('asc');
    }
  }, [sortBy]);

  const renderSortIcon = (columnKey: SortableColumn) => {
    if (sortBy !== columnKey) {
      return <ChevronsUpDown className="ml-1 h-3 w-3 opacity-30" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const formatDateForDisplay = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const parsedDate = parseISO(dateString);
      return isValid(parsedDate) ? format(parsedDate, 'dd/MM/yy') : 'Invalid Date';
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const formatServicesForDisplay = (services: ServiceDetail[] | undefined) => {
    if (!services || services.length === 0) return 'N/A';
    return services.map(s => s.customName || s.name).join(', ');
  };

  const handleFieldChange = (jobId: string, field: string, value: string) => {
    setFieldValues(prev => ({
      ...prev,
      [jobId]: { ...prev[jobId], [field]: value }
    }));
  };

  const handleBlurUpdate = async (jobId: string, field: 'inputter' | 'verifier' | 'billingnotes' | 'poReference') => {
    const originalJob = jobs.find(j => j.id === jobId);
    if (!originalJob) return;

    let value = fieldValues[jobId]?.[field] ?? '';
    const originalValue = originalJob[field] ?? '';

    if (field === 'inputter' || field === 'verifier') {
      value = value.toUpperCase();
      handleFieldChange(jobId, field, value); // Ensure UI reflects uppercase change
      if (value && !/^[A-Z]{2,3}$/.test(value)) {
        toast({
          title: 'Invalid Input',
          description: `${field.charAt(0).toUpperCase() + field.slice(1)} must be 2 or 3 uppercase letters.`,
          variant: 'destructive',
        });
        handleFieldChange(jobId, field, originalValue as string); // Revert
        return;
      }
    }
    
    if (String(originalValue) === value) return; // No change

    setIsUpdating(`${jobId}-${field}`);
    try {
      const jobRef = doc(db, 'jobs', jobId);
      await updateDoc(jobRef, {
        [field]: value,
        updatedAt: new Date().toISOString(),
      });
      setJobs(prevJobs => prevJobs.map(j => (j.id === jobId ? { ...j, [field]: value } : j)));
      toast({
        title: 'Field Updated',
        description: `${field.charAt(0).toUpperCase() + field.slice(1)} for job has been saved.`,
      });
    } catch (error) {
      console.error(`Failed to update ${field}:`, error);
      handleFieldChange(jobId, field, originalValue as string); // Revert on failure
      toast({
        title: 'Update Failed',
        description: `Could not save ${field}. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleNumericBlur = (jobId: string, field: 'rate' | 'adjusted' | 'extcosts') => {
    const originalJob = jobs.find(j => j.id === jobId);
    if (!originalJob) return;

    const value = fieldValues[jobId]?.[field] ?? '';
    const originalValue = originalJob[field] ?? 0;
    
    const rateRegex = /^\d+(\.\d{1,2})?$/;
    if (value.trim() !== '' && !rateRegex.test(value.trim())) {
      toast({
        title: 'Invalid Input',
        description: `${field} must be a valid number with up to two decimal places.`,
        variant: 'destructive',
      });
      handleFieldChange(jobId, field, String(originalValue));
      return;
    }
    
    const newValue = value.trim() === '' ? 0 : parseFloat(value);
    
    if (originalValue === newValue) return; // No change

    setPendingUpdate({ jobId, field, newValue, displayValue: newValue.toFixed(2) });
    setIsAlertOpen(true);
  };
  
  const confirmNumericUpdate = async () => {
    if (!pendingUpdate) return;
    
    const { jobId, field, newValue } = pendingUpdate;
    setIsUpdating(`${jobId}-${field}`);
    
    try {
        const jobRef = doc(db, 'jobs', jobId);
        await updateDoc(jobRef, {
            [field]: newValue,
            updatedAt: new Date().toISOString(),
        });
        setJobs(prevJobs => prevJobs.map(j => j.id === jobId ? {...j, [field]: newValue} : j));
        toast({
            title: `${field.charAt(0).toUpperCase() + field.slice(1)} Updated`,
            description: `${field.charAt(0).toUpperCase() + field.slice(1)} for job has been saved.`,
        });
    } catch (error) {
        console.error(`Failed to update ${field}:`, error);
        const originalJob = jobs.find(j => j.id === jobId);
        toast({
            title: 'Update Failed',
            description: `Could not save the ${field}. Please try again.`,
            variant: 'destructive',
        });
        if (originalJob) {
          handleFieldChange(jobId, field, String(originalJob[field] ?? ''));
        }
    } finally {
        setIsUpdating(null);
        setPendingUpdate(null);
        setIsAlertOpen(false);
    }
  };

  const handleRevertStatusClick = (job: Job) => {
    setPendingRevert({ jobId: job.id, clockNumberMediaName: job.clockNumberMediaName });
    setIsRevertAlertOpen(true);
  };

  const confirmRevertStatus = async () => {
    if (!pendingRevert) return;
    const { jobId } = pendingRevert;
    setIsUpdating(`${jobId}-status`);
    try {
      const jobRef = doc(db, "jobs", jobId);
      await updateDoc(jobRef, {
        status: JobStatus.Delivered,
        updatedAt: new Date().toISOString(),
      });
      // Remove the job from the local state so it disappears from the table
      setJobs(prevJobs => prevJobs.filter(j => j.id !== jobId));
      toast({
        title: "Job Status Reverted",
        description: `Job "${pendingRevert.clockNumberMediaName}" has been moved back to Delivered.`,
      });
    } catch (error) {
      console.error("Failed to revert status:", error);
      toast({
        title: "Update Failed",
        description: `Could not revert the job status. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(null);
      setPendingRevert(null);
      setIsRevertAlertOpen(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading finished jobs...</span>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-xl text-muted-foreground">
          No finished jobs found.
        </p>
      </div>
    );
  }
  
  const pendingJobForDialog = pendingUpdate ? jobs.find(j => j.id === pendingUpdate.jobId) : null;

  return (
    <>
    <TooltipProvider>
      <ScrollArea className="w-full rounded-md border bg-card shadow" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
        <Table>
          <TableHeader>
            <TableRow>
              {FINISHED_JOB_COLUMNS.map(col => (
                 <TableHead 
                  key={col.key} 
                  className={cn("h-auto px-1 py-1 text-xs", col.sortable && "cursor-pointer hover:bg-muted/50")}
                  onClick={() => col.sortable && handleSort(col.key as SortableColumn)}
                >
                   <div className="flex items-center">
                      {col.label}
                      {col.sortable && renderSortIcon(col.key as SortableColumn)}
                   </div>
                </TableHead>
              ))}
              <TableHead className="text-right h-auto px-1 py-1 text-xs">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedJobs.map((job) => (
              <TableRow key={job.id}>
                {FINISHED_JOB_COLUMNS.map(col => (
                  <TableCell key={`${job.id}-${col.key}`} className="px-1 py-1 text-s align-top">
                    {(() => {
                      const fieldKey = col.key as keyof Job | 'services';
                      const isFieldUpdating = isUpdating === `${job.id}-${fieldKey}`;

                      switch(fieldKey) {
                        case 'deliveryDate':
                          return formatDateForDisplay(job.deliveryDate);
                        case 'clockNumberMediaName':
                          return job.clockNumberMediaName;
                        case 'services':
                          return formatServicesForDisplay(job.services);
                        case 'rate':
                        case 'adjusted':
                        case 'extcosts':
                          const value_num = fieldValues[job.id]?.[fieldKey] ?? '';
                          return (
                            <div className="relative w-24">
                              <Input
                                id={`${fieldKey}-${job.id}`}
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={value_num}
                                onChange={(e) => handleFieldChange(job.id, fieldKey, e.target.value)}
                                onBlur={() => handleNumericBlur(job.id, fieldKey as 'rate'|'adjusted'|'extcosts')}
                                disabled={isFieldUpdating}
                                className="h-6 pr-4 text-xs number-input-no-spinner"
                              />
                              {isFieldUpdating && <Loader2 className="absolute right-1 top-1/2 -translate-y-1/2 h-2 w-2 animate-spin" />}
                            </div>
                          );
                        case 'inputter':
                        case 'verifier':
                          const value_init = fieldValues[job.id]?.[fieldKey] ?? '';
                          return (
                            <div className="relative w-20">
                              <Input
                                id={`${fieldKey}-${job.id}`}
                                type="text"
                                placeholder="___"
                                value={value_init}
                                onChange={(e) => handleFieldChange(job.id, fieldKey, e.target.value)}
                                onBlur={() => handleBlurUpdate(job.id, fieldKey as 'inputter'|'verifier')}
                                disabled={isFieldUpdating}
                                maxLength={3}
                                className="h-6 text-xs pr-4 uppercase placeholder:text-xs leading-none"
                              />
                              {isFieldUpdating && <Loader2 className="absolute right-1 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                            </div>
                          );
                        case 'poReference':
                          const value_po = fieldValues[job.id]?.[fieldKey] ?? '';
                          return (
                            <div className="relative w-28">
                              <Input
                                id={`${fieldKey}-${job.id}`}
                                type="text"
                                placeholder="PO Number"
                                value={value_po}
                                onChange={(e) => handleFieldChange(job.id, fieldKey, e.target.value)}
                                onBlur={() => handleBlurUpdate(job.id, 'poReference')}
                                disabled={isFieldUpdating}
                                className="h-6 text-xs pr-4 placeholder:text-xs leading-none"
                              />
                              {isFieldUpdating && <Loader2 className="absolute right-1 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                            </div>
                          );
                        case 'billingnotes':
                           const value_notes = fieldValues[job.id]?.[fieldKey] ?? '';
                           return (
                            <div className="relative w-48">
                              <Textarea
                                id={`${fieldKey}-${job.id}`}
                                placeholder="Notes..."
                                value={value_notes}
                                onChange={(e) => handleFieldChange(job.id, fieldKey, e.target.value)}
                                onBlur={() => handleBlurUpdate(job.id, fieldKey as 'billingnotes')}
                                disabled={isFieldUpdating}
                                className="text-[10px] leading-tight min-h-0 h-6 p-0.5 resize-y"
                                rows={1}
                              />
                               {isFieldUpdating && <Loader2 className="absolute right-1 top-1.5 h-4 w-4 animate-spin" />}
                            </div>
                          );
                        default:
                          const jobValue = job[col.key as keyof Job];
                          return String(jobValue === null || jobValue === undefined ? 'N/A' : jobValue);
                      }
                    })()}
                  </TableCell>
                ))}
                <TableCell className="text-right px-1 py-1 align-top">
                  <div className="flex items-center justify-end gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-destructive hover:text-destructive/80"
                          onClick={() => handleRevertStatusClick(job)}
                          disabled={isUpdating !== null}
                        >
                          <Undo2 className="h-4 w-4" />
                          <span className="sr-only">Revert status for {job.clockNumberMediaName}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Revert to Delivered</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-primary hover:text-primary/80"
                          disabled={isUpdating !== null}
                        >
                          <Link href={`/jobs/${job.id}?view=true`}>
                            <FileText className="h-4 w-4" />
                            <span className="sr-only">View Details for {job.clockNumberMediaName}</span>
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View Details</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      </TooltipProvider>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the {pendingUpdate?.field} for job 
              <span className="font-semibold"> {pendingJobForDialog?.clockNumberMediaName} </span>
              to <span className="font-semibold">£{pendingUpdate?.displayValue}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              if (pendingUpdate) {
                const originalJob = jobs.find(j => j.id === pendingUpdate.jobId);
                const originalValue = originalJob ? String(originalJob[pendingUpdate.field] ?? '') : '';
                handleFieldChange(pendingUpdate.jobId, pendingUpdate.field, originalValue);
              }
              setPendingUpdate(null);
            }}>No</AlertDialogCancel>
            <AlertDialogAction onClick={confirmNumericUpdate}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isRevertAlertOpen} onOpenChange={setIsRevertAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert Job Status?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revert the status of job <br />
              <span className="font-semibold">{pendingRevert?.clockNumberMediaName}</span><br />
              back to "Delivered"? This will remove it from the finished jobs list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingRevert(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevertStatus}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isUpdating !== null}
            >
              Revert Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
