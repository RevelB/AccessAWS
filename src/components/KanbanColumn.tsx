
import type { Job, JobStatus } from '@/lib/types';
import { JobCard } from './JobCard';
import { STATUS_ICONS } from '@/lib/constants';
import { parseISO, isToday } from 'date-fns';

interface KanbanColumnProps {
  status: JobStatus;
  jobs: Job[];
  title: string;
}

export function KanbanColumn({ status, jobs, title }: KanbanColumnProps) {
  const Icon = STATUS_ICONS[status];

  const jobsDueToday = jobs.filter(job => {
    if (!job.deliveryDate) return false;
    try {
      const deliveryDate = parseISO(job.deliveryDate);
      return isToday(deliveryDate);
    } catch (error) {
      console.error("Error parsing deliveryDate:", error, job.deliveryDate);
      return false;
    }
  }).length;

  const columnTotal = jobs.length;

  return (
    <div className="flex flex-col bg-muted/50 rounded-lg shadow flex-1 basis-0 min-w-36">
      <div className="py-1 px-3 border-b sticky top-0 bg-muted/80 backdrop-blur-sm z-10 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold flex items-center font-headline">
            {Icon && <Icon className="mr-2 h-4 w-4 text-primary" />}
            {title}
          </h3>
          <span className="text-xs font-normal text-foreground bg-background px-2 py-0.5 rounded-full">
             {columnTotal}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          <p>Today's Total: {jobsDueToday}</p>
        </div>
      </div>
      <div className="flex-1 p-1 min-h-0">
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No jobs in this status.</p>
        ) : (
          <div className="space-y-1">
            {jobs.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
