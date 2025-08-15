
:: _install.bat
@echo off
setlocal enabledelayedexpansion

set PYTHON_VERSION=3.10.11

:: =================================================================
:: Fully Automated Development Environment Setup for Windows
:: =================================================================
::
:: This script installs pyenv-win, nvm-windows, Python, Node.js,
:: and all project dependencies from scratch.
::
:: How to run:
::   1. Save this file (e.g., as install.bat).
::   2. Right-click the file and select "Run as administrator".
::
:: =================================================================


:: === Phase 1/7: Check for Administrator Privileges ===
echo.
echo [Phase 1/7] Checking for administrator privileges...
net session >nul 2>&1
if %errorLevel% == 0 (
    echo   [OK] Administrator privileges detected.
    goto :endof_admin_check
)
    echo   [!] ERROR: This script requires administrator privileges.
    echo   Please right-click the file and select "Run as administrator".
    pause
    exit /b

:endof_admin_check


:: === Phase 2/7: Check for Winget ===
echo.
echo [Phase 2/7] Checking for winget package manager...
winget --version >nul 2>&1
if %errorLevel% == 0 (
    echo   [OK] winget is available.
    goto :endof_winget_install
)
    echo   [!] ERROR: winget is not found.
    echo   Please install 'App Installer' from the Microsoft Store.
    pause
    exit /b

:endof_winget_install



:: --- Phase 2: Microsoft Visual C++ Redistributable Check ---
echo.
echo [2/8] Checking for Microsoft Visual C++ Redistributable...
:: A simple way to check is to look for a key file. This isn't foolproof but good enough.
if exist "%SystemRoot%\System32\VCRUNTIME140.dll" (
    echo   [INFO] Visual C++ Redistributable seems to be installed.
    goto :endof_msvc_install
)
    echo   [*] Visual C++ Redistributable not found. Installing via winget...
    winget install --id Microsoft.VCRedist.2015+.x64 --silent --accept-source-agreements --accept-package-agreements
    if %errorLevel% neq 0 (
        echo   [!] ERROR: Failed to install Visual C++ Redistributable.
        echo       Please try installing it manually from Microsoft's website.
        pause
        exit /b
    )
    echo   [OK] Visual C++ Redistributable has been installed.

:endof_msvc_install


:: === Phase 3/7: Install pyenv-win ===
echo.
echo [Phase 3/7] Setting up pyenv-win for Python version management...
call pyenv versions >nul
if %errorLevel% == 0 (
    echo   [INFO] pyenv-win is already installed. Skipping.
    goto :endof_pyenv_install
)
    echo [Phase 2/3] Downloading the pyenv-win installer...
    start "" /wait powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference = 'Stop'; try { Invoke-WebRequest -UseBasicParsing -Uri 'https://raw.githubusercontent.com/pyenv-win/pyenv-win/master/pyenv-win/install-pyenv-win.ps1' -OutFile './install-pyenv-win.ps1' } catch { Write-Error $_; exit 1 }"
::    if %errorLevel% neq 0 (
    if not exist "install-pyenv-win.ps1" (
        echo   [!] ERROR: Failed to download the installer script.
        echo   Please check your internet connection and try again.
        pause
        exit /b
    )
    echo [Phase 3/3] Running the pyenv-win installer...
    start "" /wait powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference = 'Stop'; try { &'./install-pyenv-win.ps1' } catch { Write-Error $_; exit 1 }"
::    if %errorLevel% neq 0 (
    if not exist "%USERPROFILE%\.pyenv\pyenv-win" (
        echo   [!] ERROR: The installation script failed.
        pause
        exit /b
    )

    :: Clean up the downloaded installer file
    del /F /Q "install-pyenv-win.ps1"

    echo   [OK] pyenv-win has been installed.
    echo   [*] For this session, adding pyenv to PATH temporarily...
    set "PATH=%USERPROFILE%\.pyenv\pyenv-win\bin;%USERPROFILE%\.pyenv\pyenv-win\shims;%PATH%"

:endof_pyenv_install


:: === Phase 4/7: Install Python 3.10 ===
echo.
echo [Phase 4/7] Installing Python %PYTHON_VERSION%...
call pyenv versions | findstr /C:"%PYTHON_VERSION%" >nul
if %errorLevel% == 0 (
    echo   [INFO] Python %PYTHON_VERSION% is already installed. Skipping.
    goto :endof_python_install
)
    echo   [*] Installing Python %PYTHON_VERSION% via pyenv. This may take a while...
    call pyenv install %PYTHON_VERSION%
    if %errorLevel% neq 0 (
        echo   [!] ERROR: Failed to install Python %PYTHON_VERSION%.
        pause
        exit /b
    )

:endof_python_install
echo   [*] Setting global Python version to %PYTHON_VERSION%...
call pyenv local %PYTHON_VERSION%
echo   [OK] Python %PYTHON_VERSION% is ready.


:: === Phase 5/7: Install nvm-windows ===
echo.
echo [Phase 5/7] Setting up nvm-windows for Node.js version management...
if exist "%LOCALAPPDATA%\nvm\nvm.exe" (
    echo   [INFO] nvm-windows seems to be installed. Skipping.
    goto :endof_nvm_install
)
    echo   [*] Installing nvm-windows using winget...
    winget source update
    winget install --silent --accept-source-agreements --accept-package-agreements CoreyButler.NVMforWindows
    if %errorLevel% neq 0 (
        echo   [!] ERROR: Failed to install nvm-windows.
        pause
        exit /b
    )
    echo   [OK] nvm-windows has been installed.

:endof_nvm_install


:: === Phase 6/7: Install Node.js (LTS) ===
echo.
echo [Phase 6/7] Installing Node.js (LTS version)...
set "NVM_HOME=%LOCALAPPDATA%\nvm"
set "NVM_SYMLINK=%ProgramFiles%\nodejs"
set "PATH=%NVM_SYMLINK%;%PATH%"
call "%NVM_HOME%\nvm.exe" install lts
if %errorLevel% neq 0 (
    echo   [!] ERROR: Failed to install Node.js LTS.
    pause
    exit /b
)
call "%NVM_HOME%\nvm.exe" use lts
echo   [OK] Node.js LTS is ready.


:: === Phase 7/7: Setup Project Dependencies ===
echo.
echo [Phase 7/7] Setting up project-specific dependencies...
echo.

echo   --- [Project] Root dependencies ---
if not exist package.json (
    echo     [*] Initializing Node.js project...
)
echo     [*] Installing root dependencies (axios, node-wav)...
    call npm init -y > nul
call npm install axios node-wav express

echo.
echo   --- [Project] Read X Bookmark ---
if not exist read_bookmark mkdir read_bookmark
cd read_bookmark
if not exist package.json (
)
echo     [*] Installing dependencies for Read X Bookmark...
    call npm init -y > nul
call npm install puppeteer child_process
cd ..

echo.
echo   --- [Project] Use ChatGPT ---
if not exist use_chatgpt mkdir use_chatgpt
cd use_chatgpt
if not exist package.json (
)
echo     [*] Installing dependencies for Use ChatGPT...
    call npm init -y > nul
call npm install openai dotenv
cd ..

echo.
echo   --- [Project] Use YouTube API ---
if not exist use_youtube mkdir use_youtube
cd use_youtube
if not exist package.json (
)
echo     [*] Installing dependencies for Use YouTube API...
    call npm init -y > nul
call npm install googleapis open
cd ..

echo.
echo   --- [Project] Use VOICEVOX Core ---
if not exist voicevox_talker mkdir voicevox_talker
cd voicevox_talker
if not exist venv (
    echo     [*] Creating Python virtual environment...
    call python -m venv venv
)
echo     [*] Activating virtual environment and installing dependencies...
call venv\Scripts\activate.bat
if exist _install.bat (
    echo     [*] Running _install.bat...
    call _install.bat
) else (
    echo     [WARNING] _install.bat not found. If you have a requirements.txt,
    echo     you should run 'pip install -r requirements.txt' manually.
    echo     Skipping Python dependency installation for now.
)
cd ..

echo.
echo =================================================================
echo [SUCCESS] All installation and setup processes are complete!
echo =================================================================
echo.
echo [IMPORTANT] Please CLOSE and REOPEN your terminal (Command Prompt, etc.)
echo             to ensure all environment variable changes are applied correctly.
echo.
pause
endlocal
