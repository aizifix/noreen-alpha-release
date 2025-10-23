@echo off
echo ============================================================================
echo   ROLLBACK PACKAGE NORMALIZATION
echo ============================================================================
echo.
echo This will rollback the normalization migration and restore:
echo   - tbl_package_components (from tbl_package_inclusions)
echo   - Comma-separated component descriptions
echo.
echo ⚠️  WARNING: This will DELETE tbl_inclusion_components!
echo.
set /p CONFIRM="Type 'YES' to rollback: "

if not "%CONFIRM%"=="YES" (
    echo.
    echo Rollback cancelled.
    pause
    exit /b
)

echo.
set /p DB_HOST="Enter database host (default: localhost): " || set DB_HOST=localhost
set /p DB_NAME="Enter database name: "
set /p DB_USER="Enter database user: "
set /p DB_PASS="Enter database password: "

echo.
echo Running rollback...
echo.

mysql -h %DB_HOST% -u %DB_USER% -p%DB_PASS% %DB_NAME% < migrations/rollback_normalize_package_structure.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================================
    echo   ✅ ROLLBACK COMPLETED
    echo ============================================================================
    echo.
    echo Original structure restored.
    echo.
) else (
    echo.
    echo ============================================================================
    echo   ✗ ROLLBACK FAILED
    echo ============================================================================
    echo.
)

pause
