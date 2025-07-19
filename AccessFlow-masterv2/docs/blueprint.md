# **App Name**: AccessFlow

AccessFlow is an application to manage Access Services Jobs
The application is attached to Firebase Firestore database and creates a collection called jobs
Each job has all of the metadata required to service that job in the team
The jobs progress in status and when finished, land into a Finished section where billing details and final data is entered.

There is a FUNCTION that is to be pushed into Cloud Functions that expects to be given and Clock Number and Status
When called it will update the jobcard with that clock number
Power Automate needs to call the function when certain email types come from our "peeping tom" notifications engine

The Power Automate code is here:

    Trigger is => When a new email arrives
        From: PeepingTom@adstream.com
        Subject Filter => "uploading to the "TEXT_BACK""

    Run => HTTP Power Automate Function
        URI => https://updatestatusfromemail-isndcjwgaq-nw.a.run.app
        Method => POST
        Headers => Content-Type application/json
        {
        "clockNumber": "@{first(split(split(triggerBody()?['subject'], '"')[1], '.'))}",
        "newStatus": "Delivered"
        }

    Trigger for => "uploading to the "MASTERS_for_QC" folder"
    Update status => "Encoded"

    Trigger for => "uploading to the "PROXY" folder"
    Update status => "Received"

## Core Features:

- Job Input Form: Form to input new job details: Clock Number/Media Name, Service Category, Sub-Service Category, Client, Agency, Delivery Date, PO Reference, Destination, Production Notes, Creator, Checker, Commercial Description.
- Kanban Dashboard: Kanban-style dashboard visualizing jobs, sortable by status (Booked, Received, Encoded, Delivered, Finished).
- Job Detail Screen: Ability to click on a job card to open a detail screen for editing details and status.
- Metadata Display: Display Delivery Date, Clock Number/Media Name, Priority, and On-Hold status on the job cards.
- Status Based Dashboards: Separate dashboards for open (not finished) and finished jobs.
- SAP Integration: "In SAP" toggle to confirm that information for the job is registered in SAP. Stored as a boolean.

## Style Guidelines:

- Primary color: Muted blue (#6495ED) to convey professionalism and reliability.
- Background color: Light gray (#F0F8FF) to create a clean and unobtrusive backdrop.
- Accent color: Soft orange (#FFB347) to highlight interactive elements and call-to-actions, such as status update buttons.
- Body and headline font: 'Inter' sans-serif for a clean and modern look; easy readability for all job-related information.
- Simple, clear icons to represent job status (e.g., a clock for 'Booked', an envelope for 'Received', etc.)
- Kanban board layout with clear separation of columns for each job status. Use cards to display individual jobs with key metadata clearly visible.
- Subtle transition animations when moving jobs between statuses to provide visual feedback.