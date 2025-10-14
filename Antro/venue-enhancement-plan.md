Based on my scan of the system, here's a solid description of how to enhance the venue part and implement proper calculation for packages with venue choices:

## Current System Analysis

The system currently has:

- **Venues** (`data/venues.ts`): Each venue has its own packages with fixed prices (e.g., Pearlmont Hotel packages range from P37,000-P120,000)
- **Packages** (`data/packages.ts`): Built from components with categories including "venue" (but these are generic like "Catering" mislabeled as venue)
- **Wedding Packages** (`data/wedding-packages.ts`): Have allocated budgets and hotel choices, but venues are separate entities

## Enhancement Plan: Venue Integration into Package Calculation

### 1. **Component-Based Venue Fee Structure**

- Create a dedicated "venue_fee" component category in `PackageComponent` interface
- This component represents the venue cost within each package
- Make it a required, non-removable component with variable pricing

### 2. **Venue Choices Within Packages**

For each package (e.g., P250,000.00 Gold Wedding Package), define multiple venue options:

```
Venue Choice 1: Premium Hotel Ballroom - P80,000
Venue Choice 2: Garden Resort Pavilion - P65,000
Venue Choice 3: Boutique Hotel Function Room - P55,000
```

### 3. **Price Range Management**

- **Package Base Price**: Sum of all component prices (P250,000)
- **Venue Allocation**: Reserve 30-40% of package price for venue fee (P75,000-P100,000 range)
- **Venue Selection Logic**:
  - If selected venue price ≤ allocated budget: Update venue_fee component price
  - If selected venue price > allocated budget:
    - Option A: Increase total package price proportionally
    - Option B: Make non-essential components optional/adjustable
    - Option C: Show price increase warning with client approval

### 4. **Calculation Flow**

```
Total Package Price = Base Components + Venue Fee + Other Components
Where:
- Base Components: Coordination, Catering, Decor, etc. (fixed prices)
- Venue Fee: Variable based on venue choice (within package range)
- Other Components: Photography, Entertainment, etc. (may be optional)
```

### 5. **Data Structure Updates**

- **PackageComponent Interface**: Add `venueOptions?: VenueChoice[]` where each choice has `venueId`, `price`, `description`
- **VenueChoice Interface**: `{ id: string, name: string, price: number, description: string, maxGuests: number }`
- **Package Updates**: Include venue choices array with prices that fit within package budget

### 6. **UI/UX Implementation**

- **Event Builder**: Show venue selection step with price impact preview
- **Dynamic Pricing**: Update total package price in real-time as venue is selected
- **Price Transparency**: Display "Venue Fee: P65,000 (within P250,000 package range)"

### 7. **Example Implementation**

For P250,000 package with venue choices:

- Venue 1 (P50,000): Total remains P250,000 (venue fee component = P50,000)
- Venue 2 (P45,000): Total remains P250,000 (venue fee component = P45,000)
- Venue 3 (P80,000): Total becomes P280,000 (venue fee = P80,000, +P30,000 adjustment)

This approach maintains component-based calculation while integrating venue choices as selectable options within packages, ensuring prices stay within specified ranges through smart allocation and optional adjustments.
