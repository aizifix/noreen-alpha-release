# Enhanced Booking Flow Testing Guide

## Overview

This guide helps test the enhanced booking-to-event conversion workflow that prevents confusion and data conflicts.

## Test Scenarios

### 1. **Booking Selection in Event Builder**

**Steps:**

1. Navigate to `/admin/event-builder`
2. Click "Enter Booking" button
3. Select an available booking from the list
4. Verify that all fields are automatically populated:
   - Client details (name, email, phone)
   - Event details (title, type, date, time, capacity)
   - Package selection (if package was assigned)
   - Venue selection (if venue was assigned)

**Expected Results:**

- ✅ Green confirmation message shows booking reference
- ✅ All subsequent steps are pre-filled
- ✅ Package and venue are auto-selected when available
- ✅ User can proceed through the wizard with minimal input

### 2. **Booking Status Management**

**Steps:**

1. Create an event from a booking
2. Check the booking status in `/admin/bookings`
3. Verify the booking is marked as "converted"
4. Try to select the same booking again in event builder

**Expected Results:**

- ✅ Booking status changes to "converted" (blue badge)
- ✅ Converted booking shows "🔄 This booking has been converted to an event"
- ✅ Converted booking does NOT appear in event builder booking list
- ✅ "View Event" button works correctly

### 3. **Booking Filtering**

**Steps:**

1. Go to `/admin/bookings`
2. Use the status filter dropdown
3. Filter by "Converted" status
4. Verify only converted bookings appear

**Expected Results:**

- ✅ Filter shows all status options: Pending, Confirmed, Converted, Completed, Cancelled
- ✅ Converted bookings are properly filtered
- ✅ Statistics cards show correct counts

### 4. **Event Builder Booking List**

**Steps:**

1. Open event builder
2. Click "Enter Booking"
3. Verify only available bookings appear

**Expected Results:**

- ✅ Only pending and confirmed bookings appear
- ✅ Converted bookings are excluded from the list
- ✅ Search functionality works properly
- ✅ Loading states work correctly

## API Endpoints Verification

### Test Available Bookings Endpoint

```bash
curl -X POST http://localhost/events-api/admin.php \
  -H "Content-Type: application/json" \
  -d '{"operation": "getAvailableBookings"}'
```

**Expected:** Returns only pending/confirmed bookings, excludes converted ones.

### Test All Bookings Endpoint

```bash
curl -X POST http://localhost/events-api/admin.php \
  -H "Content-Type: application/json" \
  -d '{"operation": "getAllBookings"}'
```

**Expected:** Returns all bookings including converted ones.

## Database Verification

### Check Booking Status Updates

```sql
-- View booking statuses
SELECT booking_reference, booking_status, updated_at
FROM tbl_bookings
ORDER BY updated_at DESC;

-- View events with booking references
SELECT event_id, event_title, original_booking_reference
FROM tbl_events
WHERE original_booking_reference IS NOT NULL;

-- Check for orphaned bookings (converted but no matching event)
SELECT b.booking_reference, b.booking_status
FROM tbl_bookings b
LEFT JOIN tbl_events e ON b.booking_reference = e.original_booking_reference
WHERE b.booking_status = 'converted' AND e.event_id IS NULL;
```

## Common Issues & Solutions

### Issue: Booking still appears in event builder after conversion

**Solution:** Run the SQL migration script `fix_booking_statuses.sql`

### Issue: Venue not auto-selected from booking

**Solution:** Verify that the booking's venue_id matches a venue in the selected package

### Issue: Package components not loading

**Solution:** Check that the package API returns proper venue and component data

## Manual Cleanup (if needed)

### Reset a converted booking for testing

```sql
UPDATE tbl_bookings
SET booking_status = 'confirmed', updated_at = NOW()
WHERE booking_reference = 'BK-XXXXXX-XXXX';
```

### Mark bookings as converted (batch operation)

```sql
UPDATE tbl_bookings
SET booking_status = 'converted', updated_at = NOW()
WHERE booking_reference IN (
    SELECT DISTINCT original_booking_reference
    FROM tbl_events
    WHERE original_booking_reference IS NOT NULL
);
```

## Success Criteria

✅ **Data Integrity:** No booking can be converted to multiple events
✅ **User Experience:** Clear visual feedback throughout the process
✅ **Workflow Clarity:** Obvious distinction between bookings and events
✅ **Performance:** Fast loading and filtering of booking lists
✅ **Audit Trail:** Complete tracking of booking-to-event conversions

## Notes

- Test with different booking statuses (pending, confirmed)
- Test with and without packages/venues assigned
- Verify error handling for edge cases
- Test the booking search functionality
- Ensure responsive design works on mobile devices
