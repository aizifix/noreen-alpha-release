@echo off
echo ========================================
echo Payment Table Complete Fix
echo ========================================
echo.
echo This will fix ALL payment column errors:
echo - Add schedule_id column
echo - Add payment_percentage column
echo - Add payment_reference column
echo - Remove payment_attachments column
echo.
echo Press any key to start the migration...
pause > nul
echo.
echo Running migration...
echo.

php run_payment_percentage_migration.php

echo.
echo ========================================
echo.
echo NEXT STEPS:
echo 1. Stop your Next.js dev server (Ctrl+C)
echo 2. Restart it: npm run dev
echo 3. Hard refresh browser (Ctrl+Shift+R)
echo.
echo The payment errors should be fixed!
echo.
pause
