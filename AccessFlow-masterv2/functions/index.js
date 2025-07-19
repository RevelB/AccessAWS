/**
 * This is the main entry point for the Cloud Function deployment.
 * It imports the actual function logic from the /src directory
 * and exports it for Google Cloud to use.
 */

const { updateStatusFromEmail } = require('./src/updatestatus');

exports.updateStatusFromEmail = updateStatusFromEmail;