@echo off
setlocal
cd /d "%~dp0"
py -3 -m unittest discover -s testes -p "test_*.py" -v
pause
endlocal
