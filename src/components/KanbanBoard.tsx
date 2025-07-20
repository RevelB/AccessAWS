
'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Job } from '@/lib/types'; // JobStatus will be imported separately or as part of a type import
import { JobStatus } from '@/lib/types'; // Added this import
import { KanbanColumn } from './KanbanColumn';
import { OPEN_JOB_STATUSES, FINISHED_JOB_STATUSES, ALL_JOB_STATUSES_ORDERED } from '@/lib/constants';
import { client } from '@/lib/amplify';
import { Loader2 } from 'lucide-react';
import { parseISO, startOfDay, isBefore, isEqual, isValid } from 'date-fns';

interface KanbanBoardProps {
  statusFilter: 'open' | 'finished';
}

export function KanbanBoard({ statusFilter }: KanbanBoardProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      setIsLoading(true);
      try {
        const statusesToQuery = statusFilter === 'open' ? OPEN_JOB_STATUSES : FINISHED_JOB_STATUSES;
        
        const { data: fetchedJobs } = await client.models.Job.list();
        
        // Filter jobs by status client-side since Amplify doesn't support 'in' operator
        const filteredJobs = fetchedJobs.filter(job => statusesToQuery.includes(job.status as JobStatus));
        
        // Convert the Amplify data format to our Job type, parsing services from JSON
        const convertedJobs = filteredJobs.map(jobData => ({
          ...jobData,
          services: jobData.services ? JSON.parse(jobData.services) : []
        })) as Job[];
        
        setJobs(convertedJobs);
      } catch (error) {
        console.error(`Error fetching ${statusFilter} jobs: `, error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  }, [statusFilter]);

  const relevantStatuses = useMemo(() => {
    return ALL_JOB_STATUSES_ORDERED.filter(status => {
      if (statusFilter === 'open') {
        return status !== JobStatus.Finished; // Use JobStatus enum member
      }
      // statusFilter === 'finished'
      return status === JobStatus.Finished; // Use JobStatus enum member
    });
  }, [statusFilter]);

  const jobsByStatus = useMemo(() => {
    return relevantStatuses.reduce((acc, status) => {
      const statusJobs = jobs
        .filter(job => job.status === status)
        .sort((a, b) => {
          const today = startOfDay(new Date());

          const getDateGroup = (job: Job): number => {
            if (!job.deliveryDate) return 3; // No date, sort last
            try {
              const date = parseISO(job.deliveryDate);
              if (!isValid(date)) return 3; // Invalid date, sort last

              const jobDay = startOfDay(date);
              if (isBefore(jobDay, today)) return 0; // Past
              if (isEqual(jobDay, today)) return 1; // Today
              return 2; // Future
            } catch (e) {
              console.error("Error parsing date for sorting:", e);
              return 3; // Error parsing, sort last
            }
          };

          const groupA = getDateGroup(a);
          const groupB = getDateGroup(b);

          if (groupA !== groupB) {
            return groupA - groupB;
          }

          // If in the same date group, sort by clockNumberMediaName alphabetically
          return a.clockNumberMediaName.localeCompare(b.clockNumberMediaName);
        });
      acc[status] = statusJobs;
      return acc;
    }, {} as Record<JobStatus, Job[]>);
  }, [jobs, relevantStatuses]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading jobs...</p>
      </div>
    );
  }

  if (jobs.length === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xl text-muted-foreground">
          No {statusFilter} jobs found.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-3.5 overflow-x-auto pb-0">
      {relevantStatuses.map(status => (
        <KanbanColumn
          key={status}
          status={status}
          title={status.toString()}
          jobs={jobsByStatus[status] || []}
        />
      ))}
    </div>
  );
}
