import { client } from './amplify';
import type { Job } from '@/lib/types';

export interface DeletedJob {
  originalJobId: string;
  clockNumberMediaName: string;
  orderNumber: string;
  services: string; // JSON string
  client: string;
  agency: string;
  deliveryDate: string;
  poReference: string;
  destination: string;
  productionNotes: string;
  creator: string;
  checker: string;
  commercialDescription: string;
  status: string;
  priority: boolean;
  onHold: boolean;
  inSAP: boolean;
  stellarTask: boolean;
  rate: number;
  adjusted: number;
  inputter: string;
  verifier: string;
  extcosts: number;
  billingnotes: string;
  deletedBy: string;
  deletedAt: string;
  deletionReason: string;
}

/**
 * Soft delete a job by creating a DeletedJobs record and removing the original
 */
export async function softDeleteJob(
  job: Job, 
  deletedBy: string, 
  deletionReason?: string
): Promise<void> {
  try {
    // 1. Create a copy in the DeletedJobs collection
    await client.models.DeletedJobs.create({
      originalJobId: job.id,
      clockNumberMediaName: job.clockNumberMediaName,
      orderNumber: job.orderNumber,
      services: JSON.stringify(job.services || []),
      client: job.client,
      agency: job.agency,
      deliveryDate: job.deliveryDate,
      poReference: job.poReference,
      destination: job.destination,
      productionNotes: job.productionNotes,
      creator: job.creator,
      checker: job.checker,
      commercialDescription: job.commercialDescription,
      status: job.status,
      priority: job.priority,
      onHold: job.onHold,
      inSAP: job.inSAP,
      stellarTask: job.stellarTask,
      rate: job.rate || 0,
      adjusted: job.adjusted || 0,
      inputter: job.inputter || '',
      verifier: job.verifier || '',
      extcosts: job.extcosts || 0,
      billingnotes: job.billingnotes || '',
      deletedBy,
      deletedAt: new Date().toISOString(),
      deletionReason: deletionReason || '',
    });

    // 2. Delete the original job
    await client.models.Job.delete({ id: job.id });
  } catch (error) {
    console.error("Failed to soft delete job:", error);
    throw error;
  }
}

/**
 * Get all deleted jobs
 */
export async function getDeletedJobs(): Promise<DeletedJob[]> {
  try {
    const { data: deletedJobs } = await client.models.DeletedJobs.list();
    return deletedJobs as DeletedJob[];
  } catch (error) {
    console.error("Failed to fetch deleted jobs:", error);
    return [];
  }
}

/**
 * Get a specific deleted job by original job ID
 */
export async function getDeletedJob(originalJobId: string): Promise<DeletedJob | null> {
  try {
    // Note: This would need to be implemented with a custom query
    // For now, we'll fetch all and filter
    const deletedJobs = await getDeletedJobs();
    return deletedJobs.find(job => job.originalJobId === originalJobId) || null;
  } catch (error) {
    console.error("Failed to fetch deleted job:", error);
    return null;
  }
}

/**
 * Restore a deleted job by creating a new Job from the DeletedJobs record
 */
export async function restoreDeletedJob(
  deletedJob: DeletedJob, 
  restoredBy: string
): Promise<string> {
  try {
    // 1. Create a new job from the deleted job data
    const { data: restoredJob } = await client.models.Job.create({
      clockNumberMediaName: deletedJob.clockNumberMediaName,
      orderNumber: deletedJob.orderNumber,
      services: deletedJob.services, // Already JSON string
      client: deletedJob.client,
      agency: deletedJob.agency,
      deliveryDate: deletedJob.deliveryDate,
      poReference: deletedJob.poReference,
      destination: deletedJob.destination,
      productionNotes: deletedJob.productionNotes,
      creator: deletedJob.creator,
      checker: deletedJob.checker,
      commercialDescription: deletedJob.commercialDescription,
      status: deletedJob.status,
      priority: deletedJob.priority,
      onHold: deletedJob.onHold,
      inSAP: deletedJob.inSAP,
      stellarTask: deletedJob.stellarTask,
      rate: deletedJob.rate,
      adjusted: deletedJob.adjusted,
      inputter: deletedJob.inputter,
      verifier: deletedJob.verifier,
      extcosts: deletedJob.extcosts,
      billingnotes: deletedJob.billingnotes,
    });

    if (!restoredJob) {
      throw new Error("Failed to create restored job");
    }

    // 2. Delete the DeletedJobs record
    // Note: We need to find the DeletedJobs record ID first
    const { data: deletedJobs } = await client.models.DeletedJobs.list();
    const deletedJobRecord = deletedJobs.find(job => job.originalJobId === deletedJob.originalJobId);
    if (deletedJobRecord) {
      await client.models.DeletedJobs.delete({ id: deletedJobRecord.id });
    }

    return restoredJob.id;
  } catch (error) {
    console.error("Failed to restore deleted job:", error);
    throw error;
  }
}

/**
 * Permanently delete a DeletedJobs record
 */
export async function permanentlyDeleteJob(deletedJobId: string): Promise<void> {
  try {
    await client.models.DeletedJobs.delete({ id: deletedJobId });
  } catch (error) {
    console.error("Failed to permanently delete job:", error);
    throw error;
  }
}

/**
 * Convert a DeletedJob back to a Job object
 */
export function deletedJobToJob(deletedJob: DeletedJob): Omit<Job, 'createdAt' | 'updatedAt'> {
  return {
    id: deletedJob.originalJobId,
    clockNumberMediaName: deletedJob.clockNumberMediaName,
    orderNumber: deletedJob.orderNumber,
    services: JSON.parse(deletedJob.services),
    client: deletedJob.client,
    agency: deletedJob.agency,
    deliveryDate: deletedJob.deliveryDate,
    poReference: deletedJob.poReference,
    destination: deletedJob.destination,
    productionNotes: deletedJob.productionNotes,
    creator: deletedJob.creator,
    checker: deletedJob.checker,
    commercialDescription: deletedJob.commercialDescription,
    status: deletedJob.status as any, // Cast to JobStatus
    priority: deletedJob.priority,
    onHold: deletedJob.onHold,
    inSAP: deletedJob.inSAP,
    stellarTask: deletedJob.stellarTask,
    rate: deletedJob.rate,
    adjusted: deletedJob.adjusted,
    inputter: deletedJob.inputter,
    verifier: deletedJob.verifier,
    extcosts: deletedJob.extcosts,
    billingnotes: deletedJob.billingnotes,
  };
} 