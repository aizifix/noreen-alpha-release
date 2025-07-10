@echo off
echo Starting Event Management System Servers...
echo.

echo ============================================
echo Starting XAMPP/PHP Server (if needed)...
echo ============================================
echo Please make sure XAMPP is installed and running:
echo 1. Start XAMPP Control Panel
echo 2. Start Apache server
echo 3. Start MySQL server
echo.
echo If you don't have XAMPP, you can also use PHP built-in server:
echo php -S localhost:80 -t app/api/
echo.

echo ============================================
echo Starting Next.js Development Server...
echo ============================================
start "Next.js Server" cmd /k "npm run dev"

echo.
echo ============================================
echo Opening Test Pages...
echo ============================================
timeout /t 3 /nobreak > nul
start http://localhost:3000
start test-backend.html

echo.
echo Servers started!
echo - Next.js: http://localhost:3000
echo - Backend API should be: http://localhost/events-api/admin.php
echo - Test page: test-backend.html
echo.
echo If you encounter connection errors:
echo 1. Check if XAMPP Apache is running on port 80
echo 2. Check if MySQL is running
echo 3. Test the API with the test-backend.html file
echo.
pause
