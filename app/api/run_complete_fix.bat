@echo off
echo ================================================
echo   Complete Fix for Package Components
echo ================================================
echo.
echo This will:
echo   1. Fix existing components with component_id = 0
echo   2. Ensure table has proper AUTO_INCREMENT PRIMARY KEY
echo   3. Reset AUTO_INCREMENT counter
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

echo.
echo Running comprehensive fix...
echo.

REM Get database credentials
set /p DB_HOST="Enter database host (default: localhost): " || set DB_HOST=localhost
set /p DB_NAME="Enter database name: "
set /p DB_USER="Enter database user: "
set /p DB_PASS="Enter database password: "

echo.
echo Connecting to database: %DB_NAME% at %DB_HOST%
echo.

mysql -h %DB_HOST% -u %DB_USER% -p%DB_PASS% %DB_NAME% < FIX_TABLE_AND_DATA.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================
    echo   ✓ FIX COMPLETED SUCCESSFULLY
    echo ================================================
    echo.
    echo Next steps:
    echo 1. Go to Admin Dashboard
    echo 2. Edit any package
    echo 3. Add new inclusions
    echo 4. Save and verify component_id is NOT 0
    echo.
) else (
    echo.
    echo ================================================
    echo   ✗ ERROR OCCURRED
    echo ================================================
    echo.
    echo Please check the error messages above
    echo.
)

pause
