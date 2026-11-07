@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title J.A.R.V.I.S. MK XV - Servidor opcional
if not exist ".env" copy /y ".env.example" ".env" >nul
py -3 -c "import sys; assert sys.version_info >= (3,10)" >nul 2>&1
if not errorlevel 1 (
    py -3 server.py
    goto fim
)
python -c "import sys; assert sys.version_info >= (3,10)" >nul 2>&1
if not errorlevel 1 (
    python server.py
    goto fim
)
echo.
echo Este modo exige Python 3.10 ou superior ja disponivel.
echo Para usar sem instalar programas, abra JARVIS_MK_XV.html.
:fim
echo.
pause
endlocal
