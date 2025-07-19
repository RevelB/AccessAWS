
'use server';

// NOTE: All Firestore database operations (create, update, read, delete jobs)
// have been moved directly into the client components that use them.
// This was done to ensure all database requests are made under the currently
// authenticated user's credentials, which is required by Firestore security rules.
// This file can be used for other server-side actions in the future.
