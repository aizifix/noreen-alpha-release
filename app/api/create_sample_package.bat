@echo off
echo ========================================
echo Creating Sample Package
echo ========================================
echo.
echo This will create a sample package with:
echo - Package ID: 999
echo - Title: Sample Dream Wedding Package
echo - Price: P250,000
echo - 6 Inclusions with normalized components
echo - 5 Freebies
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo Running SQL script...
echo.

mysql -u norejixd_miko -p norejixd_miko < create_sample_package.sql

echo.
echo ========================================
echo Sample package created!
echo ========================================
echo.
echo You can now view it in your admin dashboard
echo at: /admin/packages
echo.
echo Package ID: 999
echo.
pause
