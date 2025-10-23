# Quick Start Guide: Reservation Fee System

## 🎯 What This Does

When clients book an event package, admins can record a **reservation fee** (advance payment). When the booking is converted to an event, this fee is **automatically subtracted** from the package price.

## ⚡ Quick Example

```
Package Price:      ₱50,000
Reservation Fee:    -₱5,000
─────────────────────────────
Adjusted Total:     ₱45,000  ← This is what shows in Event Builder
```

## 📋 Step-by-Step Guide

### Step 1: Client Creates Booking
Client books a package through the client portal. Booking status is `pending`.

### Step 2: Record Reservation Fee

1. **Go to:** Admin Dashboard → Bookings
2. **Find** the pending booking
3. **Click** "View" button
4. **Click** "Make Payment" button
5. **Enter** reservation fee details:
   - Amount: e.g., ₱5,000
   - Payment Method: Cash, GCash, or Bank Transfer
   - Reference Number: Transaction/receipt number
   - Date: Today's date
   - Status: **Completed** (important!)
   - Notes: Optional description
6. **Click** "Record Payment"

**Visual Confirmation:**
- ✅ Booking card shows "💳 Reservation Fee: ₱5,000"
- ✅ Payment appears in "Payments" tab
- ✅ Green indicator on booking card

### Step 3: Confirm Booking

1. **Click** "Accept" button on the booking
2. Status changes to `confirmed`
3. Reservation fee is preserved

### Step 4: Create Event

1. **Click** "Create an Event" button
2. Event Builder opens automatically
3. Package is pre-selected
4. **Budget shows adjusted amount:**
   - Original Package: ₱50,000
   - Reserved Payment: -₱5,000
   - **Adjusted Total: ₱45,000** ✅

## 🎨 Visual Indicators

### On Booking Card (Pending with Payment)
```
BOOK-2024-001                    [🔔 pending]
Wedding Event
💳 Reservation Fee: ₱5,000.00    ← NEW GREEN TEXT
```

### In Payment Modal
```
┌──────────────────────────────────────────┐
│ Record Reservation Fee           [×]     │
│                                          │
│ This amount will be subtracted from      │
│ the package price when you create an     │
│ event.                                   │
├──────────────────────────────────────────┤
│ [Payment form fields...]                 │
│                                          │
│ ┌──────────────────────────────────────┐│
│ │ 💡 This payment will be recorded as  ││
│ │ a reservation fee and will be        ││
│ │ subtracted from the package price    ││
│ │ when converting to an event.         ││
│ └──────────────────────────────────────┘│
└──────────────────────────────────────────┘
```

### In Event Builder
```
┌──────────────────────────────────────────┐
│ Budget Summary                           │
│                                          │
│ Package Price:          ₱50,000.00      │
│ Reserved Payment:        -₱5,000.00      │
│ ─────────────────────────────────────   │
│ Adjusted Total:         ₱45,000.00      │
│                                          │
│ Remaining Balance:      ₱45,000.00      │
└──────────────────────────────────────────┘
```

## ⚠️ Important Rules

### ✅ DO:
- ✅ Set payment status to "Completed" for it to count
- ✅ Add clear reference numbers
- ✅ Record reservation fees BEFORE confirming booking
- ✅ Verify the amount before submitting

### ❌ DON'T:
- ❌ Don't set status to "Pending" if payment is completed
- ❌ Don't forget the reference number
- ❌ Don't record fake payments for testing in production
- ❌ Don't cancel payments without proper reason

## 🔍 Verification Checklist

After recording a reservation fee:

- [ ] Booking card shows green reservation fee amount
- [ ] Amount displays correctly with ₱ symbol
- [ ] Payment appears in "Payments" tab
- [ ] Payment status is "Completed"
- [ ] Reference number is saved
- [ ] When creating event, adjusted total is correct

## 🐛 Troubleshooting

### Problem: Reservation fee not showing on booking card
**Solution:**
- Check payment status is "Completed" or "Paid"
- Refresh the bookings page
- Verify booking status is "pending" or "reserved"

### Problem: Amount not deducted in Event Builder
**Solution:**
- Confirm booking is "confirmed" before creating event
- Check browser console for reservation payment data logs
- Look for: `💰 Reserved payment data from booking`
- Verify payment is linked to correct booking_id

### Problem: Wrong amount showing
**Solution:**
- Check if there are multiple payments
- Verify each payment status
- Only "Completed" and "Paid" statuses count
- Review payment history in database if needed

## 💡 Pro Tips

1. **Use Clear Reference Numbers**
   - Format: `GCASH-123456` or `CASH-2024-001`
   - Makes tracking easier
   - Helps with accounting

2. **Add Helpful Notes**
   - "Reservation fee for wedding - 50% down payment"
   - "Initial payment received via GCash"
   - "Deposit for venue booking"

3. **Double Check Before Creating Event**
   - Review booking details
   - Verify all payments are recorded
   - Check total amount is correct
   - Ensure client information is accurate

4. **Communication**
   - Inform client their reservation fee was recorded
   - Explain it will be deducted from total
   - Give them the reference number
   - Send payment confirmation if possible

## 📊 Common Scenarios

### Scenario A: Single Reservation Fee
```
Package: ₱50,000
Record: ₱10,000 reservation fee
Result: ₱40,000 remaining when creating event
```

### Scenario B: Multiple Payments
```
Package: ₱50,000
Record: ₱5,000 first payment
Record: ₱5,000 second payment
Result: ₱40,000 remaining when creating event
```

### Scenario C: Partial Reservation + Pending
```
Package: ₱50,000
Record: ₱10,000 (Status: Completed) ✅
Record: ₱5,000 (Status: Pending) ❌ not counted
Result: ₱40,000 remaining (only completed counts)
```

## 🎓 Training Checklist

For new staff members:

- [ ] Show how to navigate to Bookings page
- [ ] Demonstrate recording a reservation fee
- [ ] Point out visual indicators (green text, wallet icon)
- [ ] Show payment history tab
- [ ] Walk through confirming a booking
- [ ] Demonstrate creating event from booking
- [ ] Show where adjusted total appears
- [ ] Review troubleshooting steps
- [ ] Practice with test booking

## 📞 Need Help?

1. **First:** Check this guide and troubleshooting section
2. **Then:** Review full documentation (`reservation-fee-system.md`)
3. **Next:** Check browser console for error messages
4. **Finally:** Escalate to technical support with:
   - Booking reference number
   - Screenshot of issue
   - Browser console logs
   - Steps to reproduce

## 🔗 Related Documentation

- **Full System Documentation:** `reservation-fee-system.md`
- **Implementation Details:** `RESERVATION-FEE-IMPLEMENTATION.md`
- **Payment System Guide:** Check main README

---

**Last Updated:** 2024
**Version:** 1.0
**Status:** ✅ Production Ready
