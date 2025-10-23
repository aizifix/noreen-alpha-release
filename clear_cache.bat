@echo off
echo ========================================
echo Clearing Next.js Cache
echo ========================================
echo.

cd "%~dp0"

echo Stopping any running Next.js processes...
taskkill /F /IM node.exe 2>nul

echo.
echo Deleting .next folder...
if exist ".next" (
    rmdir /s /q ".next"
    echo ✅ .next folder deleted
) else (
    echo ℹ️  .next folder not found
)

echo.
echo Deleting node_modules/.cache...
if exist "node_modules\.cache" (
    rmdir /s /q "node_modules\.cache"
    echo ✅ node_modules/.cache deleted
) else (
    echo ℹ️  node_modules/.cache not found
)

echo.
echo ========================================
echo Cache cleared successfully!
echo ========================================
echo.
echo Now run: npm run dev
echo Then refresh your browser with Ctrl+F5
echo.
pause
