@echo off
echo Starting Enterprise CRM...

echo.
echo [1/2] Starting Backend (NestJS) on port 4000...
start "CRM Backend" cmd /k "cd /d c:\xampp\htdocs\CRM\backend && npm run start:dev"

echo Waiting 5 seconds before starting frontend...
timeout /t 5 /nobreak >nul

echo.
echo [2/2] Starting Frontend (Next.js) on port 3000...
start "CRM Frontend" cmd /k "cd /d c:\xampp\htdocs\CRM\mycrm && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo Backend:  http://localhost:4000
echo Frontend: http://localhost:3000
echo.
echo Wait ~30 seconds for the backend to finish compiling, then open:
echo http://localhost:3000
echo.
pause
