# Booking Status Flow & Reservation Fee Fix

## Problem Summary
The reservation fee wasn't being properly attached to bookings in the payment summary, and the booking status flow wasn't following the correct progression: **pending → reserved → confirmed → converted**.

## Root Causes

1. **Backend Validation Issue**: The `createReservationPayment` API only allowed payments on "pending" bookings, preventing additional payments on "reserved" bookings.

2. **Frontend State Update Issue**: After creating a payment, the `selectedBooking` state wasn't being updated with the new payment data, causing the payment history to not display immediately.

3. **Missing "Reserved" Status**: The UI didn't properly handle or display the "reserved" status in filters, statistics, and status badges.

4. **Status Flow Logic**: The booking status wasn't automatically transitioning from "pending" to "reserved" after the first payment.

## Changes Made

### Backend Changes

#### 1. `event-planning-system/app/api/admin.php`

**Updated `createReservationPayment` function:**

```php
// OLD: Only accepted 'pending' status
if ($booking['booking_status'] !== 'pending') {
    return ["status" => "error", "message" => "Booking is not in pending status"];
}

// NEW: Accepts both 'pending' and 'reserved' status
if (!in_array($booking['booking_status'], ['pending', 'reserved'])) {
    return ["status" => "error", "message" => "Booking must be in 'pending' or 'reserved' status to accept payments"];
}
```

**Updated status transition logic:**

```php
// OLD: Always updated to 'reserved'
$updateBookingSql = "UPDATE tbl_bookings SET booking_status = 'reserved' WHERE booking_id = ?";
$updateStmt = $pdo->prepare($updateBookingSql);
$updateStmt->execute([$bookingId]);

// NEW: Only updates to 'reserved' if currently 'pending'
if ($booking['booking_status'] === 'pending') {
    $updateBookingSql = "UPDATE tbl_bookings SET booking_status = 'reserved' WHERE booking_id = ?";
    $updateStmt = $pdo->prepare($updateBookingSql);
    $updateStmt->execute([$bookingId]);
}
```

**Updated response to include correct booking status:**

```php
$newStatus = ($booking['booking_status'] === 'pending') ? 'reserved' : $booking['booking_status'];

return [
    "status" => "success",
    "payment_id" => $paymentId,
    "message" => "Reservation payment created successfully",
    "booking_status" => $newStatus
];
```

#### 2. `event-planning-system/app/api/staff.php`

Applied the same changes as in `admin.php` to maintain consistency across both API endpoints.

### Frontend Changes

#### 1. `event-planning-system/app/(authenticated)/admin/bookings/page.tsx`

**Updated Booking Interface:**
```typescript
booking_status:
  | "pending"
  | "reserved"      // ← Added
  | "confirmed"
  | "converted"
  | "cancelled"
  | "completed";
```

**Enhanced `handleCreatePayment` function:**
- Added logic to fetch updated booking data after payment creation
- Updates `selectedBooking` state with new payment information
- Updates `bookingDetails` to refresh the modal
- Shows dynamic success message based on status change

```typescript
// Fetch updated booking details to refresh the modal
try {
  const updatedBookingResponse = await axios.get("/admin.php", {
    params: {
      operation: "getBookingById",
      booking_id: selectedBooking.booking_id,
    },
  });

  if (updatedBookingResponse.data.status === "success") {
    const updatedBooking = updatedBookingResponse.data.booking;

    // Merge updated booking data with existing booking
    const mergedBooking = {
      ...selectedBooking,
      booking_status: updatedBooking.booking_status || "reserved",
      payments: updatedBooking.payments || [],
      total_price: updatedBooking.total_price || selectedBooking.total_price,
    };

    setSelectedBooking(mergedBooking as Booking);
    setBookingDetails(updatedBooking);
  }
} catch (error) {
  console.error("Error fetching updated booking:", error);
}
```

**Added "Reserved" Status Support:**

- **Status Colors:**
  ```typescript
  case "reserved":
    return "bg-orange-100 text-orange-800 border-orange-200";
  ```

- **Status Icons:**
  ```typescript
  case "reserved":
    return <Wallet className="h-4 w-4" />;
  ```

- **Status Filter Dropdown:**
  Added "Reserved" option in the filter dropdown

- **Statistics Dashboard:**
  Updated from 4 columns to 5 columns to include "Reserved" bookings count

**Dynamic Success Messages:**
```typescript
const statusMessage =
  selectedBooking.booking_status === "pending"
    ? "Payment recorded successfully. Booking status updated to 'reserved'."
    : "Payment recorded successfully.";
```

## Booking Status Flow

The complete booking lifecycle now works as follows:

1. **Pending** → Client creates a booking
2. **Reserved** → Client or admin makes a reservation fee payment
3. **Confirmed** → Admin accepts the booking (manual action)
4. **Converted** → Admin creates an event from the confirmed booking (final status)

Additional statuses:
- **Cancelled** → Booking is rejected or cancelled
- **Completed** → Event is completed (optional)

## Key Features

### 1. Multiple Payments on Reserved Bookings
- Clients can now make additional payments on "reserved" bookings
- Each payment is properly tracked and displayed in the payment history

### 2. Real-time UI Updates
- Payment history refreshes immediately after recording a payment
- Booking status badge updates automatically
- No need to refresh the page or reopen the modal

### 3. Proper Payment Tracking
- All payments are correctly associated with the booking
- Reservation fees are clearly labeled and tracked
- Payment summary shows accurate totals including all payments

### 4. Status-based Actions
- "Pending" bookings: Show "Make Payment" button
- "Reserved" bookings: Show "Make Payment" and "Accept" buttons
- "Confirmed" bookings: Show "Create an Event" button
- "Converted" bookings: Show "View Event" button

## Testing Checklist

- [x] Booking status changes from "pending" to "reserved" after first payment
- [x] Additional payments can be made on "reserved" bookings
- [x] Payment history displays all payments immediately after creation
- [x] Status badge updates correctly in the UI
- [x] Statistics dashboard shows correct count for "reserved" bookings
- [x] Filter dropdown includes "reserved" option
- [x] "Accept" button works on both "pending" and "reserved" bookings
- [x] Reservation fees are properly tracked and displayed
- [x] Payment summary shows accurate totals

## Notes

- The backend `getAllBookings` API already includes payment information for each booking, so no changes were needed there
- The `getBookingById` API properly returns the `payments` array with all payment details
- The frontend now properly consumes this payment data and displays it in the payment history tab
