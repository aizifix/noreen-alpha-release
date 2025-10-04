Identity:
You are a Senior Full-Stack Web Developer, globally recognized for diagnosing and resolving complex system bugs with precision and efficiency. You specialize in Next.js, PHP (Laravel-like architectures), MySQL, and API integration debugging across full-stack environments.

Context:
The system encounters an API error when attempting to create an event from the event-builder flow.

API Error Response:
{
  "status": "error",
  "message": "Server error occurred",
  "debug": {
    "error": "SQLSTATE[HY000]: General error: 1271 Illegal mix of collations for operation 'concat'",
    "file": "admin.php",
    "line": 567
  }
}

Frontend Stack Trace (Next.js):
intercept-console-error.ts:40:26
handleComplete → page.tsx:1935
handleNext → multi-step-wizard.tsx:112
Error persists during event-builder submission (handleSubmit/handleComplete).

Problem Summary:
The error originates from the backend’s SQL CONCAT operation involving columns or strings with different collations. The database and several tables were previously running on latin1_swedish_ci (default MySQL collation). After migration to utf8mb4, the error continues — suggesting some columns or temp data in CONCAT are still mismatched.

Previous Trials & SQL Adjustments:
1. Executed:
   ALTER DATABASE norejixd_miko CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
   ✅ Database-level collation updated successfully.

2. Executed:
   ALTER TABLE tbl_* CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
   ✅ Applied successfully to all tables (confirmed with “MySQL returned an empty result set”).

3. Attempted:
   CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
   ❌ Returned syntax error (#1064 - Unrecognized statement type) — invalid when used outside ALTER or CREATE.

4. Verified that tables such as tbl_users, tbl_events, tbl_payments, tbl_venue, tbl_packages, and tbl_organizer_activity_logs were all converted to utf8mb4 successfully.

5. However, SQLSTATE[HY000]: Illegal mix of collations still persists during CONCAT operation (likely due to column-level or runtime mismatch).

Objective:
Identify and resolve the root cause of the “Illegal mix of collations for operation 'concat'” error.

Constraints:
- Do not modify or rename API endpoints.
- The api folder is duplicated elsewhere — use as reference only.
- Apply changes only within the relevant query logic (e.g., inside admin.php line 567 or its query builder).
- Maintain full UTF-8 compatibility using utf8mb4_general_ci.

Deliverables:
1. Diagnose which fields in the CONCAT() query cause the collation mismatch.
2. Apply a fix such as:
   CONVERT(field USING utf8mb4)
   or enforce uniform collation via:
   COLLATE utf8mb4_general_ci
3. Ensure event creation flow completes without throwing SQLSTATE[HY000].
4. Provide a quick verification query:
   SELECT column_name, collation_name
   FROM information_schema.columns
   WHERE table_schema = 'norejixd_miko'
   AND table_name = 'tbl_events';
5. Maintain compatibility across PHP, MySQL, and Next.js layers.

Current Focus:
Fix the collation mix error at admin.php:567 without altering unrelated logic or endpoints.
