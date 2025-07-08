# Fixed Package Pricing System Logic

## Core Principles

1. **Package prices are LOCKED once created** - never decreasing
2. **Internal inclusions are for budgeting only** - not shown to clients
3. **Buffers and overages are calculated automatically**
4. **Warnings prevent accidental budget overruns**

## System Behavior Examples

### Example 1: Initial Setup
```
Package Creation:
- Admin sets package price: ₱250,000
- Admin adds inclusions:
  * Food: ₱120,000
  * Venue: ₱80,000
  * Decorations: ₱30,000
- Total inclusions: ₱230,000
- Buffer: ₱20,000 (8% margin)
- Status: ✅ VALID - Package saved and price LOCKED
```

### Example 2: Admin Removes Inclusion
```
Admin Action: Remove ₱30,000 decoration
- Package price: ₱250,000 (UNCHANGED - locked)
- New inclusions total: ₱200,000
- New buffer: ₱50,000 (20% margin)
- Status: ✅ VALID - More buffer available
- Client sees: Still ₱250,000 package price
```

### Example 3: Admin Adds Expensive Item
```
Admin Action: Add ₱40,000 photography
- Package price: ₱250,000 (UNCHANGED - locked)
- New inclusions total: ₱270,000
- Overage: ₱20,000 (8% over budget)
- Status: ⚠️ WARNING - "Budget overage detected"
- System: Shows red alert, requires confirmation
- Options:
  1. Remove/reduce inclusions
  2. Increase package price to ₱270,000+
  3. Accept overage (coordinator absorbs cost)
```

### Example 4: Attempted Price Reduction
```
Admin Action: Try to change price from ₱250,000 to ₱200,000
- System Response: ❌ ERROR
- Message: "Cannot reduce package price. Locked prices can only increase."
- UI: Price input reverts to ₱250,000
- Database: No change recorded
```

### Example 5: Price Increase Allowed
```
Admin Action: Change price from ₱250,000 to ₱280,000
- System Response: ✅ ALLOWED
- Database: Updates package_price to ₱280,000
- Audit Log: Records price increase
- New buffer: ₱280,000 - ₱270,000 = ₱10,000
- Status: Buffer restored
```

## Technical Implementation

### Database Logic
```sql
-- Price lock trigger prevents reduction
CREATE TRIGGER prevent_package_price_reduction
BEFORE UPDATE ON tbl_packages
FOR EACH ROW
BEGIN
    IF OLD.is_price_locked = 1 AND NEW.package_price < OLD.package_price THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot reduce package price once locked';
    END IF;
END;

-- Auto-calculate budget status
SELECT
    package_price,
    (SELECT SUM(component_price) FROM tbl_package_components WHERE package_id = p.package_id) as inclusions_total,
    (package_price - (SELECT SUM(component_price) FROM tbl_package_components WHERE package_id = p.package_id)) as difference,
    CASE
        WHEN (package_price - (SELECT SUM(component_price) FROM tbl_package_components WHERE package_id = p.package_id)) > 0 THEN 'BUFFER'
        WHEN (package_price - (SELECT SUM(component_price) FROM tbl_package_components WHERE package_id = p.package_id)) < 0 THEN 'OVERAGE'
        ELSE 'EXACT'
    END as budget_status
FROM tbl_packages p;
```

### Frontend Validation Logic
```typescript
// Price change validation
const handlePackagePriceChange = (newPrice: number) => {
    if (isPackageLocked && newPrice < originalPrice) {
        showError("Cannot reduce package price once locked");
        return false;
    }
    return true;
};

// Budget validation
const validateBudget = (packagePrice: number, inclusions: Inclusion[]) => {
    const totalCost = inclusions.reduce((sum, inc) => sum + inc.price, 0);
    const difference = packagePrice - totalCost;

    if (difference < 0) {
        return {
            status: 'OVERAGE',
            amount: Math.abs(difference),
            message: `Budget overage: ₱${Math.abs(difference).toLocaleString()}`,
            requiresConfirmation: true
        };
    }

    return {
        status: difference > 0 ? 'BUFFER' : 'EXACT',
        amount: difference,
        message: difference > 0 ? `Buffer available: ₱${difference.toLocaleString()}` : 'Exact budget match'
    };
};
```

### API Response Patterns
```json
// Successful budget validation
{
    "status": "success",
    "budget_breakdown": {
        "package_price": 250000,
        "inclusions_total": 230000,
        "difference": 20000,
        "budget_status": "BUFFER",
        "buffer_amount": 20000,
        "margin_percentage": 8.0
    }
}

// Overage warning
{
    "status": "warning",
    "message": "Budget overage detected",
    "package_price": 250000,
    "inclusions_total": 270000,
    "overage_amount": 20000,
    "requires_confirmation": true
}

// Price reduction attempt
{
    "status": "error",
    "message": "Cannot reduce package price once locked",
    "current_price": 250000,
    "attempted_price": 200000
}
```

## Business Rules

### Rule 1: Price Lock Enforcement
- ✅ Package price locks immediately upon creation
- ✅ Price can only increase or stay the same
- ❌ No price reductions allowed ever
- ✅ Price history tracked for audit

### Rule 2: Budget Management
- ✅ Inclusions total can be less than package price (buffer)
- ⚠️ Inclusions total can exceed package price (overage warning)
- ✅ Coordinator absorbs overages unless price increased
- ✅ Buffers become coordinator margin/profit

### Rule 3: Client-Facing Behavior
- ✅ Clients only see final package price
- ❌ Clients never see inclusion costs breakdown
- ✅ Package price is what client pays
- ✅ Internal costs are for coordinator budgeting only

### Rule 4: Admin Interface
- ✅ Clear indicators when price is locked
- ✅ Budget status (buffer/overage) always visible
- ⚠️ Warnings before accepting overages
- ✅ Margin percentage calculations shown

## Edge Cases Handled

1. **Zero Inclusions**: Package price becomes 100% margin
2. **Exact Match**: Inclusions = package price (0% margin)
3. **Multiple Overages**: Cumulative overage calculations
4. **Price History**: Track all increases for audit
5. **Component Removal**: Automatic buffer recalculation
6. **Bulk Updates**: Validation before batch saves

## Error Prevention

1. **UI Validation**: Prevents invalid price entries
2. **Database Triggers**: Server-side enforcement
3. **API Validation**: Double-check all operations
4. **Confirmation Dialogs**: User acknowledgment for risky actions
5. **Audit Trail**: Complete history of all changes

This system ensures package prices remain profitable while giving coordinators flexibility in managing internal costs and maintaining transparent, locked pricing for clients.
