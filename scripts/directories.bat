@echo off
SETLOCAL EnableExtensions

echo Creating directory structure...

REM Define project root relative to the script's location
SET "ROOT_DIR=%~dp0.."
pushd "%ROOT_DIR%" || (
    echo Error: Could not navigate to project root.
    exit /b 1
)

REM Create the main directories
echo Creating directories...
for %%d in (
    "src\core"
    "src\services"
    "src\navigation"
    "src\automation"
    "src\utils"
    "src\config"
) do (
    if not exist "%%~d" mkdir "%%~d"
)

REM Create the empty files
echo Creating initial files...
for %%f in (
    ".env"
    "src\core\seishin.ts"
    "src\core\server.ts"
    "src\core\queue.ts"
    "src\core\auth.ts"
    "src\services\populate.ts"
    "src\services\browser.ts"
    "src\services\heartBeat.ts"
    "src\services\movo.ts"
    "src\navigation\menu.ts"
    "src\navigation\search.ts"
    "src\automation\getRecord.ts"
    "src\automation\populateRecordHeader.ts"
    "src\automation\populateRecordFibers.ts"
    "src\automation\populateRecordObservations.ts"
    "src\utils\types.ts"
    "src\utils\hud.ts"
    "src\utils\layout.ts"
    "src\utils\logger.ts"
    "src\config\environment.ts"
) do (
    if not exist "%%~f" type nul > "%%~f"
)

popd
echo Directory structure created successfully!
pause
ENDLOCAL