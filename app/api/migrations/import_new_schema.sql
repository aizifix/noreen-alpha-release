-- Import New Schema Instructions
-- Date: 2025-01-27
-- Description: Instructions for importing the new schema that fixes payment issues

/*
IMPORTANT: If the simple_payment_fix.sql script fails because tables don't exist,
you need to import the new schema first.

STEPS TO IMPORT NEW SCHEMA:

1. BACKUP YOUR CURRENT DATABASE FIRST!
   - Export your current database before proceeding
   - Make sure you have a backup you can restore if needed

2. Import the new schema:
   - Use phpMyAdmin or MySQL command line
   - Import the file: app/api/es_v3 (9).sql
   - This will create the updated table structure with fixed triggers

3. After importing, run this verification query:
*/

-- Verification query to run after importing new schema
SELECT 'Schema Import Verification' as status;

-- Check if tables exist and have data
SELECT
    'tbl_events' as table_name,
    COUNT(*) as record_count
FROM tbl_events
UNION ALL
SELECT
    'tbl_payments' as table_name,
    COUNT(*) as record_count
FROM tbl_payments;

-- Check triggers (should show only 1 payment INSERT trigger)
SHOW TRIGGERS WHERE `Table` = 'tbl_payments' AND `Event` = 'INSERT';

-- Verify payment totals are correct
SELECT
    e.event_id,
    e.event_title,
    e.total_budget,
    COUNT(p.payment_id) as total_payments,
    SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END) as total_paid,
    ROUND((SUM(CASE WHEN p.payment_status = 'completed' THEN p.payment_amount ELSE 0 END) / e.total_budget) * 100, 2) as payment_percentage
FROM tbl_events e
LEFT JOIN tbl_payments p ON e.event_id = p.event_id
WHERE e.event_id IN (48, 35, 11)  -- Check specific events
GROUP BY e.event_id, e.event_title, e.total_budget
ORDER BY e.event_id;

/*
EXPECTED RESULTS:
- Event 48: ₱40,000 paid out of ₱80,000 (50%)
- Event 35: ₱412,000 paid out of ₱412,000 (100%)
- Event 11: Should show correct totals without duplicates

If you see these correct results, the payment fix is working!
*/
