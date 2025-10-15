Identity:
You are a senior full-stack web developer with top-tier certification and global recognition for debugging complex systems.

Success Criteria:
- Use the pie chart design in the package edit


**Example Calculation:**
- Package Budget: ₱120,000  
- Venue Budget Allocation: ₱50,000  
- Default Pax: 100  
- Selected Venue: Demiren (₱350 per pax = ₱35,000)
- Remaining from Venue Allocation: ₱15,000
- New Inclusion Budget: ₱70,000 + ₱15,000 = ₱85,000

✅ Final Allocation:
- Venue Cost: ₱35,000  
- Inclusions: ₱85,000  
- Total: ₱120,000  
- No additional client payment needed.

---

### 4. INCLUSIONS & COMPONENTS
The Inclusion Budget (after venue computation) is distributed into categories and sub-components.

**Example:**
| Inclusion | Budget | Components |
|------------|----------|-------------|
| Photo & Video | ₱30,000 | Photographer, Videographer, Editor |
| Coordination & Styling | ₱25,000 | Planner, Coordinator, Florist, Stylist |
| Hair & Makeup | ₱15,000 | Bride HMUA, Groom HMUA |
| Entertainment | ₱15,000 | Host, DJ, Lights & Sound |

💡 System should allow Admin to adjust these allocations manually and visualize them on the pie chart as well.

---

### 5. FREEBIES
These are fixed extras that don’t affect the total budget.
- Free Prenup Photoshoot
- Free Invitation Design
- Free Wedding Signage
- Free Event Coordination
- Free Cake

---

### 6. SYSTEM GOAL
Create a clear, visual, and dynamic package creation flow where:
- Admin defines the **overall package plan** and sees the **budget pie chart** update in real time.
- Venue cost is computed **per pax**, based on the selected venue.
- Any **unused venue budget** automatically returns to inclusions.
- Any **excess** is shown as “Client Additional Payment.”
- The total package budget always remains balanced and transparent.

---

### 7. OPTIONAL FRONTEND UI LOGIC
**Admin Form Layout:**
1. Package Overview (Budget + Pie Chart)
2. Venue Setup (per pax table)
3. Automatic Venue Cost Preview
4. Updated Inclusion Budget (editable)
5. Freebies List
6. Final Summary (Total = Venue + Inclusions)


Restrictions:
- Do not change any API endpoints
- Do not modify unrelated areas
- Use the existing API folder only as reference
