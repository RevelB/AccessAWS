import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

// Define the JobStatus enum
const JobStatus = {
  Booked: 'Booked',
  Received: 'Received',
  Encoded: 'Encoded',
  Delivered: 'Delivered',
  Finished: 'Finished',
} as const;

// Define the main Job schema
const schema = a.schema({
  Job: a
    .model({
      clockNumberMediaName: a.string(),
      orderNumber: a.string(),
      services: a.string(), // Store as JSON string for now
      client: a.string(),
      agency: a.string(),
      deliveryDate: a.string(), // Store as ISO string
      poReference: a.string(),
      destination: a.string(),
      productionNotes: a.string(),
      creator: a.string(),
      checker: a.string(),
      commercialDescription: a.string(),
      status: a.string(), // Store as string instead of enum
      priority: a.boolean(),
      onHold: a.boolean(),
      inSAP: a.boolean(),
      stellarTask: a.boolean(),
      rate: a.float(),
      adjusted: a.float(),
      inputter: a.string(),
      verifier: a.string(),
      extcosts: a.float(),
      billingnotes: a.string(),
    })
    .authorization((allow) => [
      // Allow authenticated users to perform all operations
      allow.authenticated().to(['create', 'read', 'update', 'delete']),
      // Allow public read access for API key (for reporting)
      allow.publicApiKey().to(['read']),
    ]),
  
  DeletedJobs: a
    .model({
      // Original job data
      originalJobId: a.string(), // Reference to the original job ID
      clockNumberMediaName: a.string(),
      orderNumber: a.string(),
      services: a.string(), // Store as JSON string
      client: a.string(),
      agency: a.string(),
      deliveryDate: a.string(),
      poReference: a.string(),
      destination: a.string(),
      productionNotes: a.string(),
      creator: a.string(),
      checker: a.string(),
      commercialDescription: a.string(),
      status: a.string(),
      priority: a.boolean(),
      onHold: a.boolean(),
      inSAP: a.boolean(),
      stellarTask: a.boolean(),
      rate: a.float(),
      adjusted: a.float(),
      inputter: a.string(),
      verifier: a.string(),
      extcosts: a.float(),
      billingnotes: a.string(),
      
      // Deletion tracking
      deletedBy: a.string(), // User ID who deleted the job
      deletedAt: a.string(), // ISO timestamp when deleted
      deletionReason: a.string(), // Optional reason for deletion
    })
    .authorization((allow) => [
      // Allow authenticated users to create and read deleted jobs
      allow.authenticated().to(['create', 'read']),
      // Allow public read access for API key (for reporting)
      allow.publicApiKey().to(['read']),
    ]),
  
  UserPrefs: a
    .model({
      userId: a.string(),
      initials: a.string(),
      lastActive: a.string(),
      jobFormServiceHeight: a.integer(),
    })
    .authorization((allow) => [
      // Users can only access their own preferences
      allow.owner().to(['create', 'read', 'update', 'delete']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    // API Key for public read access
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

// Export the JobStatus enum for use in the frontend
export { JobStatus };
