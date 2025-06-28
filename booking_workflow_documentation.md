# Enhanced Booking System Workflow

## Overview

The booking system has been enhanced to provide a clear workflow from client booking to event creation, with proper status management and admin approval process.

## Booking Flow

### 1. Client Creates Booking

- **Location**: `/client/bookings/create-booking`
- **Process**:
  - Client fills out booking form with event details
  - System creates booking with status: `pending`
  - Client receives confirmation with booking reference
  - Notification: "Booking created successfully! Status: Pending Admin Approval"

### 2. Admin Reviews Bookings

- **Location**: `/admin/bookings`
- **Process**:
  - Admin sees all bookings with their current status
  - Pending bookings show **Accept** and **Reject** buttons
  - Admin can view booking details before deciding

#### Admin Actions:

- **Accept Booking**:

  - Status changes to `confirmed`
  - Client receives notification of acceptance
  - Booking becomes available for event creation

- **Reject Booking**:
  - Status changes to `cancelled`
  - Client receives notification of rejection
  - Booking is no longer available for event creation

### 3. Event Creation (Admin Only)

- **Location**: `/admin/event-builder`
- **Process**:
  - Only `confirmed` bookings appear in the "Enter Booking" section
  - `pending` bookings are NOT shown (they need approval first)
  - Admin can convert confirmed booking to event
  - Once converted, booking status changes to `converted`

## Booking Statuses

| Status      | Description                                     | Available Actions      |
| ----------- | ----------------------------------------------- | ---------------------- |
| `pending`   | Newly created booking awaiting admin review     | Accept, Reject, View   |
| `confirmed` | Admin-approved booking ready for event creation | Convert to Event, View |
| `converted` | Booking has been converted to an event          | View Event             |
| `cancelled` | Booking rejected or cancelled                   | View only              |
| `completed` | Event completed successfully                    | View only              |

## Database Changes

### New Columns Added to `tbl_bookings`:

- `start_time` - Event start time
- `end_time` - Event end time
- `booking_status` - Current booking status (ENUM)
- `updated_at` - Timestamp of last update

### New Database View:

- `vw_admin_bookings` - Optimized view for admin booking dashboard with client info and conversion status

### Indexes Added:

- `idx_booking_status` - For efficient status filtering
- `idx_booking_date` - For date-based queries
- `idx_booking_user` - For user-specific bookings

## Notification System

### Client Notifications:

- **Booking Created**: Confirmation with reference number
- **Booking Accepted**: Notification that booking is confirmed
- **Booking Rejected**: Notification with rejection reason

### Admin Notifications:

- **New Booking**: Alert when client creates new booking
- **Status Updates**: Confirmation of booking status changes

## API Endpoints Enhanced

### Admin API (`admin.php`):

- `getAllBookings` - Returns all bookings with proper status
- `getAvailableBookings` - Returns only confirmed, unconverted bookings
- `updateBookingStatus` - Updates booking status with notifications
- `getBookingByReference` - Enhanced with status validation

### Client API (`client.php`):

- `createBooking` - Enhanced with proper status setting
- `getClientBookings` - Returns client's bookings with status
- `getClientPaymentSchedule` - Enhanced for confirmed events

## Security & Validation

### Event Builder Validation:

- Only confirmed bookings can be converted to events
- Prevents duplicate conversions
- Validates booking ownership and status

### Status Transition Rules:

- `pending` → `confirmed` (Admin accepts)
- `pending` → `cancelled` (Admin rejects)
- `confirmed` → `converted` (Event created)
- No backwards transitions allowed

## Usage Instructions

### For Clients:

1. Create booking through the booking form
2. Wait for admin approval notification
3. Once approved, coordinate with admin for event details

### For Admins:

1. Review pending bookings in the bookings dashboard
2. Accept or reject bookings based on availability and requirements
3. Use confirmed bookings in the event builder
4. Convert confirmed bookings to full events

## File Changes Made

### Frontend:

- `app/(authenticated)/client/bookings/create-booking/page.tsx` - Enhanced booking creation
- `app/(authenticated)/admin/bookings/page.tsx` - Added accept/reject functionality
- `app/(authenticated)/admin/event-builder/page.tsx` - Enhanced booking validation

### Backend:

- `app/api/admin.php` - Enhanced booking management methods
- `app/api/client.php` - Enhanced booking creation with status

### Database:

- `booking_system_enhancements.sql` - Database schema updates
- Added proper indexes and constraints
- Created optimized view for admin dashboard

This enhanced workflow ensures proper approval process and prevents unauthorized event creation from unconfirmed bookings.
