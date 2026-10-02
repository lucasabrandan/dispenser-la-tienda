@echo off
setlocal EnableExtensions
REM ============================================================================
REM  Actualizar backend gestiondlt (2-oct-2026)
REM  Baja lo ultimo de GitHub, frena el servicio, compila, lo vuelve a levantar
REM  y chequea que responda. Si la compilacion falla, vuelve a levantar la
REM  version anterior (nunca deja el backend caido).
REM  Uso: clic derecho -> "Ejecutar como administrador".
REM ============================================================================

set "SERVICIO=SpringBootDispenser"
set "RAIZ=%~dp0"
set "BACK=%RAIZ%backend"
set "JAR=%BACK%\target\dispenser-la-tienda-0.0.1-SNAPSHOT.jar"
set "LOCAL=%BACK%\src\main\resources\application-local.properties"

net session >nul 2>&1
if errorlevel 1 (
    echo.
    echo  Este script necesita permisos de administrador.
    echo  Clic derecho sobre actualizar-backend.bat -^> "Ejecutar como administrador".
    pause
    exit /b 1
)

cd /d "%RAIZ%"

echo.
echo [1/6] Bajando cambios de GitHub...
git pull --ff-only
if errorlevel 1 (
    echo  ERROR: no se pudo hacer git pull. Revisa si hay cambios locales sin commitear.
    pause
    exit /b 1
)

echo.
echo [2/6] Revisando la clave de sesiones (jwt.secret)...
findstr /b /c:"jwt.secret=" "%LOCAL%" >nul 2>&1
if errorlevel 1 (
    powershell -NoProfile -Command "$b = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); Add-Content -Path '%LOCAL%' -Value ''; Add-Content -Path '%LOCAL%' -Value '# Clave de sesiones generada por actualizar-backend.bat - NO subir al repo'; Add-Content -Path '%LOCAL%' -Value ('jwt.secret=' + [Convert]::ToBase64String($b))"
    echo  Clave nueva generada en application-local.properties.
    echo  Los usuarios conectados se reconectan solos con su sesion guardada.
) else (
    echo  OK, ya existe.
)

echo.
echo [3/6] Frenando el backend...
net stop %SERVICIO% >nul 2>&1
timeout /t 3 /nobreak >nul

REM Logs: si pasan de 50 MB se archivan (el anterior se pisa)
for %%F in ("%BACK%\service-out.log" "%BACK%\service-err.log") do (
    if exist "%%~F" if %%~zF GTR 52428800 (
        move /y "%%~F" "%%~F.old" >nul
        echo  Log %%~nxF archivado ^(pesaba %%~zF bytes^).
    )
)

echo.
echo [4/6] Compilando (puede tardar un minuto)...
if exist "%JAR%" copy /y "%JAR%" "%JAR%.backup" >nul
cd /d "%BACK%"
call mvnw.cmd package -DskipTests -q
if errorlevel 1 (
    echo.
    echo  ERROR DE COMPILACION. Copia las lineas [ERROR] de arriba y pasaselas a Claude.
    echo  Se vuelve a levantar la version anterior.
    if exist "%JAR%.backup" copy /y "%JAR%.backup" "%JAR%" >nul
    net start %SERVICIO% >nul 2>&1
    pause
    exit /b 1
)

echo.
echo [5/6] Levantando el backend...
net start %SERVICIO% >nul 2>&1

echo.
echo [6/6] Esperando que responda...
set /a INTENTOS=0
:esperar
set /a INTENTOS+=1
timeout /t 3 /nobreak >nul
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 http://localhost:8080/health; exit 0 } catch { exit 1 }"
if not errorlevel 1 goto :ok
if %INTENTOS% LSS 20 goto :esperar

echo.
echo  El backend no respondio en 60 segundos. Mira las ultimas lineas de:
echo  %BACK%\service-err.log
pause
exit /b 1

:ok
echo.
echo  ==============================================
echo   LISTO: backend actualizado y funcionando.
echo  ==============================================
git -C "%RAIZ%" log --oneline -1
pause
exit /b 0
