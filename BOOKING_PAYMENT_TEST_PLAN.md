# Booking Reservation Payment System - Test Plan

## Overview
This document outlines the comprehensive testing plan for the booking reservation payment system implementation.

## Test Environment Setup

### Prerequisites
1. Database migrations have been executed successfully
2. Admin has configured payment settings (GCash, Bank Transfer info)
3. Test users exist: Admin, Staff, Client
4. Test data: Event types, venues, packages

### Database Verification
Run these SQL queries to verify database setup:

```sql
-- Check payment settings are added
DESCRIBE tbl_website_settings;

-- Check booking status enum includes 'reserved'
SHOW COLUMNS FROM tbl_bookings LIKE 'booking_status';

-- Check booking acceptance tracking fields
SHOW COLUMNS FROM tbl_bookings LIKE 'accepted_%';

-- Check payment table has booking_id field
SHOW COLUMNS FROM tbl_payments LIKE 'booking_id';
```

## Test Scenarios

### 1. Admin Payment Settings Configuration

**Test Case 1.1: Configure Payment Information**
- **Steps:**
  1. Login as Admin
  2. Navigate to Settings → Payment Settings tab
  3. Fill in GCash information (name, number)
  4. Fill in Bank Transfer information (bank name, account name, account number)
  5. Add payment instructions
  6. Save settings

- **Expected Results:**
  - Payment settings are saved successfully
  - Success message displayed
  - Settings persist after page refresh

**Test Case 1.2: Update Payment Information**
- **Steps:**
  1. Modify existing payment settings
  2. Save changes
  3. Verify updates are reflected

- **Expected Results:**
  - Changes are saved and displayed correctly

### 2. Client Booking Creation with Payment Information

**Test Case 2.1: Create Booking and View Payment Information**
- **Steps:**
  1. Login as Client
  2. Navigate to Create Booking
  3. Complete booking form (steps 1-5)
  4. Navigate to Payment Information step (step 6)
  5. Verify payment information is displayed

- **Expected Results:**
  - Payment step shows GCash information
  - Payment step shows Bank Transfer information
  - Payment step shows Cash on Site option
  - Payment instructions are displayed
  - Booking can be submitted successfully

**Test Case 2.2: Booking Status After Creation**
- **Steps:**
  1. Create a booking without payment
  2. Check booking status in client bookings list

- **Expected Results:**
  - Booking status is "pending"
  - No payment information shown

### 3. Admin/Staff Payment Recording

**Test Case 3.1: Admin Records Payment for Booking**
- **Steps:**
  1. Login as Admin
  2. Navigate to Bookings page
  3. Open a pending booking
  4. Click "Make Payment" button
  5. Fill payment form (amount, method, reference, etc.)
  6. Submit payment

- **Expected Results:**
  - Payment modal opens correctly
  - Payment is recorded successfully
  - Booking status changes to "reserved"
  - Payment appears in booking details
  - Success notification shown

**Test Case 3.2: Staff Records Payment for Booking**
- **Steps:**
  1. Login as Staff
  2. Navigate to Bookings page
  3. Open a pending booking
  4. Click "Make Payment" button
  5. Record payment with different amount/method
  6. Submit payment

- **Expected Results:**
  - Same results as Admin test case
  - Staff can record payments successfully

**Test Case 3.3: Multiple Payments for Same Booking**
- **Steps:**
  1. Record first payment (partial amount)
  2. Record second payment (remaining amount)
  3. Verify payment history

- **Expected Results:**
  - Both payments are recorded
  - Payment history shows all transactions
  - Total paid amount is calculated correctly

### 4. Booking Acceptance Workflow

**Test Case 4.1: Admin Accepts Reserved Booking**
- **Steps:**
  1. Login as Admin
  2. Find a booking with "reserved" status
  3. Click "Accept Booking" button
  4. Verify acceptance

- **Expected Results:**
  - Booking status changes to "confirmed"
  - Accepted by information is recorded (Admin name, timestamp)
  - Client receives notification
  - Other admins/staff receive notification

**Test Case 4.2: Staff Accepts Reserved Booking**
- **Steps:**
  1. Login as Staff
  2. Find a booking with "reserved" status
  3. Click "Accept Booking" button
  4. Verify acceptance

- **Expected Results:**
  - Same results as Admin test case
  - Accepted by information shows Staff name

**Test Case 4.3: Accept Pending Booking (No Payment)**
- **Steps:**
  1. Find a booking with "pending" status (no payment)
  2. Click "Accept Booking" button
  3. Verify acceptance

- **Expected Results:**
  - Booking status changes to "confirmed"
  - Acceptance is recorded properly

### 5. Client Booking Details and Payment Information

**Test Case 5.1: View Payment Information in Booking Details**
- **Steps:**
  1. Login as Client
  2. Navigate to Bookings page
  3. Click "View Details" on a booking
  4. Verify payment information section

- **Expected Results:**
  - Payment information section is displayed
  - GCash details are shown
  - Bank transfer details are shown
  - Cash on site option is shown
  - Payment instructions are displayed

**Test Case 5.2: View Payment Status in Booking List**
- **Steps:**
  1. View bookings list as client
  2. Check different booking statuses
  3. Verify payment status indicators

- **Expected Results:**
  - "Reserved" bookings show payment made indicator
  - "Confirmed" bookings show accepted by information
  - Status colors are correct

### 6. Event Conversion with Payment Transfer

**Test Case 6.1: Convert Booking with Payment to Event**
- **Steps:**
  1. Login as Staff
  2. Find a confirmed booking with payments
  3. Click "Create an Event" button
  4. Complete event creation
  5. Check event payment history

- **Expected Results:**
  - Event is created successfully
  - Booking status changes to "converted"
  - Payment history is transferred to event
  - Event shows original booking payments

**Test Case 6.2: Event Payment History Verification**
- **Steps:**
  1. Navigate to created event details
  2. Check payment history tab
  3. Verify payment details

- **Expected Results:**
  - All booking payments appear in event payment history
  - Payment amounts, methods, and dates are correct
  - Payment references are preserved

### 7. Notification System

**Test Case 7.1: New Booking Notifications**
- **Steps:**
  1. Create a new booking as client
  2. Check admin and staff notifications

- **Expected Results:**
  - All admins receive notification
  - All staff receive notification
  - Notification contains booking details

**Test Case 7.2: Payment Made Notifications**
- **Steps:**
  1. Record a payment for a booking
  2. Check admin and staff notifications

- **Expected Results:**
  - Admins and staff are notified of payment
  - Notification contains payment details

**Test Case 7.3: Booking Acceptance Notifications**
- **Steps:**
  1. Accept a booking
  2. Check client and other admin/staff notifications

- **Expected Results:**
  - Client receives acceptance notification
  - Other admins/staff receive notification about who accepted

### 8. Error Handling and Edge Cases

**Test Case 8.1: Invalid Payment Amounts**
- **Steps:**
  1. Try to record payment with 0 amount
  2. Try to record payment with negative amount
  3. Try to record payment with amount exceeding total

- **Expected Results:**
  - Appropriate error messages shown
  - Payment is not recorded
  - Form validation works correctly

**Test Case 8.2: Missing Payment Settings**
- **Steps:**
  1. Clear payment settings in admin panel
  2. Try to view payment information as client

- **Expected Results:**
  - Payment information section is hidden or shows appropriate message
  - No errors occur

**Test Case 8.3: Database Constraints**
- **Steps:**
  1. Try to accept booking that's already accepted
  2. Try to record payment for non-existent booking

- **Expected Results:**
  - Appropriate error handling
  - No database errors
  - User-friendly error messages

## Performance Testing

### Test Case P.1: Large Number of Bookings
- Create 100+ bookings with payments
- Verify system performance remains acceptable
- Check database query performance

### Test Case P.2: Concurrent Operations
- Multiple users creating bookings simultaneously
- Multiple admins/staff recording payments simultaneously
- Verify no data corruption or conflicts

## Security Testing

### Test Case S.1: Authorization
- Verify clients cannot access admin/staff functions
- Verify staff cannot access admin-only functions
- Verify payment settings are only editable by admin

### Test Case S.2: Data Validation
- Test SQL injection attempts in payment forms
- Test XSS attempts in payment notes
- Verify all inputs are properly sanitized

## Browser Compatibility Testing

Test the following browsers:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Mobile Responsiveness Testing

- Test on mobile devices
- Verify payment modals work on small screens
- Check touch interactions

## Test Data Cleanup

After testing, clean up test data:
```sql
-- Remove test bookings
DELETE FROM tbl_bookings WHERE booking_reference LIKE 'TEST_%';

-- Remove test payments
DELETE FROM tbl_payments WHERE payment_reference LIKE 'TEST_%';

-- Reset payment settings if needed
UPDATE tbl_website_settings SET
  gcash_name = NULL,
  gcash_number = NULL,
  bank_name = NULL,
  bank_account_name = NULL,
  bank_account_number = NULL,
  payment_instructions = NULL;
```

## Success Criteria

The booking reservation payment system is considered successfully implemented when:

1. ✅ All test cases pass without errors
2. ✅ Payment information is displayed correctly to clients
3. ✅ Admin and staff can record payments successfully
4. ✅ Booking acceptance workflow works properly
5. ✅ Payment transfer to events functions correctly
6. ✅ Notifications are sent to all relevant parties
7. ✅ No security vulnerabilities are found
8. ✅ System performs well under normal load
9. ✅ Mobile experience is satisfactory
10. ✅ Error handling is robust and user-friendly

## Test Execution Log

| Test Case | Status | Notes | Tester | Date |
|-----------|--------|-------|--------|------|
| 1.1 | ⏳ | | | |
| 1.2 | ⏳ | | | |
| 2.1 | ⏳ | | | |
| 2.2 | ⏳ | | | |
| 3.1 | ⏳ | | | |
| 3.2 | ⏳ | | | |
| 3.3 | ⏳ | | | |
| 4.1 | ⏳ | | | |
| 4.2 | ⏳ | | | |
| 4.3 | ⏳ | | | |
| 5.1 | ⏳ | | | |
| 5.2 | ⏳ | | | |
| 6.1 | ⏳ | | | |
| 6.2 | ⏳ | | | |
| 7.1 | ⏳ | | | |
| 7.2 | ⏳ | | | |
| 7.3 | ⏳ | | | |
| 8.1 | ⏳ | | | |
| 8.2 | ⏳ | | | |
| 8.3 | ⏳ | | | |

## Issues Found

| Issue ID | Description | Severity | Status | Resolution |
|----------|-------------|----------|--------|------------|
| | | | | |

## Sign-off

- [ ] Development Team Lead
- [ ] QA Team Lead
- [ ] Product Owner
- [ ] System Administrator

---

**Document Version:** 1.0
**Created:** [Current Date]
**Last Updated:** [Current Date]
