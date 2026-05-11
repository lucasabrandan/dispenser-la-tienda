@echo off
schtasks /create /tn "\DispenserBackend" /tr "cmd.exe /c \"C:\Users\Lucas Brandan\IdeaProjects\proyecto-dispenser\backend\iniciar-backend.bat\"" /sc ONLOGON /ru "Lucas Brandan" /f
echo.
if %errorlevel%==0 (echo Tarea creada correctamente!) else (echo ERROR al crear la tarea)
pause
