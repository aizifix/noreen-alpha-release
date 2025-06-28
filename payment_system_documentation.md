# Enhanced Payment System Documentation

## Overview

This enhanced payment system provides comprehensive payment tracking and scheduling capabilities for your event management system. It supports multiple payment schedules including full payment, installment plans, and custom schedules.

## Key Features

### 1. **Payment Schedule Types**

- **Full Payment**: Single payment of the entire amount
- **50-50 Payment**: 50% upfront, 50% before the event
- **Monthly Installments**: Spread payments over multiple months
- **Quarterly Installments**: Quarterly payment schedule
- **Custom Schedule**: Flexible custom payment arrangements

### 2. **Payment Tracking**

- Real-time payment status updates
- Automatic calculation of remaining balance
- Overdue payment detection
- Payment progress tracking
- Comprehensive payment logs

### 3. **Client & Admin Views**

- Clients can view their payment schedule and status
- Admins can monitor all payment activities
- Detailed payment history and logs
- Payment urgency indicators (overdue, due today, current)

## Database Schema Changes

### New Tables Added:

#### `tbl_payment_schedule_types`

Defines different payment schedule options available in the system.

```sql
- schedule_type_id: Primary key
- schedule_name: Name of the schedule (e.g., "50-50 Payment")
- schedule_description: Detailed description
- installment_count: Number of installments
- is_active: Whether this schedule type is active
```

#### `tbl_event_payment_schedules`

Stores the payment schedule for each event, broken down by installments.

```sql
- schedule_id: Primary key
- event_id: Reference to the event
- schedule_type_id: Type of payment schedule
- installment_number: Which installment (1st, 2nd, etc.)
- due_date: When this installment is due
- amount_due: Amount required for this installment
- amount_paid: Amount actually paid for this installment
- payment_status: Status (pending, partial, paid, overdue)
```

#### `tbl_payment_logs`

Comprehensive logging of all payment-related activities.

```sql
- log_id: Primary key
- event_id: Reference to the event
- schedule_id: Reference to the payment schedule (if applicable)
- payment_id: Reference to the actual payment
- client_id: Client who made the payment
- admin_id: Admin who processed/confirmed the payment
- action_type: Type of action (payment_received, payment_confirmed, etc.)
- amount: Payment amount
- reference_number: Payment reference number
- notes: Additional notes
```

### Modified Tables:

#### `tbl_events`

- Added `payment_schedule_type_id` to link events to their payment schedule type

#### `tbl_payments`

- Added `schedule_id` to link payments to specific installments

## How It Works

### 1. **Event Creation with Payment Schedule**

When an event is created, you can set up a payment schedule:

```sql
-- Example: Create a 50-50 payment schedule for an event
CALL sp_create_payment_schedule(10, 2, NULL, 7);
-- Parameters: event_id, schedule_type_id, installment_dates_json, admin_id
```

### 2. **Payment Processing Flow**

1. **Client makes payment** with reference number
2. **Payment record created** in `tbl_payments` table
3. **Triggers automatically update**:
   - Payment schedule status in `tbl_event_payment_schedules`
   - Overall event payment status in `tbl_events`
   - Payment log entry in `tbl_payment_logs`

### 3. **Payment Status Calculation**

The system automatically calculates:

- **Total Paid**: Sum of all completed payments
- **Remaining Balance**: `total_budget - total_paid`
- **Progress Percentage**: `(total_paid / total_budget) * 100`
- **Payment Status**: Based on amount paid vs. total budget

## Usage Examples

### Creating Payment Schedules

```sql
-- Full Payment Schedule
CALL sp_create_payment_schedule(event_id, 1, NULL, admin_id);

-- 50-50 Payment Schedule
CALL sp_create_payment_schedule(event_id, 2, NULL, admin_id);

-- Custom Schedule (would need enhanced procedure for JSON parsing)
CALL sp_create_payment_schedule(event_id, 5, '[{"date":"2025-07-01","amount":50000}, {"date":"2025-08-01","amount":50000}]', admin_id);
```

### Recording Payments

```sql
-- Record a payment for a specific installment
INSERT INTO tbl_payments (
    event_id,
    schedule_id,
    client_id,
    payment_method,
    payment_amount,
    payment_date,
    payment_reference,
    payment_status
) VALUES (
    10,           -- event_id
    1,            -- schedule_id (first installment)
    15,           -- client_id
    'gcash',      -- payment_method
    25000.00,     -- payment_amount
    '2025-06-25', -- payment_date
    'GC123456',   -- payment_reference
    'completed'   -- payment_status
);
```

### Querying Payment Information

```sql
-- Get payment summary for a client
SELECT * FROM view_client_payment_summary
WHERE client_id = 15;

-- Get detailed payment information for an event
SELECT * FROM view_event_payments
WHERE event_id = 10;

-- Get overdue payments
SELECT * FROM view_event_payments
WHERE payment_urgency = 'overdue';

-- Get payment logs for an event
SELECT * FROM tbl_payment_logs
WHERE event_id = 10
ORDER BY created_at DESC;
```

## API Integration Points

For your frontend application, you'll want to create API endpoints for:

### Client Endpoints:

- `GET /api/client/payments/{client_id}` - Get payment summary
- `GET /api/client/payment-schedule/{event_id}` - Get payment schedule
- `POST /api/client/payment` - Submit payment with reference number
- `GET /api/client/payment-history/{event_id}` - Get payment history

### Admin Endpoints:

- `GET /api/admin/payments` - Get all payment activities
- `PUT /api/admin/payment/{payment_id}/confirm` - Confirm payment
- `PUT /api/admin/payment/{payment_id}/reject` - Reject payment
- `POST /api/admin/payment-schedule` - Create payment schedule
- `GET /api/admin/overdue-payments` - Get overdue payments
- `GET /api/admin/payment-logs/{event_id}` - Get payment logs

## Payment Status Flow

```
Event Created → Payment Schedule Set Up → Client Makes Payment →
Admin Confirms Payment → Payment Status Updated → Logs Created
```

### Payment Statuses:

- **pending**: No payment received
- **partial**: Some payment received, but not full amount
- **paid**: Full payment completed
- **overdue**: Payment past due date
- **cancelled**: Payment cancelled

## Benefits of This System

1. **Automated Tracking**: Reduces manual work with automatic status updates
2. **Flexible Scheduling**: Supports various payment arrangements
3. **Transparency**: Both clients and admins have clear visibility
4. **Audit Trail**: Complete log of all payment activities
5. **Overdue Management**: Automatic detection of overdue payments
6. **Progress Monitoring**: Real-time payment progress tracking

## Next Steps

1. **Run the SQL script** (`payment_enhancements.sql`) on your database
2. **Update your API** to use the new tables and views
3. **Modify your frontend** to display payment schedules and status
4. **Test the system** with sample data
5. **Add payment reminder functionality** (emails/notifications for due payments)

This enhanced system provides a robust foundation for managing complex payment scenarios while maintaining simplicity for basic use cases.
