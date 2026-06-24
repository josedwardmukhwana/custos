@echo off
cd /d "%~dp0"
cd ..

tasklist /FI "IMAGENAME eq node.exe" | find /I "node.exe" >nul
if %errorlevel% equ 0 (
    exit
)

node dist/server.js