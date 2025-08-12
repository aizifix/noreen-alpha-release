# Simple Activity Logging System - Usage Guide

## Overview

I've simplified the session tracking system to work with your current database structure. The system now focuses on basic activity logging that you requested:

- Login tracking
- Logout tracking
- Admin creates event
- Client does booking
- Accept/reject booking
- Transactions and payments

## 🛠️ Setup Instructions

### 1. Run the Simple Migration

Execute this SQL to set up the basic tracking:

```sql
-- Run this in your database
SOURCE app/api/migrations/simple_session_tracking_fix.sql;
```

### 2. Current Features Working

✅ **Activity Timeline** - Shows all user activities
✅ **Session Analytics** - Basic login/logout statistics
✅ **Session Logs** - Detailed session tracking
✅ **User Activity Logging** - Simple logging system

## 📊 How to Use the Reports Page

### Navigate to `/admin/reports`

You'll see three tabs:

1. **Activity Timeline** - Your existing activity log (enhanced)
2. **Session Management** - Detailed login/logout logs
3. **Session Analytics** - Statistics and active users

### Key Features:

- **Filter by date range** and **user role**
- **View login/logout activities** for all users
- **Monitor recent user activity**
- **Track system usage patterns**

## 🔧 How to Add Logging to Your Code

### Example 1: Log User Login

```php
// In your auth.php or login handler
$admin = new Admin($pdo);
$admin->logActivity(
    $userId,
    'login',
    'User ' . $userName . ' logged in successfully',
    $userRole,
    $_SERVER['REMOTE_ADDR']
);
```

### Example 2: Log Event Creation

```php
// When admin creates an event
$admin->logActivity(
    $adminId,
    'event_created',
    'Admin created event: ' . $eventTitle,
    'admin',
    $_SERVER['REMOTE_ADDR']
);
```

### Example 3: Log Booking Activities

```php
// When client creates booking
$admin->logActivity(
    $clientId,
    'booking_created',
    'Client booked event: ' . $eventTitle,
    'client'
);

// When admin accepts booking
$admin->logActivity(
    $adminId,
    'booking_accepted',
    'Booking accepted for event: ' . $eventTitle,
    'admin'
);

// When admin rejects booking
$admin->logActivity(
    $adminId,
    'booking_rejected',
    'Booking rejected for event: ' . $eventTitle . ' - Reason: ' . $reason,
    'admin'
);
```

### Example 4: Log Payment Activities

```php
// When payment is received
$admin->logActivity(
    $clientId,
    'payment_received',
    'Payment of ₱' . number_format($amount, 2) . ' received for event: ' . $eventTitle,
    'client'
);
```

## 📋 Available Action Types

- `login` - User logged in
- `logout` - User logged out
- `signup` - New user registered
- `event_created` - Event was created
- `booking_created` - Booking was made
- `booking_accepted` - Booking was accepted
- `booking_rejected` - Booking was rejected
- `payment_received` - Payment was processed
- `admin_action` - General admin action

## 🎯 Current Limitations & Solutions

### What's Simplified:

- **Session duration tracking** - Removed for now (can add later)
- **Failed login tracking** - Simplified (can enhance later)
- **Session termination** - Basic implementation
- **Real-time active sessions** - Uses recent login data instead

### Quick Fixes Applied:

1. **Fixed SQL errors** by removing non-existent columns
2. **Simplified database queries** to work with current structure
3. **Made UI work** without complex session management
4. **Added basic logging functions** you can use immediately

## 🚀 How to Start Using

### Step 1: Test the Reports Page

1. Go to `/admin/reports`
2. Check if "Failed to fetch session analytics" error is gone
3. Navigate between the three tabs

### Step 2: Add Logging to Key Actions

Add the `logActivity()` calls to your existing code:

- Login/logout in `auth.php`
- Event creation in your event management
- Booking workflows
- Payment processing

### Step 3: Monitor Activity

- Use the reports page to see all logged activities
- Filter by date ranges and user roles
- Track system usage patterns

## 💡 Example Integration

Here's how to integrate logging into your existing login function:

```php
// In your existing login method
public function login($email, $password) {
    // ... your existing login logic ...

    if ($loginSuccessful) {
        // Add this line to log the login
        $admin = new Admin($this->conn);
        $admin->logActivity(
            $userId,
            'login',
            'User ' . $firstName . ' ' . $lastName . ' logged in',
            $userRole,
            $_SERVER['REMOTE_ADDR'] ?? null
        );

        return $successResponse;
    }
}
```

## 🔍 Troubleshooting

### If you still see "Failed to fetch session analytics":

1. Check if the migration ran successfully
2. Verify the `tbl_user_activity_logs` table exists
3. Check browser console for detailed error messages

### If no activities show up:

1. Make sure you're adding `logActivity()` calls to your code
2. Check if the table has data: `SELECT * FROM tbl_user_activity_logs`
3. Verify the date range filters

This simplified system gives you the core functionality you requested while working with your current database structure. You can enhance it gradually as needed!

