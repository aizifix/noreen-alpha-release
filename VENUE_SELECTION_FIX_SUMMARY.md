# Venue Selection and Budget Calculation Fix

## Problem Summary

The venue selection system had several critical issues:

1. **Duplication**: Venues/hotels appeared both in the "Venue Selection" section and as inclusions in "Package Inclusions"
2. **Incorrect Pricing**: Venue costs were not being calculated based on guest capacity and buffer
3. **Budget Miscalculation**: When venues were changed, the event budget wasn't properly updated
4. **Missing Payment Context**: Changes didn't account for amounts already paid by clients

## Solution Implemented

### 1. Frontend Improvements (`page.tsx`)

#### Enhanced Venue Component Filtering
- Created `isVenueComponent()` helper function that identifies venue-related components by checking for:
  - "venue:"
  - "hotel"
  - "reception hall"
  - "ballroom"
  - "venue -"

- Applied this filter to Package Inclusions to prevent venues from appearing in the inclusions list
- Ensures venues are managed exclusively through the Venue Selection section

#### Improved Venue Change Handling
- Updated `handleVenueChange()` to:
  - Calculate venue cost based on guest capacity before sending to backend
  - Pass guest count and venue cost to the API
  - Display detailed budget change information including:
    - Old and new budget amounts
    - Amount already paid
    - New remaining balance
    - Whether budget increased or decreased

### 2. Backend Improvements (`admin.php`)

#### Enhanced `updateEventVenue()` Function
Now performs comprehensive venue and budget management:

**Step 1: Validation**
- Verifies venue is available for the event's package
- Gets current event data (budget, guest count)

**Step 2: Old Venue Cost Calculation**
- Queries for any existing venue-related components
- Sums up their costs to get old venue cost
- Uses same filtering logic as frontend (hotel, venue:, reception hall, etc.)

**Step 3: Budget Recalculation**
```
New Budget = Current Budget - Old Venue Cost + New Venue Cost
```

**Step 4: Database Updates (Transaction)**
- Updates event table with:
  - New venue_id
  - Updated guest_count
  - Recalculated total_budget
- Deletes old venue components from event_components table

**Step 5: Payment Context**
- Retrieves total amount already paid
- Calculates old and new remaining balances
- Returns comprehensive response with all financial details

**Step 6: Endpoint Update**
- Modified to accept and pass through:
  - `guest_count`: Number of guests for capacity calculation
  - `venue_cost`: Pre-calculated venue cost from frontend

## How Venue Pricing Works

### Calculation Formula
```
Base Cost = venue_price_per_pax × guest_count

If guest_count > base_capacity:
    Excess Charges = (guest_count - base_capacity) × extra_pax_rate
    Total Cost = Base Cost + Excess Charges
Else:
    Total Cost = Base Cost
```

### Example
- Marco Hotel: ₱350 per pax, Base Capacity: 100, Excess: ₱350
- Guest Count: 150

```
Base Cost = 350 × 150 = ₱52,500
Excess = (150 - 100) × 350 = ₱17,500
Total Venue Cost = ₱70,000
```

## Event Budget Composition

The event's `total_budget` now consists of:
1. **Package Inclusions Cost** (excluding venues)
   - Catering
   - Photography
   - Decorations
   - Entertainment
   - Other services

2. **Venue Cost** (managed separately)
   - Based on selected venue
   - Calculated from guest capacity
   - NOT stored as a component

3. **Custom Additions**
   - Any custom inclusions added by admin
   - Manual adjustments

## Testing Scenarios

### Test 1: Initial Venue Selection
**Setup:**
- Create new event with package
- Package has multiple venues available

**Steps:**
1. Navigate to event details page
2. View "Venue Selection" section
3. Note current venue and capacity
4. Check "Package Inclusions" - verify no hotel/venue listed

**Expected:**
- Venues shown only in Venue Selection
- No venue-related items in Package Inclusions
- Total budget reflects venue cost

### Test 2: Changing Venue (Higher Cost)
**Setup:**
- Event with Marco Hotel (₱350/pax)
- Guest count: 100
- Current venue cost: ₱35,000

**Steps:**
1. Click "Change Venue"
2. Select more expensive venue (e.g., Ultrawinds at ₱450/pax)
3. Keep same guest count (100)
4. Click "Select"

**Expected:**
- Success message shows:
  - Old budget
  - New budget (increased by ₱10,000)
  - Total venue cost: ₱45,000
- Event budget updated correctly
- If payments exist, shows remaining balance

### Test 3: Changing Venue with Guest Count Update
**Setup:**
- Event with current venue
- Change both venue and capacity

**Steps:**
1. Click "Change Venue"
2. Update "Capacity" input (e.g., 150)
3. Note the "Total:" calculation updates
4. Select different venue
5. Confirm change

**Expected:**
- Venue cost calculated with new capacity
- Excess charges applied if over base capacity
- Event guest_count updated in database
- Budget reflects new venue cost

### Test 4: Venue Change with Existing Payments
**Setup:**
- Event with ₱100,000 budget
- Client paid ₱30,000
- Current remaining: ₱70,000

**Steps:**
1. Change venue (increases cost by ₱20,000)
2. View success message

**Expected:**
- Shows old budget: ₱100,000
- Shows new budget: ₱120,000
- Shows amount paid: ₱30,000
- Shows new remaining: ₱90,000
- Budget increase message: "Budget increased from ₱100,000 to ₱120,000"

### Test 5: Package Inclusions Edit (No Venue Interference)
**Setup:**
- Event with venue selected

**Steps:**
1. Go to "Package Inclusions" section
2. Click "Edit Package"
3. Verify no hotel/venue appears in list
4. Add/edit other inclusions
5. Save changes

**Expected:**
- Venue NOT listed in inclusions
- Can edit catering, photography, etc.
- Saving recalculates budget without affecting venue cost
- Venue remains in Venue Selection section

### Test 6: Budget Breakdown Verification
**Setup:**
- Event with venue and inclusions

**Steps:**
1. Note venue cost from Venue Selection
2. Note total inclusions from Package Inclusions
3. Check total_budget in database or Budget Progress

**Expected:**
```
Total Budget = Venue Cost + Sum(Inclusion Costs) + Organizer Fee
```

### Test 7: Custom Venue Addition
**Setup:**
- Event with package

**Steps:**
1. In Venue Selection, click "Change Venue"
2. Click "Add Custom Venue"
3. Enter venue name and price
4. Save

**Expected:**
- Custom venue added
- NOT appearing in Package Inclusions
- Budget updated with custom venue price

## Database Schema References

### Key Tables
1. **tbl_events**
   - `venue_id`: Selected venue
   - `guest_count`: Number of guests
   - `total_budget`: Total event cost

2. **tbl_event_components**
   - Stores inclusions (catering, photography, etc.)
   - Venue components are NOW DELETED when venue changes
   - Filtered out from Package Inclusions display

3. **tbl_venue**
   - `venue_price`: Per pax base price
   - `venue_capacity`: Base capacity
   - `extra_pax_rate`: Charge per excess guest

4. **tbl_payments**
   - `payment_amount`: Amount paid
   - `payment_status`: 'completed' for successful payments
   - Used to calculate remaining balance

## API Endpoints

### `updateEventVenue`
**Request:**
```json
{
  "operation": "updateEventVenue",
  "event_id": 123,
  "venue_id": 5,
  "guest_count": 150,
  "venue_cost": 70000
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Event venue updated successfully",
  "venue": { /* venue details */ },
  "old_venue_cost": 35000,
  "new_venue_cost": 70000,
  "old_budget": 200000,
  "new_budget": 235000,
  "guest_count": 150,
  "total_paid": 50000,
  "old_remaining_balance": 150000,
  "new_remaining_balance": 185000,
  "budget_change": 35000
}
```

## Benefits of This Implementation

1. **No Duplication**: Venues only appear in Venue Selection
2. **Accurate Pricing**: Venue costs calculated from capacity + excess charges
3. **Transparent Budgeting**: Clear separation of venue costs vs inclusions
4. **Payment Awareness**: Shows impact on remaining balance when budget changes
5. **Data Integrity**: Removes old venue components, prevents orphaned data
6. **Transaction Safety**: Uses database transactions for atomic updates
7. **User Feedback**: Detailed success messages with financial breakdown

## Troubleshooting

### Issue: Venue still appears in Package Inclusions
**Solution:** Check component_name in database. If it contains "hotel", "venue:", etc., the filter should catch it. May need to manually clean up old data.

### Issue: Budget not updating correctly
**Solution:**
1. Check that venue_cost is being calculated correctly in frontend
2. Verify updateEventVenue is receiving guest_count and venue_cost
3. Check for transaction rollback in server logs

### Issue: Guest count not updating
**Solution:** Ensure `guest_count` parameter is being sent in the API request from frontend handleVenueChange function.

### Issue: Old venue components not deleted
**Solution:** Check the DELETE query in updateEventVenue - it should match all venue-related patterns.

## Files Modified

1. **Frontend**: `event-planning-system/app/(authenticated)/admin/events/[id]/page.tsx`
   - Lines: 1781-1792 (isVenueComponent helper)
   - Lines: 1243-1294 (handleVenueChange)
   - Lines: 1795-1830 (component filtering)

2. **Backend**: `event-planning-system/app/api/admin.php`
   - Lines: 10276-10393 (updateEventVenue function)
   - Lines: 13902-13908 (endpoint handler)

## Future Enhancements

1. **Venue Price History**: Track venue cost changes over time
2. **Capacity Warnings**: Alert when guest count approaches venue capacity
3. **Multi-Venue Events**: Support for events using multiple venues
4. **Venue Availability Calendar**: Check date conflicts
5. **Automated Budget Adjustment**: Notify client of budget changes via email

---

**Implementation Date**: October 25, 2025
**Version**: 1.0
**Status**: ✅ Complete and Tested
