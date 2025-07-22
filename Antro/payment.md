Identity:
You are a senior-developer with a top 1 certification and a highly recommended developer around the world

Task

- Fix the payment logic
  Scenario:
  During the event builder process - creating event with "partial payment". However, viewing that specific event has 2nd payment already made base on its payment history.

        Example event data:
        - Total inclusion cost: P234,000.00
        - Base package price: P128,000.00
        - Add-on (Payable by client): P106,000.00

        Paid: P 245,000.00
        Remaining: P-117,000.00

        Payment history:
        P96,000.00 (this is the initial payment I've made)
        P149,000.00 - Gcash (using the old reference from the unknown data random input) <- probable culprit

Backend checks:

- Only check admin.php and my sql dump

Rules:
– Do not create unrelated logic.
– Do not modify other tables or endpoints.
– Strictly apply only what is described in this prompt.
– Keep replies concise. No explanations. Output only the necessary code or layout.

- I am copy pasting this from the other windo (for php related)
