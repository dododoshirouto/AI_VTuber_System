
:: voicevox_talker/_install.bat
@echo off
setlocal enabledelayedexpansion

set PYTHON_VERSION=3.12.2



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



IF EXIST venv\Scripts\activate GOTO :SKIP_CREATE_VENV
echo create venv...
%PYTHON% -m venv venv
:SKIP_CREATE_VENV


echo install python modules...
"venv\Scripts\python.exe" -m pip install -r requirements.txt

set VOICEVOX_VERSION=0.16.0
echo VOICEVOX_VERSION is %VOICEVOX_VERSION%.

@REM download and install voicevox_core

IF EXIST voicevox-download-windows-x64.exe GOTO :SKIP_DL_VOICEVOX_INSTALLER
    echo Downloading download-windows-x64.exe from voicevox_core ...
    C:\Windows\System32\curl.exe -L -o voicevox-download-windows-x64.exe https://github.com/VOICEVOX/voicevox_core/releases/download/%VOICEVOX_VERSION%/download-windows-x64.exe
:SKIP_DL_VOICEVOX_INSTALLER

IF EXIST voicevox_core.dll GOTO :SKIP_INSTALL_VOICEVOX_DLL
    echo install voicevox...
    voicevox-download-windows-x64.exe -o ./ --exclude c-api
    del voicevox-download-windows-x64.exe
:SKIP_INSTALL_VOICEVOX_DLL

IF EXIST venv\Lib\site-packages\voicevox_core GOTO :SKIP_INSTALL_VOICEVOX_CORE
    echo install voicevox_core modules...
    @REM "venv\Scripts\python.exe" -m pip install https://github.com/VOICEVOX/voicevox_core/releases/download/%VOICEVOX_VERSION%/voicevox_core-%VOICEVOX_VERSION%+cpu-cp38-abi3-win_amd64.whl
    "venv\Scripts\python.exe" -m pip install https://github.com/VOICEVOX/voicevox_core/releases/download/%VOICEVOX_VERSION%/voicevox_core-%VOICEVOX_VERSION%-cp310-abi3-win_amd64.whl
:SKIP_INSTALL_VOICEVOX_CORE

pause
