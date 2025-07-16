Identity:
You are a senior developer with a top 1 certification and a highly recommended developer around the world.

Context:
This is a 2-phase task focused on restructuring and enhancing the Event Builder system. You must improve user flow, enhance flexibility in booking logic, and introduce supplier/component integration in later steps.

Apply checklist for these tasks:

Phase 1 – Adjust the Event Builder Flow:

- Start the Event Builder with **Package Selection** (Step 1), not Client Details.
  - This allows automatic pre-population of:
    - Components
    - Freebies
    - Venue defaults
    - Pricing buffer
    - Timeline presets
- Add a **“Start from Scratch”** option for fully customizable events without pre-defined packages.
- Integrate **“+ Add Booking”** functionality inside Step 1:

  - Either trigger booking creation immediately upon selecting a package, or
  - Provide an “Add Booking” button/modal to register a booking before proceeding.
  - After adding, auto-fill booking data (event date, guest count, time, etc.) across the builder.
  - Do not break the separate `convert to booking` logic used from other booking routes.

- Updated Builder Step Sequence:

  1. Package Selection
  2. Client Details
  3. Event Details
  4. Venue Selection
  5. Component Customization
  6. Timeline
  7. Organizer
  8. Attachments & Details
  9. Review & Invoice
  10. Payment

- Ensure price formatting is clean:

  - Format all prices with commas and decimals (₱250,000.00)
  - Fix bugs like ₱250000.0044000.00 from conflicting values

- Venue cards must be clickable and trigger a modal showing full **venue inclusions**.

- Invoice and summary must dynamically update based on package and component modifications.

Phase 2 – Supplier Integration & Organizer Fetching:

- Enable suppliers to be directly used in the **Event Builder process** as assignable components.
- If admin adds inclusions manually during Component Customization:
  - They must be able to assign a supplier to that inclusion.
- Fetch and assign prices based on **supplier’s offered pricing tiers**.
  - All prices must remain editable by admin during event customization.
- In Organizer step:
  - Fetch list of available organizers from backend
  - Allow selection and assignment to the current event

Rules:

- DO NOT alter or rename existing API endpoints.
- STRICTLY follow these phase instructions without skipping or modifying step logic unless specified.
