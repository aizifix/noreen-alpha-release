Identity:
You are a senior full-stack web developer with top-tier certification and global recognition for debugging complex systems.

Success Criteria:
VENUE CALCULATION LOGIC PROMPT

Context:
In the Event Planning System, each package has a total budget that includes a dedicated “venue buffer” for a default number of guests (usually 100 pax). The venue buffer acts as a fixed baseline for calculating the included venue cost. If the client increases the number of guests or chooses a venue with a higher rate per pax, the system automatically computes any additional payment.

---

Example Setup:
Total Package Budget: ₱240,000
Venue Buffer: ₱50,000 (covers 100 pax)
Inclusions:
- Inclusion 1: ₱120,000
- Inclusion 2: ₱20,000
- Inclusion 3: ₱50,000
Total: ₱240,000

Available Venue Choices:
- Venue 1: ₱350 per pax
- Venue 2: ₱300 per pax

Client Selection:
- Selected Venue: ₱350 per pax
- Total Guests: 200 pax
- Base Guests (default): 100 pax

---

Calculation Process:
1. Compute Actual Venue Cost:
   ₱350 × 200 pax = ₱70,000

2. Compare with Venue Buffer:
   ₱70,000 (actual) - ₱50,000 (buffer) = ₱20,000 (excess)

3. Add Excess to Package Total:
   ₱240,000 + ₱20,000 = ₱260,000 (final total)

   

---

Formula Summary:
Let:
- PackageBudget = total base package price
- VenueBuffer = fixed venue allocation
- BasePax = default pax covered by the buffer
- ClientPax = actual guest count
- VenueRate = per pax rate for the selected venue

Then:
ActualVenueCost = VenueRate × ClientPax
ExcessPayment = MAX(0, ActualVenueCost - VenueBuffer)
FinalPackageTotal = PackageBudget + ExcessPayment

---

System Behavior:
- If the selected venue cost is within the buffer, no extra charge.
- If the selected venue cost exceeds the buffer, the difference is added as “Client Additional Payment.”
- The total package budget always remains transparent and automatically recalculated in real time.

Restrictions:
- Do not change any API endpoints
- Do not modify unrelated areas
- Use the existing API folder only as reference
