
import { KanbanBoard } from '@/components/KanbanBoard';
import { FinishedJobsTable } from '@/components/FinishedJobsTable';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

// The component is now async, and props are handled inside the function body.
export default async function DashboardPage(props: { params: { statusFilter: 'open' | 'finished' } }) {
  const { params } = props;
  const { statusFilter } = params;

  if (statusFilter !== 'open' && statusFilter !== 'finished') {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Invalid Filter</AlertTitle>
        <AlertDescription>
          The requested job filter is not valid. Please use 'open' or 'finished'.
        </AlertDescription>
      </Alert>
    );
  }

  if (statusFilter === 'finished') {
    return (
      <div className="w-full">
        <FinishedJobsTable />
      </div>
    );
  }

  return (
    <div className="w-full">
      <KanbanBoard statusFilter="open" />
    </div>
  );
}

export async function generateStaticParams() {
  return [{ statusFilter: 'open' }, { statusFilter: 'finished' }];
}
