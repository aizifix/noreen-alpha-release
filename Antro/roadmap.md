Identity:
You are a senior-developer with a top 1 certification and a highly recommended developer around the world! You are also need to act like Claude-4-Opus-Max

Task 1 - Event Builder

- Event type = wedding
  - Add church location (for wedding related events)
  - Improve annex wedding forms (for wedding related events)
- Step 5 - Components
  - Remove "Select supplier" tab inside the + Add component option (since we already have a sepparate "Add Supplier")
  - For "Add Supplier" - once supplier is added, it should change it into "selected" to avoid component duplication
- Step 6 - Timeline
  - Remove:
    - Start time and end time
    - Location
    - Priority
    - Activity
    - Arranging cards
  - Keep:
    - Notes
    - Status (Pending, Paid.., (add more if needed))
  - Add
    - Name of the component
- Step 7 - Organizer
  - Add Organizer (external organizer for the event)
- Step 8 - Attachment & Details
  - Remove client signature
- Event created modal
  - Fix the following:
    - Event name
    - Date

Task 2 - Event View

- Components are editable if event status is still draft
- Each components should be updated like in the timeline
  - Update status
    - Default all are pending (unless it was changed in the event builder timeline)
    - Drop down if the component is already paid (which it notifies the client each status change)
    - When all of the components are paid, then the event is ready to be finalized
  - In the payments tab
    - Add "+ Create Payment"
    - The component should properly show the payment cards and shows attachment
    - The modal for "+ Create Payment" should be just the same as the create payment in the payment page (use it as referrence)
    - Final payment = is when the event price = all paid so that'll be checked
  - Event day - it'll be checked
    - Once it hits the exact date and time it'll say on-going
    - Once it ends it'll say done
  - Client can then post their feedbacks
  - Event Feedback
    - Let's add a feedback tab
      - It should now be Overview | Payment | Files | Feedback
  - Fix:
    - Add venue tab in customized events
    - we should be able to still choose venues just like for package base events

Task 3 - Notification Logic - Let's add notifications for each triggers - When everytime the event for that client status for each component is change (eg., if admin change status from pending to paid) client recieves a notification - If booking is confirmed - cancelled - If client creates a booking - If Initial payment is being made - If event planning are finalized - If Final pamynet is made - If Event Day is set - Organizers - Clients - Suppliers - Staff

Task 4 - Portals
External Registration

- Clients

Internal Registration (Within admin registration, email and temporary password will be emailed to them)

- Organizers

  - Get notifies for event / job offers
  - Accepts or rejects events (depending on reasons and availability)
  - Can view the event that is assigned to them

- Suppliers

  - Creates components offer
    - Offers different tiers

- Staffs
  - Handles event similar as admin, but is limited

Task 5 - One-time 2FA (Toggable settings) - One time 2FA can be turn on and off

Task 6 - Payments

Rules:
– Do not create unrelated logic.
– Do not modify other tables or endpoints.
– Strictly apply only what is described in this prompt.
– Keep replies concise. No explanations. Output only the necessary code or layout.
