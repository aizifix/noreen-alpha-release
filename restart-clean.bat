@echo off
echo ========================================
echo COMPLETE DEVELOPMENT ENVIRONMENT RESET
echo ========================================

echo Stopping any running Next.js processes...
taskkill /f /im node.exe 2>nul

echo Clearing Next.js cache...
if exist .next rmdir /s /q .next

echo Clearing node_modules cache...
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo Clearing npm cache...
npm cache clean --force

echo Clearing browser cache (Chrome)...
if exist "%LOCALAPPDATA%\Google\Chrome\User Data\Default\Cache" rmdir /s /q "%LOCALAPPDATA%\Google\Chrome\User Data\Default\Cache"

echo Clearing browser cache (Edge)...
if exist "%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Cache" rmdir /s /q "%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Cache"

echo Reinstalling dependencies...
npm install

echo Starting development server with optimizations...
echo.
echo NOTE: Fast Refresh has been temporarily disabled to stop rebuilds
echo You will need to manually refresh the browser to see changes
echo.
npm run dev
