@echo off
setlocal
cd /d "%~dp0"
py -3 -m unittest discover -s testes -p "test_*.py" -v
if errorlevel 1 goto falhou
where node >nul 2>nul
if errorlevel 1 goto semnode
node --test testes/test_frontend.js testes/test_regressions.js testes/test_mobile.js testes/test_mkxv_matrix.js testes/test_extensions.js
if errorlevel 1 goto falhou
echo Todos os testes passaram.
goto fim
:semnode
echo Testes Python passaram. Node nao esta disponivel para os testes JavaScript.
goto fim
:falhou
echo Houve falha nos testes. Consulte a mensagem acima.
:fim
pause
endlocal
