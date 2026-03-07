@echo off
setlocal

REM Move to folder where the bat file exists
cd /d "%~dp0"

echo ==========================================
echo  Starting CIOA frontend and backend...
echo  - Frontend: http://localhost:3000
echo  - Backend : http://localhost:8000
echo ==========================================
echo.

REM ---------- START BACKEND ----------

if exist "backend\venv\Scripts\activate.bat" (

    echo Starting backend using virtual environment...

    start "CIOA Backend" cmd /k ^
    "cd /d \"%~dp0backend\" && ^
    call venv\Scripts\activate && ^
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

) else (

    echo Virtual environment not found. Starting backend normally...

    start "CIOA Backend" cmd /k ^
    "cd /d \"%~dp0backend\" && ^
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

)

REM ---------- START FRONTEND ----------

echo Starting frontend...

start "CIOA Frontend" cmd /k ^
"cd /d \"%~dp0\" && npm run dev"

echo.
echo Both servers started in new windows.
echo You may close this window.

endlocal
exit