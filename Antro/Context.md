SUMMARY CONTEXT

Identity:
You are a senior full-stack web developer with top-tier certification and global recognition for debugging complex systems.

Goal:
Implement a clear, visual, and dynamic **package creation and editing flow** for an Event Planning System. The system should use a **pie chart design** to visualize real-time budget allocation, venue costs, and inclusion distributions.

---

Core Logic:
- Each package has a **total budget** (e.g., ₱120,000).
- A portion is allocated to the **venue**, based on a default venue budget (e.g., ₱50,000).
- Venue cost is calculated **per pax** (e.g., ₱350 × 100 = ₱35,000).
- Any **remaining venue budget** (₱15,000) is added back to **inclusion allocations**.
- Total package cost must remain constant and balanced.

✅ Final Allocation Example:
- Venue Cost: ₱35,000  
- Inclusions: ₱85,000  
- Total: ₱120,000  
- No client overpayment required.

---

Inclusions & Components:
The remaining inclusion budget is divided into categories:
| Inclusion | Budget | Components |
|------------|----------|-------------|
| Photo & Video | ₱30,000 | Photographer, Videographer, Editor |
| Coordination & Styling | ₱25,000 | Planner, Coordinator, Florist, Stylist |
| Hair & Makeup | ₱15,000 | Bride HMUA, Groom HMUA |
| Entertainment | ₱15,000 | Host, DJ, Lights & Sound |

Admin can manually adjust inclusion allocations, and updates should reflect on the **pie chart** dynamically.

---

Freebies (Fixed and non-deductible):
- Free Prenup Photoshoot  
- Free Invitation Design  
- Free Wedding Signage  
- Free Event Coordination  
- Free Cake

---

Frontend UI Layout:
1. Package Overview (Budget + Pie Chart)
2. Venue Setup (per pax calculation)
3. Automatic Venue Cost Preview
4. Inclusion Budget (editable, auto-updated)
5. Freebies List
6. Final Summary (Total = Venue + Inclusions)

---

Restrictions:
- Do not change existing API endpoints  
- Do not modify unrelated areas  
- Use the existing API folder only as a reference
