
import { JobStatus } from './types';
import type { LucideIcon } from 'lucide-react';
import { Clock3, Mail, FileTerminal, Send, CheckCircle2, Hand, Cable, Flame, Star } from 'lucide-react';

// Renamed from RAW_SERVICE_CATEGORIES for clarity. This is the canonical list of services.
export const SERVICE_OPTIONS = [
  "Closed Captions",
  "Audio Description",
  "Open Captions",
  "Translation",
  "Transcription",
  "Transcreation",
  "BSL",
  "Proofreading",
  "Other"
];

export const SUB_SERVICE_CATEGORY_OPTIONS = [
  "Original",
  "Re-Edit",
  "Cutdown",
  "Re-encode",
  "DTT",
  "Premix",
  "Mono AD",
  "Other"
];

export const RAW_DESTINATION_OPTIONS = [
  "XR Delivery",
  "XR UK Delivery",
  "Access",
  "Peach"
];

export const DESTINATION_OPTIONS = [...RAW_DESTINATION_OPTIONS, "Other..."];


export const STATUS_ICONS: Record<JobStatus, LucideIcon> = {
  [JobStatus.Booked]: Clock3,
  [JobStatus.Received]: Mail,
  [JobStatus.Encoded]: FileTerminal,
  [JobStatus.Delivered]: Send,
  [JobStatus.Finished]: CheckCircle2,
};

export const HIGH_PRIORITY_ICON: LucideIcon = Flame;

export const ON_HOLD_ICON: LucideIcon = Hand;
export const IN_SAP_ICON: LucideIcon = Cable;
export const STELLAR_TASK_ICON: LucideIcon = Star;

export const OPEN_JOB_STATUSES: JobStatus[] = [
  JobStatus.Booked,
  JobStatus.Received,
  JobStatus.Encoded,
  JobStatus.Delivered,
];

export const FINISHED_JOB_STATUSES: JobStatus[] = [JobStatus.Finished];

export const ALL_JOB_STATUSES_ORDERED: JobStatus[] = [
  JobStatus.Booked,
  JobStatus.Received,
  JobStatus.Encoded,
  JobStatus.Delivered,
  JobStatus.Finished,
];
