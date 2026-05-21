@echo off
echo [CLEANUP] Finding process on port 7001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :7001 ^| findstr LISTENING') do (
    echo [CLEANUP] Killing PID: %%a
    taskkill /f /pid %%a
)
echo [START] Starting dev server with LAN access...
cmd /c npm run dev
