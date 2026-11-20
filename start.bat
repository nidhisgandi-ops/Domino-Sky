@echo off
echo ========================================
echo   DOMINO SKY - Flight Disruption Simulator
echo ========================================
echo.
echo Starting Backend (FastAPI)...
start "Domino Sky Backend" cmd /k "cd /d "%~dp0backend" && python main.py"
timeout /t 3 /nobreak > nul
echo.
echo Starting Frontend (Vite + React)...
start "Domino Sky Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
echo.
echo ========================================
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo   API Docs: http://localhost:8000/docs
echo ========================================
echo.
echo Opening browser in 5 seconds...
timeout /t 5 /nobreak > nul
start http://localhost:5173
