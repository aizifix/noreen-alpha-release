# Guest Count Lock - Admin Quick Guide

## 🔒 What is Guest Count Lock?

When a client makes a reservation payment for a booking, their **guest count is locked** to prevent price reductions. This ensures fair pricing:
- ❌ **Reducing guests = NO refund** (price stays at reserved count)
- ✅ **Adding guests = Additional charges** (price increases)

---

## 📋 How It Works

### Step 1: Client Reserves Booking
```
Client books event for 200 guests
Package Price: ₱260,000
Venue: ₱350 per guest
Total: ₱295,000
Pays: ₱20,000 reservation fee
Status: RESERVED → CONFIRMED
```

**✅ Guest count is now LOCKED at 200**

### Step 2: Admin Creates Event from Booking
When you load the booking in Event Builder:
- Guest count will show: **200**
- Remaining balance: **₱275,000** (₱295,000 - ₱20,000)
- You'll see: **🔒 Guest Count Locked: 200 guests**

### Step 3: Admin Changes Guest Count

#### 🚫 Scenario A: Admin Reduces to 150 Guests
**What happens:**
- System keeps price at 200 guest level
- Balance stays: **₱275,000** (NO refund)
- Shows: **🔒 Guest Count Locked: 200 guests**
- Reason: Client paid for 200 guests

#### ⚠️ Scenario B: Admin Increases to 300 Guests
**What happens:**
- System recalculates for 300 guests
- Additional 100 guests × ₱350 = +₱35,000
- New balance: **₱310,000** (₱275,000 + ₱35,000)
- Shows: **⚠️ Increased to: 300 guests (+100)**
- Reason: Client must pay for extra guests

---

## 🎯 Visual Indicators

### In Event Summary Sidebar

**When guest count is locked:**
```
┌─────────────────────────────────────┐
│ 🔒 Guest Count Locked: 200 guests   │
│                                     │
│ Remaining Balance: ₱275,000         │
└─────────────────────────────────────┘
```

**When guest count is increased:**
```
┌─────────────────────────────────────┐
│ 🔒 Guest Count Locked: 200 guests   │
│ ⚠️ Increased to: 300 guests (+100) │
│                                     │
│ Remaining Balance: ₱310,000         │
└─────────────────────────────────────┘
```

**In Budget Breakdown:**
```
Package Price:              ₱260,000
Venue Buffer (included):    ₱35,000
Actual Venue Cost 🔒:       ₱70,000 (@ 200)
Excess Payment:            +₱35,000
```

---

## ⚙️ Common Scenarios

### Scenario 1: Client Wants Fewer Guests After Reservation

**Client says:** "We only need 150 guests now, can you reduce the price?"

**What you do:**
1. Change guest count to 150 in Event Builder
2. System will keep price at 200 guest level
3. Explain to client: "Your reservation locked in 200 guests. No refund for reducing guests."

**Price:** Stays at ₱275,000 balance

---

### Scenario 2: Client Wants More Guests After Reservation

**Client says:** "We need 300 guests now, what's the new price?"

**What you do:**
1. Change guest count to 300 in Event Builder
2. System will show additional charges
3. Additional cost: 100 guests × ₱350 = ₱35,000
4. Explain to client: "Additional 100 guests will cost ₱35,000 more."

**New Price:** ₱310,000 balance (₱275,000 + ₱35,000)

---

### Scenario 3: Client Changes Venue After Reservation

**Client says:** "Can we switch to a different venue?"

**What you do:**
1. Select new venue in Event Builder
2. System recalculates using the **locked guest count** (200)
3. If new venue is ₱400/guest:
   - New venue cost: 200 × ₱400 = ₱80,000
   - Buffer: ₱35,000
   - Additional: ₱45,000 (instead of original ₱35,000)
   - Extra charge: ₱10,000

**New Price:** ₱285,000 balance (₱275,000 + ₱10,000)

---

### Scenario 4: Client Reduces Guests AND Changes Venue

**Client says:** "We only need 150 guests now, and we want a cheaper venue at ₱300/guest"

**What you do:**
1. Change guest count to 150 (LOCKED at 200)
2. Change venue to ₱300/guest
3. System calculates: 200 × ₱300 = ₱60,000 (NOT 150 × ₱300)
4. Buffer: ₱35,000
5. Additional: ₱25,000

**Price:** ₱285,000 balance (no savings from reducing guests)

---

## 🛡️ Business Rules Summary

| Client Action | System Behavior | Price Impact |
|--------------|-----------------|--------------|
| Reduce guests (200 → 150) | Lock at 200 | ❌ NO change |
| Reduce guests (200 → 100) | Lock at 200 | ❌ NO change |
| Keep same guests (200 → 200) | No change | ❌ NO change |
| Add guests (200 → 250) | Recalculate with 250 | ✅ Increases |
| Add guests (200 → 300) | Recalculate with 300 | ✅ Increases |
| Change venue (same guests) | Recalculate with locked count | ⚠️ May increase/decrease |

---

## ⚠️ Important Notes

1. **Lock Only Applies to Reserved/Confirmed Bookings**
   - Fresh events (not from bookings) can change freely
   - Pending bookings can change freely

2. **Venue Changes Respect Guest Lock**
   - Always uses effective (locked or increased) count
   - Even if admin tries to reduce guests first

3. **No Refunds for Reducing Guests**
   - This is a business rule to prevent revenue loss
   - Client paid reservation fee for specific guest count

4. **Additional Guests Always Charged**
   - Fair pricing for increased capacity
   - Calculated automatically

---

## 📞 What to Tell Clients

### When They Want to Reduce Guests:
> "Your reservation locked in [X] guests. We cannot reduce the price if you reduce the guest count, as you've already paid the reservation fee for this number of guests. However, we can accommodate fewer guests at no additional cost."

### When They Want to Add Guests:
> "You originally reserved for [X] guests. Adding [Y] more guests will cost an additional ₱[Z]. Your new total will be ₱[TOTAL]. Would you like to proceed?"

### When They Want to Change Venue:
> "Changing to [NEW VENUE] will adjust your pricing. Based on your reserved guest count of [X], your new total will be ₱[TOTAL]. This is a [increase/decrease] of ₱[DIFF] from your original booking."

---

## 🐛 Troubleshooting

### Guest count shows locked but price is changing
**Cause:** This shouldn't happen. If it does, there's a bug.
**Action:** Contact development team immediately.

### Lock icon not showing but it should
**Cause:** Booking might not have reservation payment recorded.
**Action:** Check booking payment history in database.

### Guest count not locked for confirmed booking
**Cause:** Booking might not have `reserved_payment_total > 0`.
**Action:** Verify reservation payment was recorded correctly.

---

## 💡 Tips for Admins

1. **Always check the sidebar** for lock indicators before quoting prices
2. **Explain guest lock policy** to clients during initial booking
3. **Document guest count changes** in event notes
4. **Verify final pricing** before processing final payment
5. **Screenshot budget breakdown** for client records

---

## 📊 Example Pricing Table

| Booking | Reserved | Current | Effective | Additional | Final |
|---------|----------|---------|-----------|------------|-------|
| #001 | 200 | 150 | 200 🔒 | ₱0 | ₱275,000 |
| #002 | 200 | 200 | 200 | ₱0 | ₱275,000 |
| #003 | 200 | 250 | 250 ✓ | ₱17,500 | ₱292,500 |
| #004 | 200 | 300 | 300 ✓ | ₱35,000 | ₱310,000 |

**Legend:**
- 🔒 = Locked (no refund)
- ✓ = Recalculated (additional charge)

---

## ✅ Best Practices

1. **Set realistic guest estimates** during booking phase
2. **Communicate lock policy** clearly to clients
3. **Document all changes** in event notes
4. **Review pricing** before event creation
5. **Keep clients informed** of price changes
6. **Use the console logs** for debugging pricing issues

---

**Last Updated:** October 23, 2025
**Version:** 1.0.0
