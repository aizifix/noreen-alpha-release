# Booking Reservation Flow - Quick Start Guide

## Overview
This guide shows how to use the complete booking-to-event conversion flow with reservation fee tracking.

## Step-by-Step Process

### 1. Client Creates a Booking

**Action:** Client submits a booking request through the client portal

**What happens:**
- Booking is created with status: `pending`
- System generates unique booking reference (e.g., `BK-20251025-3982`)
- Booking appears in Admin/Staff bookings dashboard

**Database:**
```
tbl_bookings:
- booking_reference: BK-20251025-3982
- booking_status: pending
- user_id: [client_id]
- total_price: 120000.00
```

---

### 2. Admin/Staff Processes Reservation Payment

**Action:** Admin/Staff adds reservation payment for the booking

**Steps:**
1. Navigate to Bookings page
2. Find the pending booking
3. Click "Add Reservation Payment" or similar action
4. Enter payment details:
   - Payment Amount: e.g., ₱5,000
   - Payment Method: Cash/GCash/Bank Transfer
   - Payment Reference: Transaction reference
   - Payment Date: Payment date

**What happens:**
- Payment record created in `tbl_payments` with `booking_id`
- Payment status set to `completed` or `paid`
- Booking status automatically changes to `reserved`
- Notification sent to admins and staff

**Database:**
```
tbl_payments:
- booking_id: [booking_id]
- event_id: NULL
- payment_amount: 5000.00
- payment_status: completed
- payment_method: cash

tbl_bookings:
- booking_status: reserved (changed from pending)
```

---

### 3. Admin Confirms Booking is Ready

**Action:** Admin reviews and confirms the booking

**Steps:**
1. Navigate to Bookings page
2. Find the reserved booking
3. Click "Confirm" or "Approve" button

**What happens:**
- Booking status changes to `confirmed`
- Booking is now ready to be converted to an event

**Database:**
```
tbl_bookings:
- booking_status: confirmed (changed from reserved)
```

---

### 4. Convert Booking to Event

**Action:** Admin converts the confirmed booking to an event using Event Builder

**Steps:**
1. Navigate to Bookings page
2. Find the confirmed booking
3. Click "Convert to Event" or "Create Event"
4. Event Builder opens with pre-filled data from booking:
   - Event name, date, time
   - Venue, package
   - Guest count
   - **Original booking reference is automatically set**
5. Customize event details as needed
6. Add components, timeline items
7. Click "Create Event"

**What happens:**
- Event is created in `tbl_events`
- System automatically:
  1. Fetches all reservation payments from the booking
  2. Calculates `reserved_payment_total` (sum of all completed payments)
  3. Calculates `adjusted_total` (total_budget - reserved_payment_total)
  4. Stores these values in the event record
  5. Links event to booking via `original_booking_reference`
  6. Updates booking status to `converted`
  7. Sets `converted_event_id` in booking

**Database:**
```
tbl_events:
- event_id: 256
- original_booking_reference: BK-20251025-3982
- user_id: [client_id]
- total_budget: 85000.00
- reserved_payment_total: 5000.00  ← Automatically calculated!
- adjusted_total: 80000.00          ← Automatically calculated!
- event_status: confirmed

tbl_bookings:
- booking_status: converted (changed from confirmed)
- converted_event_id: 256
```

---

### 5. Event Payment Summary Display

**Action:** View the event details page

**What you see in Payment Summary:**
```
┌─────────────────────────────────────────────────────┐
│  Payment Summary                                    │
├─────────────────────────────────────────────────────┤
│  Total Budget:       ₱85,000.00                     │
│  Reservation Fee:    ₱5,000.00   ← Shows reserved! │
│  Down Payment:       ₱25,000.00                     │
│  Total Paid:         ₱30,000.00                     │
│  Remaining Balance:  ₱55,000.00                     │
└─────────────────────────────────────────────────────┘
```

**Payment History shows:**
- Reservation Payment: ₱5,000 (from booking) - marked as "reserved"
- Initial Payment: ₱25,000 (event down payment)

---

### 6. Add Initial Event Payment

**Action:** Admin adds down payment or initial payment for event

**Steps:**
1. On event details page, go to Payments section
2. Click "Add Payment"
3. Enter payment details:
   - Payment Amount: e.g., ₱25,000
   - Payment Method: Cash/GCash/Bank Transfer
   - Payment Reference: Transaction reference

**What happens:**
- Payment record created in `tbl_payments` with `event_id`
- Total paid increases
- Remaining balance decreases
- Payment is separate from reservation fee

**Database:**
```
tbl_payments:
- booking_id: NULL
- event_id: 256
- payment_amount: 25000.00
- payment_status: completed
```

---

## Key Differences: Booking Payments vs Event Payments

### Booking Payments (Reservation Fees)
- Linked via `booking_id`
- `event_id` is NULL
- Paid during booking stage (before event creation)
- Purpose: Reserve the slot/date
- Automatically tracked and deducted from event total
- Appear in event payment history as "reserved" type

### Event Payments (Initial Payment, Installments)
- Linked via `event_id`
- `booking_id` is NULL
- Paid during event stage (after conversion)
- Purpose: Pay for event package/services
- Count toward event's total paid amount
- Appear in payment history as regular payments

---

## Verifying the System is Working

### Check 1: Database Values
```sql
SELECT
    e.event_id,
    e.event_title,
    e.original_booking_reference,
    e.total_budget,
    e.reserved_payment_total,   -- Should be > 0 if booking had payments
    e.adjusted_total,            -- Should be total_budget - reserved_payment_total
    b.booking_status             -- Should be 'converted'
FROM tbl_events e
LEFT JOIN tbl_bookings b ON e.original_booking_reference = b.booking_reference
WHERE e.original_booking_reference = 'BK-20251025-3982';
```

**Expected Result:**
```
event_id: 256
event_title: Jaruda
original_booking_reference: BK-20251025-3982
total_budget: 85000.00
reserved_payment_total: 5000.00   ← Should NOT be 0.00
adjusted_total: 80000.00          ← Should NOT be 0.00
booking_status: converted
```

### Check 2: Payment Records
```sql
SELECT
    p.payment_id,
    p.booking_id,
    p.event_id,
    p.payment_amount,
    p.payment_status,
    p.payment_date,
    CASE
        WHEN p.booking_id IS NOT NULL THEN 'Reservation Payment'
        WHEN p.event_id IS NOT NULL THEN 'Event Payment'
    END as payment_category
FROM tbl_payments p
WHERE p.booking_id = (SELECT booking_id FROM tbl_bookings WHERE booking_reference = 'BK-20251025-3982')
   OR p.event_id = (SELECT event_id FROM tbl_events WHERE original_booking_reference = 'BK-20251025-3982')
ORDER BY p.payment_date;
```

### Check 3: Frontend Display
1. Navigate to event details page
2. Look at Payment Summary section
3. Verify "Reservation Fee" appears
4. Check browser console for debug logs:
   ```
   Payment Summary Debug: {
     storedReservedPayment: 5000,
     calculatedReservedPayment: 5000,
     hasReservedPayments: true,
     originalBookingReference: "BK-20251025-3982"
   }
   ```

---

## Fixing Existing Events

If you have events that were converted BEFORE this fix was implemented:

### Option 1: Run Migration Script
```sql
-- In phpMyAdmin or MySQL Workbench
-- Open and execute:
event-planning-system/app/api/migrations/fix_existing_reserved_payments.sql
```

### Option 2: Fix One Event
```sql
-- Replace 256 with your event_id
UPDATE tbl_events e
JOIN tbl_bookings b ON e.original_booking_reference = b.booking_reference
LEFT JOIN (
    SELECT
        booking_id,
        SUM(payment_amount) as total_paid
    FROM tbl_payments
    WHERE payment_status IN ('completed', 'paid')
    GROUP BY booking_id
) p ON b.booking_id = p.booking_id
SET
    e.reserved_payment_total = COALESCE(p.total_paid, 0.00),
    e.adjusted_total = e.total_budget - COALESCE(p.total_paid, 0.00)
WHERE e.event_id = 256;
```

---

## Common Issues and Solutions

### Issue: Reservation Fee shows ₱0.00
**Cause:** Event was created before fix was implemented
**Solution:** Run migration script or manual update SQL

### Issue: Reservation Fee not appearing in Payment Summary
**Cause 1:** No reservation payment was made during booking stage
**Solution:** This is correct - reservation fee only shows if payment was made

**Cause 2:** Event doesn't have original_booking_reference
**Solution:** Event was created manually, not from a booking conversion

### Issue: Wrong reservation fee amount
**Cause:** Multiple payments on booking or incorrect payment status
**Solution:** Check tbl_payments for the booking_id:
```sql
SELECT * FROM tbl_payments
WHERE booking_id = (SELECT booking_id FROM tbl_bookings WHERE booking_reference = 'BK-XXXXX')
AND payment_status IN ('completed', 'paid');
```

---

## Testing Checklist

- [ ] Create new booking as client
- [ ] Add reservation payment as admin (status: pending → reserved)
- [ ] Confirm booking as admin (status: reserved → confirmed)
- [ ] Convert to event via event builder (status: confirmed → converted)
- [ ] Verify event has `reserved_payment_total` > 0
- [ ] Verify event has correct `adjusted_total`
- [ ] Check Payment Summary shows "Reservation Fee"
- [ ] Add initial payment to event
- [ ] Verify Total Paid includes both reservation and initial payments
- [ ] Verify Remaining Balance is correct

---

## API Endpoints Used

### Booking Creation
```
POST /api/client.php?action=createBooking
```

### Reservation Payment
```
POST /api/admin.php?action=createReservationPayment
POST /api/staff.php?action=createReservationPayment
```

### Confirm Booking
```
POST /api/admin.php?action=updateBookingStatus
```

### Convert to Event
```
POST /api/admin.php?action=createEvent
POST /api/staff.php?action=createEvent
```

### Get Event Details
```
GET /api/admin.php?action=getEnhancedEventDetails&event_id={id}
```

---

## Support

For issues or questions:
1. Check browser console for debug logs
2. Verify database values using SQL queries above
3. Run migration script if dealing with old events
4. Check RESERVATION_FEE_SYSTEM_FIX.md for technical details

**Last Updated:** October 25, 2025
