-- ========================================
-- Create Sample Package with Proper Normalized Structure
-- ========================================
-- This script creates a complete sample package to demonstrate
-- the new normalized database structure.
-- ========================================

-- Clean up any existing sample package first
DELETE FROM tbl_inclusion_components WHERE inclusion_id IN (
    SELECT inclusion_id FROM tbl_package_inclusions WHERE package_id = 999
);
DELETE FROM tbl_package_inclusions WHERE package_id = 999;
DELETE FROM tbl_package_freebies WHERE package_id = 999;
DELETE FROM tbl_package_venues WHERE package_id = 999;
DELETE FROM tbl_package_event_types WHERE package_id = 999;
DELETE FROM tbl_packages WHERE package_id = 999;

-- ========================================
-- Step 1: Create the Package
-- ========================================
INSERT INTO tbl_packages (
    package_id,
    package_title,
    package_description,
    package_price,
    guest_capacity,
    is_active,
    created_at,
    venue_fee_buffer
) VALUES (
    999,
    'Sample Dream Wedding Package',
    'A complete wedding package showcasing the new normalized database structure. Perfect for couples planning their special day with all the essentials included.',
    250000.00,
    150,
    1,
    NOW(),
    50000.00
);

-- ========================================
-- Step 2: Link to Event Type (Wedding)
-- ========================================
-- Assuming event_type_id 1 is Wedding, adjust if needed
INSERT INTO tbl_package_event_types (package_id, event_type_id)
VALUES (999, 1);

-- ========================================
-- Step 3: Create Inclusions (with components as comma-separated for now)
-- ========================================

-- Inclusion 1: Wedding Ceremony Essentials
INSERT INTO tbl_package_inclusions (
    package_id,
    inclusion_name,
    components_list,
    inclusion_price,
    display_order
) VALUES (
    999,
    'Wedding Ceremony Essentials',
    'White Wedding Arch, Aisle Runner, Ceremony Chairs (150pcs), Sound System for Ceremony',
    35000.00,
    1
);

-- Inclusion 2: Reception Venue Setup
INSERT INTO tbl_package_inclusions (
    package_id,
    inclusion_name,
    components_list,
    inclusion_price,
    display_order
) VALUES (
    999,
    'Reception Venue Setup',
    'Round Tables (15pcs), Chiavari Chairs (150pcs), Table Linens, Chair Covers, Stage Platform',
    45000.00,
    2
);

-- Inclusion 3: Catering Services
INSERT INTO tbl_package_inclusions (
    package_id,
    inclusion_name,
    components_list,
    inclusion_price,
    display_order
) VALUES (
    999,
    'Catering Services',
    '5-Course Dinner, Welcome Drinks, Dessert Station, Coffee & Tea Station, Wait Staff (10pcs)',
    75000.00,
    3
);

-- Inclusion 4: Floral & Decorations
INSERT INTO tbl_package_inclusions (
    package_id,
    inclusion_name,
    components_list,
    inclusion_price,
    display_order
) VALUES (
    999,
    'Floral & Decorations',
    'Bridal Bouquet, Bridesmaids Bouquets (5pcs), Boutonniere, Centerpieces (15pcs), Ceremony Florals',
    28000.00,
    4
);

-- Inclusion 5: Wedding Cake
INSERT INTO tbl_package_inclusions (
    package_id,
    inclusion_name,
    components_list,
    inclusion_price,
    display_order
) VALUES (
    999,
    'Wedding Cake',
    '3-Tier Wedding Cake, Cake Stand, Cake Cutting Service, Cake Toppers',
    15000.00,
    5
);

-- Inclusion 6: Photography & Videography
INSERT INTO tbl_package_inclusions (
    package_id,
    inclusion_name,
    components_list,
    inclusion_price,
    display_order
) VALUES (
    999,
    'Photography & Videography',
    'Professional Photographer, Videographer, Pre-Wedding Shoot, Same Day Edit, Photo Album, Wedding Video',
    52000.00,
    6
);

-- ========================================
-- Step 4: Create Individual Components (New Normalized Structure!)
-- ========================================
-- These components are parsed from the comma-separated lists above
-- This demonstrates the fully normalized structure

-- Components for Inclusion 1: Wedding Ceremony Essentials
INSERT INTO tbl_inclusion_components (inclusion_id, component_name, component_description, component_price, display_order)
SELECT
    i.inclusion_id,
    'White Wedding Arch',
    'Elegant white wedding arch decorated with florals',
    12000.00,
    1
FROM tbl_package_inclusions i
WHERE i.package_id = 999 AND i.inclusion_name = 'Wedding Ceremony Essentials';

INSERT INTO tbl_inclusion_components (inclusion_id, component_name, component_description, component_price, display_order)
SELECT
    i.inclusion_id,
    'Aisle Runner',
    'Premium white aisle runner with floral petals',
    5000.00,
    2
FROM tbl_package_inclusions i
WHERE i.package_id = 999 AND i.inclusion_name = 'Wedding Ceremony Essentials';

INSERT INTO tbl_inclusion_components (inclusion_id, component_name, component_description, component_price, display_order)
SELECT
    i.inclusion_id,
    'Ceremony Chairs',
    '150 pieces of elegant ceremony chairs',
    15000.00,
    3
FROM tbl_package_inclusions i
WHERE i.package_id = 999 AND i.inclusion_name = 'Wedding Ceremony Essentials';

INSERT INTO tbl_inclusion_components (inclusion_id, component_name, component_description, component_price, display_order)
SELECT
    i.inclusion_id,
    'Sound System for Ceremony',
    'Professional sound system with microphones',
    3000.00,
    4
FROM tbl_package_inclusions i
WHERE i.package_id = 999 AND i.inclusion_name = 'Wedding Ceremony Essentials';

-- Components for Inclusion 3: Catering Services
INSERT INTO tbl_inclusion_components (inclusion_id, component_name, component_description, component_price, display_order)
SELECT
    i.inclusion_id,
    '5-Course Dinner',
    'Premium 5-course dinner menu for 150 guests',
    45000.00,
    1
FROM tbl_package_inclusions i
WHERE i.package_id = 999 AND i.inclusion_name = 'Catering Services';

INSERT INTO tbl_inclusion_components (inclusion_id, component_name, component_description, component_price, display_order)
SELECT
    i.inclusion_id,
    'Welcome Drinks',
    'Refreshing welcome drinks and mocktails',
    8000.00,
    2
FROM tbl_package_inclusions i
WHERE i.package_id = 999 AND i.inclusion_name = 'Catering Services';

INSERT INTO tbl_inclusion_components (inclusion_id, component_name, component_description, component_price, display_order)
SELECT
    i.inclusion_id,
    'Dessert Station',
    'Assorted desserts and sweets station',
    12000.00,
    3
FROM tbl_package_inclusions i
WHERE i.package_id = 999 AND i.inclusion_name = 'Catering Services';

INSERT INTO tbl_inclusion_components (inclusion_id, component_name, component_description, component_price, display_order)
SELECT
    i.inclusion_id,
    'Wait Staff',
    'Professional wait staff (10 persons)',
    10000.00,
    4
FROM tbl_package_inclusions i
WHERE i.package_id = 999 AND i.inclusion_name = 'Catering Services';

-- ========================================
-- Step 5: Add Freebies
-- ========================================
INSERT INTO tbl_package_freebies (
    package_id,
    freebie_name,
    freebie_description,
    display_order
) VALUES
(999, 'Wedding Coordinator', 'Professional wedding coordinator for the day', 1),
(999, 'Bridal Car Decoration', 'Beautiful floral decoration for bridal car', 2),
(999, 'Guest Book & Pen', 'Elegant guest book with signing pen', 3),
(999, 'Wedding Signage', 'Welcome sign and directional signages', 4),
(999, 'Champagne Toast', 'Complimentary champagne for toasting', 5);

-- ========================================
-- Verification Queries
-- ========================================
-- Run these to verify the sample package was created correctly

-- View the package
SELECT * FROM tbl_packages WHERE package_id = 999;

-- View all inclusions
SELECT
    i.inclusion_id,
    i.inclusion_name,
    i.components_list,
    i.inclusion_price,
    i.display_order
FROM tbl_package_inclusions i
WHERE i.package_id = 999
ORDER BY i.display_order;

-- View individual components (normalized structure)
SELECT
    i.inclusion_name,
    c.component_name,
    c.component_description,
    c.component_price
FROM tbl_package_inclusions i
JOIN tbl_inclusion_components c ON i.inclusion_id = c.inclusion_id
WHERE i.package_id = 999
ORDER BY i.display_order, c.display_order;

-- View freebies
SELECT * FROM tbl_package_freebies WHERE package_id = 999 ORDER BY display_order;

-- View complete package summary
SELECT
    p.package_title,
    p.package_price,
    p.guest_capacity,
    COUNT(DISTINCT i.inclusion_id) as inclusion_count,
    COUNT(DISTINCT c.component_id) as component_count,
    COUNT(DISTINCT f.freebie_id) as freebie_count,
    SUM(i.inclusion_price) as total_inclusions_price
FROM tbl_packages p
LEFT JOIN tbl_package_inclusions i ON p.package_id = i.package_id
LEFT JOIN tbl_inclusion_components c ON i.inclusion_id = c.inclusion_id
LEFT JOIN tbl_package_freebies f ON p.package_id = f.package_id
WHERE p.package_id = 999
GROUP BY p.package_id, p.package_title, p.package_price, p.guest_capacity;

-- ========================================
-- Expected Results:
-- - Package Price: ₱250,000
-- - Total Inclusions: 6
-- - Total Components: 8 (in tbl_inclusion_components)
-- - Total Freebies: 5
-- - Sum of Inclusion Prices: ₱250,000
-- ========================================

SELECT
    '✅ Sample Package Created Successfully!' as status,
    'Package ID: 999 - Sample Dream Wedding Package' as package_info,
    '6 Inclusions, 8 Components, 5 Freebies' as details,
    '₱250,000.00 Total Price' as price;
