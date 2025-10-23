@echo off
echo ============================================================================
echo   NORMALIZE PACKAGE STRUCTURE MIGRATION
echo ============================================================================
echo.
echo This migration will:
echo   1. Create new tbl_inclusion_components table
echo   2. Rename tbl_package_components to tbl_package_inclusions
echo   3. Rename columns (component_* to inclusion_*)
echo   4. Parse comma-separated components into individual rows
echo   5. Add foreign key constraints
echo.
echo BEFORE: Package ^> Components (comma-separated in description)
echo AFTER:  Package ^> Inclusions ^> Components (proper hierarchy)
echo.
echo ⚠️  WARNING: This is a MAJOR database structure change!
echo ⚠️  BACKUP YOUR DATABASE before proceeding!
echo.
set /p CONFIRM="Type 'YES' to continue: "

if not "%CONFIRM%"=="YES" (
    echo.
    echo Migration cancelled.
    pause
    exit /b
)

echo.
echo ============================================================================
echo   Step 1: Backup Database
echo ============================================================================
echo.

set /p DB_HOST="Enter database host (default: localhost): " || set DB_HOST=localhost
set /p DB_NAME="Enter database name: "
set /p DB_USER="Enter database user: "
set /p DB_PASS="Enter database password: "

echo.
echo Creating backup...
mysqldump -h %DB_HOST% -u %DB_USER% -p%DB_PASS% %DB_NAME% > backup_before_normalize_%date:~-4,4%%date:~-10,2%%date:~-7,2%.sql

if %ERRORLEVEL% EQU 0 (
    echo ✓ Backup created successfully
) else (
    echo ✗ Backup failed! Aborting migration.
    pause
    exit /b 1
)

echo.
echo ============================================================================
echo   Step 2: Run Migration
echo ============================================================================
echo.
mysql -h %DB_HOST% -u %DB_USER% -p%DB_PASS% %DB_NAME% < migrations/normalize_package_structure.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================================
    echo   ✅ MIGRATION COMPLETED SUCCESSFULLY
    echo ============================================================================
    echo.
    echo New structure created:
    echo   - tbl_package_inclusions (renamed from tbl_package_components)
    echo   - tbl_inclusion_components (new table for components)
    echo.
    echo NEXT STEPS:
    echo   1. Verify the migration by checking the database
    echo   2. Update PHP backend code (see MIGRATION_GUIDE.md)
    echo   3. Update TypeScript frontend code
    echo   4. Test package creation and editing
    echo   5. If everything works, drop the components_list column:
    echo      ALTER TABLE tbl_package_inclusions DROP COLUMN components_list;
    echo.
    echo ROLLBACK:
    echo   If something is wrong, run: rollback_normalize_migration.bat
    echo.
) else (
    echo.
    echo ============================================================================
    echo   ✗ MIGRATION FAILED
    echo ============================================================================
    echo.
    echo Check the error messages above.
    echo Your backup is saved at: backup_before_normalize_%date:~-4,4%%date:~-10,2%%date:~-7,2%.sql
    echo.
    echo To restore from backup:
    echo   mysql -h %DB_HOST% -u %DB_USER% -p%DB_PASS% %DB_NAME% ^< backup_before_normalize_*.sql
    echo.
)

pause
