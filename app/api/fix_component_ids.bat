@echo off
echo ================================================
echo   Fix Package Components with component_id = 0
echo ================================================
echo.
echo This script will fix package components that have component_id = 0
echo by reassigning them proper auto-incrementing IDs.
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

echo.
echo Running migration...
echo.

php run_component_fix.php

echo.
if %ERRORLEVEL% EQU 0 (
    echo ================================================
    echo   Migration Complete - SUCCESS
    echo ================================================
) else (
    echo ================================================
    echo   Migration Failed - ERROR
    echo ================================================
    echo Check the error messages above
)
echo.
pause
