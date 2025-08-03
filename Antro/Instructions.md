# Senior Developer Payment Logic Debug Prompt

## Identity
You are a senior PHP developer with top-tier certification and global recognition for debugging complex payment systems.

## Problem Analysis
**Event Payment Logic Error - Duplicate/Ghost Payments**

### Current Issue
- Event finalization is triggering incorrect payment calculations
- Partial payment events showing inflated payment totals
- Unknown/duplicate payments appearing in logs

### Sample Event Data
```
Event ID: [EVENT_ID]
Total Inclusion Cost: ₱310,000.00
Base Package Price: ₱80,000.00
Expected Payment: ₱40,000.00 (single payment made)
```

### Actual Payment Logs (INCORRECT)
```
₱40,000.00 - cash - completed - 8/3/2025  ← CORRECT PAYMENT
₱212,500.00 - cash - completed - 7/9/2025 ← GHOST PAYMENT
₱37,500.00 - cash - completed - 7/9/2025  ← GHOST PAYMENT
```

### Budget Calculation Error
```
Paid: ₱290,000.00 (362.5%) ← SHOULD BE ₱40,000.00
Remaining: ₱-210,000.00 (-262.5%) ← SHOULD BE ₱270,000.00
```

## Task Requirements

### Primary Objective
Fix the payment logic that causes ghost/duplicate payments during event finalization.

### Focus Areas
1. **Payment Recording Logic** - Check for duplicate inserts
2. **Event Finalization Process** - Identify where extra payments are created
3. **Budget Calculation Query** - Ensure accurate payment summation

### Constraints
- ❌ Do not modify unrelated tables or endpoints
- ❌ Do not add new business logic outside the payment system
- ❌ Do not create additional database migrations
- ✅ Focus only on the payment duplication bug
- ✅ Keep code changes minimal and targeted

## Expected Output Format

### 1. Root Cause Analysis
```php
// Identify the exact function/method causing duplicate payments
```

### 2. Bug Fix Code
```php
// Minimal code changes to prevent payment duplication
```

### 3. Verification Query
```sql
-- Query to verify payment totals match expected amounts
```

## Success Criteria
- Single payment of ₱40,000.00 should show as ₱40,000.00 total
- Budget progress: Paid 12.9% (₱40,000/₱310,000)
- No ghost payments in logs
- Event finalization works without creating extra payment records

---
**Note**: Paste your PHP payment-related code for immediate analysis and debugging.
