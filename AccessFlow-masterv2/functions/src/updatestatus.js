// -----------------------------------------------------------------------------
// This reads the peepingtom email and is an expecting a payload per below:
// { "clockNumber": "ABC123", "newStatus":"Delivered" }
// ------------------------------------------------------------------------------
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK.
// In a Cloud Functions environment, initializeApp() can be called without arguments
// to automatically use the project's service account credentials.
if (!admin.apps.length) {
  admin.initializeApp();
}

// Get Firestore instance from firebase-admin
const firestore = admin.firestore();

// Define valid job statuses for validation - aligned with src/lib/types.ts JobStatus enum
const VALID_JOB_STATUSES = ['Booked', 'Received', 'Encoded', 'Delivered', 'Finished'];

/**
 * The core logic for updating a Firestore document's status from an email,
 * based on matching the prefix of the job's clockNumberMediaName.
 *
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */
const updateStatusFromEmail = async (req, res) => {
  // We expect a POST request with a JSON body
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // Log the request body for debugging
  console.log('Received body:', req.body);

  // Extract data from the request body sent by Power Automate.
  // Expecting clockNumber (as prefix) and newStatus
  const { clockNumber: clockNumberFromRequest, newStatus } = req.body;

  // --- Input Validation ---
  if (!clockNumberFromRequest || !newStatus) {
    const errorMessage = `Missing required fields. Received: clockNumber=${clockNumberFromRequest}, newStatus=${newStatus}`;
    console.error(errorMessage);
    return res.status(400).send(`Bad Request: ${errorMessage}`);
  }

  if (!VALID_JOB_STATUSES.includes(newStatus)) {
    const errorMessage = `Invalid newStatus value: '${newStatus}'. Must be one of: ${VALID_JOB_STATUSES.join(', ')}.`;
    console.error(errorMessage);
    return res.status(400).send(`Bad Request: ${errorMessage}`);
  }

  try {
    const jobsCollection = firestore.collection('jobs');
    // Query for jobs where clockNumberMediaName STARTS WITH the requested prefix.
    // '\uf8ff' is a very high code point in Unicode, used to denote the end of a string range for 'starts with' queries.
    const querySnapshot = await jobsCollection
      .where('clockNumberMediaName', '>=', clockNumberFromRequest)
      .where('clockNumberMediaName', '<', clockNumberFromRequest + '\uf8ff')
      .get();

    if (querySnapshot.empty) {
      const errorMessage = `No job found with clockNumberMediaName starting with prefix: '${clockNumberFromRequest}'.`;
      console.error(errorMessage);
      return res.status(404).send(errorMessage);
    }

    const matchedJobs = [];
    for (const doc of querySnapshot.docs) {
      const firestoreClockNumberMediaName = doc.data().clockNumberMediaName;
      if (firestoreClockNumberMediaName) {
        // Extract the part before the first '/'
        const prefixInFirestore = firestoreClockNumberMediaName.split('/')[0];
        if (prefixInFirestore === clockNumberFromRequest) {
          matchedJobs.push(doc);
        }
      }
    }

    if (matchedJobs.length === 0) {
      const errorMessage = `No job found where the prefix of clockNumberMediaName matches '${clockNumberFromRequest}'. Searched ${querySnapshot.size} candidate(s) that started with the prefix.`;
      console.error(errorMessage);
      return res.status(404).send(errorMessage);
    }

    // Update the first job that fully matches the prefix logic
    const jobToUpdateDoc = matchedJobs[0];
    const documentId = jobToUpdateDoc.id;
    const fullClockNumberMediaNameInDb = jobToUpdateDoc.data().clockNumberMediaName;

    if (matchedJobs.length > 1) {
        console.warn(`Multiple jobs (${matchedJobs.length}) found with clockNumberMediaName prefix: '${clockNumberFromRequest}'. Updating the first one found (ID: ${documentId}, Full Name: '${fullClockNumberMediaNameInDb}'). Other matches: ${matchedJobs.slice(1).map(doc => `'${doc.data().clockNumberMediaName}' (ID: ${doc.id})`).join(', ')}.`);
    }

    const docRef = jobsCollection.doc(documentId);

    // Prepare the data to update.
    const updatePayload = {
        status: newStatus,
        updatedAt: new Date().toISOString() // Always update the 'updatedAt' timestamp
    };

    // Update the document in Firestore.
    await docRef.update(updatePayload);

    const successMessage = `Successfully updated job (ID: '${documentId}') which matched prefix '${clockNumberFromRequest}' (Full Clock Nr/Media Name: '${fullClockNumberMediaNameInDb}') to status: "${newStatus}", updatedAt: "${updatePayload.updatedAt}".`;
    console.log(successMessage);
    res.status(200).send(successMessage);

  } catch (error) {
    console.error(`Error updating Firestore for job with clockNumber prefix '${clockNumberFromRequest}':`, error);
    res.status(500).send('Internal Server Error');
  }
};

// Export the function so it can be used in other files
module.exports = { updateStatusFromEmail };
