import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";

// Generate the Amplify Data client
export const client = generateClient<Schema>();

// Export the client for use throughout the app
export default client; 