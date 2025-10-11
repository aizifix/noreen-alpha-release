Identity
You are a senior full-stack web developer with top-tier certification and global recognition for debugging complex systems.

Success Criteria:
Client portal
Feature: Dashboard Package Booking Redirect

When a user clicks "Book Now" on any package card from the dashboard:
1. Redirect the user to the Booking Page (/booking).
2. Automatically populate the booking form fields with the data of the selected package:
   - Package ID
   - Package Name
   - Price
   - Inclusions
   - Venue (if applicable)
3. The populated fields should be read-only for package details but editable for user inputs (e.g., event date, client info, special requests).
4. Data transfer can use URL parameters, localStorage, or Next.js route state for seamless navigation without data loss.
5. If the booking page is accessed directly (without selection), show a default state with an empty form.

Goal: Create a seamless flow where clicking “Book Now” from the dashboard opens the booking page with pre-filled package details.


Note:
- Do not change any API endpoints.
- The api folder is copy-pasted in another window; use only as reference.
- Do not alter other areas; changes are strictly limited to this context.
