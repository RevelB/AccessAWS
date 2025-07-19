
export enum JobStatus {
  Booked = 'Booked',
  Received = 'Received',
  Encoded = 'Encoded',
  Delivered = 'Delivered',
  Finished = 'Finished',
}

// Represents a single service selected for a job
export interface ServiceDetail {
  name: string; // e.g., "Closed Captions"
  subService: string; // e.g., "Original"
  notes: string;
  customName?: string; // Only for "Other" service
}

export interface Job {
  id: string;
  clockNumberMediaName: string;
  orderNumber: string;
  services: ServiceDetail[];
  client: string;
  agency: string;
  deliveryDate: string; // Store as ISO string, handle as Date object in components
  poReference: string;
  destination: string;
  productionNotes: string;
  creator: string;
  checker: string;
  commercialDescription: string;
  status: JobStatus;
  priority: boolean;
  onHold: boolean;
  inSAP: boolean;
  stellarTask: boolean;
  createdAt: string; // Store as ISO string
  updatedAt: string; // Store as ISO string
  rate?: number;
  adjusted?: number;
  inputter?: string;
  verifier?: string;
  extcosts?: number;
  billingnotes?: string;
}

// The 'services' field is now required, others are derived from the base Job type
export type JobCreateInput = Omit<Job, 'id' | 'createdAt' | 'updatedAt'> & {
  customDestination?: string; // Added to support duplication from query params
};

// For updates, all fields are partial
export type JobUpdateInput = Partial<JobCreateInput> & { status?: JobStatus; rate?: number; };

export const JOB_STATUS_LIST = Object.values(JobStatus);

export type JobSortBy =
  | 'clockNumberMediaName'
  | 'orderNumber'
  | 'client'
  | 'agency'
  | 'deliveryDate'
  | 'poReference'
  | 'destination'
  | 'productionNotes'
  | 'creator'
  | 'checker'
  | 'commercialDescription'
  | 'status'
  | 'priority'
  | 'onHold'
  | 'inSAP'
  | 'createdAt'
  | 'updatedAt'
  | 'rate'
  | 'extcosts';

// Interface for the getJobs filter options
export interface GetJobsFilter {
  statusFilter?: 'open' | 'finished';
  status?: JobStatus[];
  sortBy?: JobSortBy;
  sortDirection?: 'asc' | 'desc';
  searchQuery?: string;
  deliveryStartDate?: string; // Added for date range filtering
  deliveryEndDate?: string;   // Added for date range filtering
}
