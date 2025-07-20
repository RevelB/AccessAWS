
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { JobForm } from '@/components/JobForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { client } from '@/lib/amplify';
import type { Job } from '@/lib/types';
import { JobStatus } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

export default function EditJobPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const isViewOnly = useMemo(() => searchParams.get('view') === 'true', [searchParams]);

  useEffect(() => {
    if (!user) {
      // Don't fetch if user is not logged in.
      // The app layout should redirect, but this is a safeguard.
      return;
    }
    const fetchJob = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: jobData } = await client.models.Job.get({ id: params.id });
        if (jobData) {
          // Convert the Amplify data format to our Job type
          const job: Job = {
            id: jobData.id,
            clockNumberMediaName: jobData.clockNumberMediaName || '',
            orderNumber: jobData.orderNumber || '',
            services: jobData.services ? JSON.parse(jobData.services) : [],
            client: jobData.client || '',
            agency: jobData.agency || '',
            deliveryDate: jobData.deliveryDate || '',
            poReference: jobData.poReference || '',
            destination: jobData.destination || '',
            productionNotes: jobData.productionNotes || '',
            creator: jobData.creator || '',
            checker: jobData.checker || '',
            commercialDescription: jobData.commercialDescription || '',
            status: jobData.status as JobStatus,
            priority: jobData.priority ?? false,
            onHold: jobData.onHold ?? false,
            inSAP: jobData.inSAP ?? false,
            stellarTask: jobData.stellarTask ?? false,
            rate: jobData.rate ?? undefined,
            adjusted: jobData.adjusted ?? undefined,
            inputter: jobData.inputter || '',
            verifier: jobData.verifier || '',
            extcosts: jobData.extcosts ?? undefined,
            billingnotes: jobData.billingnotes || '',
            createdAt: jobData.createdAt || new Date().toISOString(),
            updatedAt: jobData.updatedAt || new Date().toISOString(),
          };
          setJob(job);
        } else {
          setError(`The job with ID "${params.id}" could not be found.`);
        }
      } catch (err) {
        console.error("Error fetching job:", err);
        setError("Failed to fetch job data. You may not have permission to view this document.");
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [params.id, user]);

  if (loading) {
     return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading job details...</span>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="container mx-auto flex flex-col items-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-6 w-6" /> Job Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error || `The job with ID "${params.id}" could not be found.`}</p>
            <p>It might have been deleted or the ID is incorrect.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <JobForm mode="edit" initialData={job} viewOnly={isViewOnly} />
    </div>
  );
}
