# Reservation Fee System Documentation

## Overview

The reservation fee system allows admin/staff to record advance payments (reservation fees) for bookings. These fees are automatically deducted from the package price when converting a confirmed booking into an event.

## How It Works

### 1. Client Creates a Booking

- Client selects a package and venue
- Booking is created with status `pending`
- Package price is stored with the booking

### 2. Admin Records Reservation Fee

**Location:** Admin → Bookings → View Booking → Make Payment

**For pending/reserved bookings:**
- Admin can record a reservation fee payment
- Payment includes:
  - Payment amount (reservation fee)
  - Reference number (receipt/transaction number)
  - Payment method (Cash, GCash, Bank Transfer)
  - Payment date
  - Payment status (Completed/Pending)
  - Optional notes

**Visual Indicators:**
- Modal title changes to "Record Reservation Fee"
- Description explains the fee will be subtracted from package price
- Blue info box reminds admin about automatic deduction
- Booking card shows reservation fee amount with wallet icon

### 3. Admin Confirms Booking

**Location:** Admin → Bookings → Accept Button

- Admin reviews the booking
- Clicks "Accept" to confirm
- Booking status changes from `pending` → `confirmed`
- Reservation fee is preserved with the booking

### 4. Admin Creates Event from Booking

**Location:** Admin → Bookings → Create an Event Button

When admin converts a confirmed booking to an event:

1. **Event Builder Pre-population:**
   - Client details are filled in
   - Event details are populated
   - Package is automatically selected
   - Venue is pre-selected

2. **Package Price Adjustment:**
   - System fetches all completed reservation fee payments
   - Calculates: `adjustedTotal = packagePrice - reservedPaymentTotal`
   - Event builder shows the adjusted package price
   - Budget calculations use the adjusted total

3. **Payment History:**
   - Reservation fee payments are linked to the new event
   - Payment history shows both booking and event payments
   - Total budget reflects the package price minus reservation fees

## Technical Implementation

### Database Structure

**Tables Used:**
- `tbl_bookings` - Stores booking information
- `tbl_payments` - Stores all payment records
- `tbl_events` - Stores event information

**Payment Record:**
```php
{
  payment_id: int,
  booking_id: int,
  payment_amount: decimal,
  payment_method: string,
  payment_date: date,
  payment_status: string, // 'completed', 'pending', 'cancelled'
  payment_reference: string,
  payment_notes: string
}
```

### API Endpoints

#### 1. Create Reservation Payment
```
POST /admin.php
{
  operation: "createReservationPayment",
  booking_id: int,
  payment_amount: decimal,
  payment_method: string,
  payment_date: string,
  payment_status: string,
  payment_reference: string,
  payment_notes: string
}
```

#### 2. Get Booking with Payments
```
GET /admin.php?operation=getBookingByReference&reference=BOOK-XXX

Response:
{
  status: "success",
  booking: {
    ...booking_data,
    payments: [...payment_records],
    reserved_payment_total: decimal // Sum of completed payments
  }
}
```

### Frontend Implementation

#### Admin Bookings Page (`/admin/bookings/page.tsx`)

**Key Functions:**

1. **`calculatePaidAmount(booking)`**
   - Sums all completed/paid payments
   - Returns total reservation fee amount

2. **`handleCreatePayment()`**
   - Records reservation fee to database
   - Validates amount
   - Refreshes booking list

**Visual Components:**
- Reservation fee indicator on booking cards
- Enhanced payment modal with context-aware messaging
- Payment summary showing reservation fees

#### Event Builder (`/admin/event-builder/page.tsx`)

**Key Functions:**

1. **`loadBookingData(bookingRef)`**
   - Fetches booking with payment history
   - Sets `reservedPaymentData` state:
     ```typescript
     {
       reservedPayments: [...payments],
       reservedPaymentTotal: decimal,
       adjustedTotal: decimal
     }
     ```

2. **`loadStaticPackageData(packageId)`**
   - Gets original package price
   - Calculates adjusted total:
     ```typescript
     adjustedTotal = packagePrice - reservedPaymentTotal
     ```

3. **Budget Calculations**
   - Use `adjustedTotal` instead of original package price
   - All subsequent calculations reflect the reduced amount

### Payment Status Flow

```
Booking Status → Payment Type → What Happens
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
pending       → Reservation Fee → Recorded, awaiting confirmation
reserved      → Reservation Fee → Recorded, awaiting confirmation
confirmed     → Regular Payment → Added to event budget tracking
converted     → N/A             → Managed through event page
```

## User Workflow Example

### Scenario: Wedding Booking with ₱5,000 Reservation Fee

1. **Client Books Package (₱50,000)**
   - Client: Books "Premium Wedding Package"
   - System: Creates booking (status: pending)

2. **Admin Records Reservation Fee**
   - Admin: Opens booking details
   - Admin: Clicks "Make Payment"
   - Admin: Enters ₱5,000 as reservation fee
   - Admin: Adds reference number "GCASH-123456"
   - Admin: Saves payment
   - System: Records payment with booking_id

3. **Admin Confirms Booking**
   - Admin: Reviews booking details
   - Admin: Clicks "Accept"
   - System: Changes status to "confirmed"
   - Display: Shows ₱5,000 reservation fee paid

4. **Admin Creates Event**
   - Admin: Clicks "Create an Event"
   - System: Opens Event Builder with:
     * Package: Premium Wedding Package
     * Original Price: ₱50,000
     * Reservation Fee: -₱5,000
     * **Adjusted Total: ₱45,000**
   - Admin: Continues with event setup
   - System: Creates event with ₱45,000 as starting budget

5. **Payment Tracking**
   - Event shows ₱50,000 total budget
   - Payment history shows ₱5,000 already paid (from booking)
   - Remaining balance: ₱45,000

## Benefits

1. **Accurate Budget Tracking**
   - No manual calculation needed
   - Reservation fees automatically deducted
   - Clear payment history

2. **Better Client Experience**
   - Clients see their reservation fee credited
   - Transparent payment tracking
   - No confusion about amounts

3. **Admin Efficiency**
   - One-click event creation with accurate pricing
   - Automatic payment migration
   - Clear status indicators

## Important Notes

⚠️ **Payment Status Matters**
- Only payments with status `completed` or `paid` are counted
- `pending` payments are shown but not deducted
- `cancelled` payments are excluded from calculations

💡 **Best Practices**
- Always record reservation fees before confirming booking
- Use clear reference numbers for tracking
- Add notes to explain the payment context
- Verify reservation fee amount before creating event

🔒 **Security**
- Only Admin and Staff roles can record payments
- Payment history is immutable (audit trail)
- All transactions are logged

## Troubleshooting

### Issue: Reservation fee not showing in event builder
**Solution:**
- Verify payment status is "completed" or "paid"
- Check booking_id is correctly linked to payment
- Ensure booking status is "confirmed" before converting

### Issue: Wrong amount deducted
**Solution:**
- Review all payments linked to booking_id
- Check for duplicate payments
- Verify payment amounts in database

### Issue: Payment history not showing
**Solution:**
- Refresh the booking details
- Check API response for payment data
- Verify booking_id exists in tbl_payments

## Future Enhancements

- [ ] Partial refund support for cancelled bookings
- [ ] Automated email notifications for payment receipts
- [ ] Payment installment plans
- [ ] Integration with payment gateways for automatic verification
- [ ] Multiple payment method support per transaction
- [ ] Payment reminder system

## Related Files

### Frontend
- `/app/(authenticated)/admin/bookings/page.tsx` - Booking management
- `/app/(authenticated)/admin/event-builder/page.tsx` - Event creation
- `/app/components/admin/event-builder/payment-step.tsx` - Payment tracking

### Backend
- `/app/api/admin.php` - Admin operations
  - `createReservationPayment()` - Records payments
  - `getBookingByReference()` - Fetches booking with payments
  - `getBookingById()` - Fetches booking details
  - `getAllBookings()` - Lists all bookings with payment data

### Database
- `tbl_bookings` - Booking records
- `tbl_payments` - Payment transactions
- `tbl_events` - Event records

## Support

For questions or issues with the reservation fee system:
1. Check this documentation first
2. Review the troubleshooting section
3. Check browser console for error logs
4. Verify database records directly if needed
