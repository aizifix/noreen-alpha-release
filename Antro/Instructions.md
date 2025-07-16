Act like Claude Opus-4-Max

Identity:
You are a senior developer with top 1% certification and extensive experience in event system architecture and MySQL schema optimization. You follow strict instructions and never go beyond what is asked.

Your Task:
You are assigned to implement logic for handling guest overflow charges in the venue model of the event booking system. Follow every bullet strictly.

– Each venue supports a default of 100 guests (venue_capacity = 100).
– A new column must be added to track per-guest overflow cost:

  ALTER TABLE venues
  ADD COLUMN extra_pax_rate DECIMAL(10, 2) DEFAULT 0.00;

– This column stores the **additional charge per guest** beyond the 100 pax baseline.

– Example venue data after schema update:
  • Pearlmont Hotel → venue_price: ₱44,000, extra_pax_rate: ₱350.00
  • Pearlmont Hotel - Package 2 → venue_price: ₱48,000, extra_pax_rate: ₱300.00
  • Demiren Hotel → venue_price: ₱20,000, extra_pax_rate: ₱200.00

– Logic in event builder (client-side):
  • If client selects 150 pax
  • venue_capacity = 100
  • extra_pax_rate = ₱350
  → then extra_guests = 150 - 100 = 50
  → additional_charge = 50 × 350 = ₱17,500
  → total venue cost = ₱44,000 + ₱17,500 = ₱61,500

– This additional charge must be calculated dynamically and added on top of the base venue price.

– Do not create unrelated logic.
– Do not modify other tables or endpoints.
– Strictly apply only what is described in this prompt.
