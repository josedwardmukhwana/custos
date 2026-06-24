@echo off
setlocal

for /f "tokens=2,*" %%a in ('reg query "HKLM\SOFTWARE\Custos" /v PythonPath 2^>nul ^| find "PythonPath"') do (
    set PYTHON=%%b
)

if not exist "%PYTHON%" (
    echo Python not found.
    pause
    exit /b 1
)

"%PYTHON%" "%~dp0..\erp\erp.py" "%~1"