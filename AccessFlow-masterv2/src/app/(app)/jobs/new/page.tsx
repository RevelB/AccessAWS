
'use client';

import { JobForm } from '@/components/JobForm';
import type { JobCreateInput, ServiceDetail } from '@/lib/types';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

// Define a type for the data that can be passed via query params for duplication
type DuplicateDataFromQuery = Partial<Pick<JobCreateInput,
  'clockNumberMediaName' |
  'orderNumber' |
  'client' |
  'agency' |
  'poReference' |
  'destination' |
  'customDestination' |
  'deliveryDate' |
  'productionNotes'
>> & { services?: ServiceDetail[] };


export default function NewJobPage() {
  const searchParams = useSearchParams();

  const duplicateInitialData = useMemo(() => {
    const data: DuplicateDataFromQuery = {};
    const clockNumberMediaName = searchParams.get('clockNumberMediaName');
    const orderNumber = searchParams.get('orderNumber');
    const client = searchParams.get('client');
    const agency = searchParams.get('agency');
    const poReference = searchParams.get('poReference');
    const destination = searchParams.get('destination');
    const customDestination = searchParams.get('customDestination');
    const deliveryDate = searchParams.get('deliveryDate'); // This will be an ISO string
    const productionNotes = searchParams.get('productionNotes');
    const servicesParam = searchParams.get('services');

    if (clockNumberMediaName) data.clockNumberMediaName = clockNumberMediaName;
    if (orderNumber) data.orderNumber = orderNumber;
    if (client) data.client = client;
    if (agency) data.agency = agency;
    if (poReference) data.poReference = poReference;
    if (destination) data.destination = destination;
    if (customDestination) data.customDestination = customDestination;
    if (deliveryDate) data.deliveryDate = deliveryDate; // Keep as string, JobForm will parse
    if (productionNotes) data.productionNotes = productionNotes;
    
    if (servicesParam) {
      try {
        data.services = JSON.parse(servicesParam);
      } catch (e) {
        console.error("Failed to parse services from query params", e);
      }
    }

    return Object.keys(data).length > 0 ? data : undefined;
  }, [searchParams]);

  return (
    <div className="container mx-auto">
      <JobForm mode="create" initialData={duplicateInitialData as Partial<JobCreateInput> | undefined} />
    </div>
  );
}
