# Reservation Fee System - Fixed Implementation

## Issue Summary
The booking-to-event conversion system was not properly tracking and storing reservation fees paid during the booking stage. This resulted in `reserved_payment_total` and `adjusted_total` fields showing `0.00` even when reservation payments had been made.

## Root Cause
When creating an event from a booking conversion, the system was:
1. NOT calculating the total reserved payments from the booking
2. NOT storing `reserved_payment_total` in the events table
3. NOT calculating and storing `adjusted_total` (total budget - reserved payments)

The INSERT statements in both `admin.php` and `staff.php` explicitly excluded these columns with a comment: "without reserved_payment_total and adjusted_total columns for now"

## Solution Implemented

### 1. Backend Changes (PHP API)

#### admin.php (Lines 704-743, 868-869)
- Added calculation of `reserved_payment_total` before event creation
- Queries the booking's payments table to sum all completed/paid reservation payments
- Calculates `adjusted_total` as `total_budget - reserved_payment_total`
- Updated the INSERT statement to include both new columns
- Updated the event parameters array to include the calculated values

#### staff.php (Lines 674-713, 838-839)
- Applied identical changes as admin.php
- Ensures staff members can also properly convert bookings with reservation fees

### 2. Frontend Changes (TypeScript/React)

#### Event Details Page - Payment Summary (Lines 5153-5252)
- Enhanced to prioritize stored `reserved_payment_total` from event table
- Falls back to calculating from payment history if stored value is 0
- Changed label from "Reserved Fee" to "Reservation Fee" for clarity
- Added debug logging to track payment calculation

### 3. Database Migration

#### fix_existing_reserved_payments.sql
- SQL script to update existing events that were converted from bookings
- Retroactively calculates and updates `reserved_payment_total` and `adjusted_total`
- Includes verification query to show results

## Booking-to-Event Flow

### Status Flow
```
Booking Creation (Client)
  ↓
pending
  ↓
Reservation Payment (Admin/Staff) → reserved_payment_total tracked
  ↓
reserved
  ↓
Admin Confirms Ready for Conversion
  ↓
confirmed
  ↓
Convert to Event via Event Builder → reservation fee stored in event
  ↓
converted → Event Created with original_booking_reference
  ↓
Initial Payment for Event (down_payment)
  ↓
Event Status: confirmed
```

### Payment Tracking

**During Booking Stage:**
- Reservation payments stored in `tbl_payments` with `booking_id`
- Payment status: `completed` or `paid`
- Booking status changes to `reserved` after payment

**During Event Creation:**
1. System fetches booking by `original_booking_reference`
2. Queries all payments for that booking where `payment_status IN ('completed', 'paid')`
3. Calculates `reserved_payment_total` as SUM of payment amounts
4. Calculates `adjusted_total` as `total_budget - reserved_payment_total`
5. Stores both values in the event record
6. Booking status changes to `converted`

**Event Payment Summary:**
- **Total Budget**: Full package/event cost
- **Reservation Fee**: Amount paid during booking stage (deducted from total)
- **Down Payment**: Initial payment for event finalization
- **Total Paid**: Sum of all completed payments (including reservation fee)
- **Remaining Balance**: Total Budget - Total Paid
- **Adjusted Total**: What client still owes after reservation fee deduction

## Database Schema

### tbl_events
```sql
reserved_payment_total DECIMAL(10,2) DEFAULT 0.00
  COMMENT 'Total amount of reserved payments from original booking'

adjusted_total DECIMAL(10,2) DEFAULT 0.00
  COMMENT 'Total amount after subtracting reserved payments'

original_booking_reference VARCHAR(50)
  COMMENT 'Reference to original booking if converted'
```

### tbl_bookings
```sql
booking_status ENUM('pending', 'reserved', 'confirmed', 'converted', 'cancelled')
booking_reference VARCHAR(50) UNIQUE
converted_event_id INT
  COMMENT 'Event ID if booking was converted'
```

### tbl_payments
```sql
booking_id INT COMMENT 'Links to booking for reservation payments'
event_id INT COMMENT 'Links to event for event payments'
payment_status ENUM('pending', 'completed', 'paid', 'cancelled', ...)
payment_amount DECIMAL(10,2)
```

## How to Fix Existing Events

### Option 1: Run Migration Script
```bash
# In your database management tool (phpMyAdmin, MySQL Workbench, etc.)
# Execute the migration script:
event-planning-system/app/api/migrations/fix_existing_reserved_payments.sql
```

### Option 2: Manual SQL Update
```sql
-- Update a specific event
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
WHERE e.event_id = YOUR_EVENT_ID;
```

## Testing the Fix

### Test Case 1: New Booking Conversion
1. Client creates a booking
2. Admin/Staff processes reservation payment (e.g., ₱5,000)
3. Booking status changes to `reserved`
4. Admin confirms booking (status: `confirmed`)
5. Admin converts booking to event via event builder
6. Verify event has:
   - `original_booking_reference` = booking reference
   - `reserved_payment_total` = 5000.00
   - `adjusted_total` = total_budget - 5000.00
7. Payment summary shows "Reservation Fee: ₱5,000.00"

### Test Case 2: Event with Initial Payment
1. After conversion (from Test Case 1)
2. Admin adds initial payment (e.g., ₱25,000)
3. Payment summary shows:
   - Total Budget: e.g., ₱100,000
   - Reservation Fee: ₱5,000
   - Down Payment: ₱25,000
   - Total Paid: ₱30,000
   - Remaining Balance: ₱70,000

### Test Case 3: Existing Events
1. Run migration script
2. Check event that was converted from booking (e.g., event_id 256)
3. Verify `reserved_payment_total` and `adjusted_total` are now populated
4. Verify payment summary displays correctly

## API Endpoints Affected

### POST /api/admin.php?action=createEvent
- Now includes `reserved_payment_total` and `adjusted_total` in INSERT

### POST /api/staff.php?action=createEvent
- Now includes `reserved_payment_total` and `adjusted_total` in INSERT

### GET /api/admin.php?action=getEnhancedEventDetails
- Returns event with `reserved_payment_total` and `adjusted_total`
- Returns payment history including reserved payments (payment_type: 'reserved')

### GET /api/admin.php?action=getBookingByReference
- Calculates and returns `reserved_payment_total` from booking payments

## Troubleshooting

### Reserved Payment Not Showing
1. Check if `original_booking_reference` is set in tbl_events
2. Verify booking payments exist in tbl_payments with correct booking_id
3. Confirm payment_status is 'completed' or 'paid'
4. Check browser console for "Payment Summary Debug" logs

### Migration Failed
1. Verify tbl_events has `reserved_payment_total` and `adjusted_total` columns
2. If columns missing, run: `event-planning-system/app/api/migrations/add_reserved_payment_columns_to_events.sql`
3. Check for booking_reference mismatches

### Incorrect Amounts
1. Verify total_budget is correct in tbl_events
2. Check all payments for the booking have correct amounts
3. Ensure no duplicate payment records
4. Run the SELECT query from migration script to audit values

## Files Modified

1. `event-planning-system/app/api/admin.php` - Event creation with reservation fee tracking
2. `event-planning-system/app/api/staff.php` - Event creation with reservation fee tracking
3. `event-planning-system/app/(authenticated)/admin/events/[id]/page.tsx` - Payment summary display
4. `event-planning-system/app/api/migrations/fix_existing_reserved_payments.sql` - Migration script (NEW)
5. `event-planning-system/RESERVATION_FEE_SYSTEM_FIX.md` - This documentation (NEW)

## Maintenance Notes

### When Adding New Booking-to-Event Conversion Points
Ensure any new code that creates events from bookings:
1. Fetches the booking's payment total
2. Includes `reserved_payment_total` and `adjusted_total` in INSERT
3. Properly links with `original_booking_reference`

### When Modifying Payment Processing
Remember that:
- Booking payments must use `booking_id` (not `event_id`)
- Event payments must use `event_id` (can be NULL for booking_id)
- Payment status must be 'completed' or 'paid' to count toward reserved total
- Payment type 'reserved' helps frontend identify reservation fees

## Success Criteria

✅ New bookings converted to events have correct `reserved_payment_total`
✅ Existing events can be updated via migration script
✅ Payment summary displays "Reservation Fee" when applicable
✅ Adjusted total correctly reflects budget minus reservation payments
✅ Both admin and staff conversions work identically
✅ Frontend prioritizes stored values over calculated values

## Date Implemented
October 25, 2025

## Notes
- The system now stores reservation totals in the events table for performance
- Frontend still calculates as backup for data integrity
- Migration script provided for retroactive updates
- Both admin.php and staff.php have identical logic for consistency
