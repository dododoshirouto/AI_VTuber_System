@echo on

@REM install python if not exist
set PYTHON=python
set PYTHON_OK=0
for /f "delims=" %%i in ('where python 2^>nul') do (
    for /f "delims=" %%j in ('"%%i" --version 2^>nul') do (
        set PYTHON_OK=1
    )
)
if "%PYTHON_OK%"=="1" (
    rem Pythonはある
) else (
    echo install python...
    curl -o python.zip https://www.python.org/ftp/python/3.12.2/python-3.12.2-embed-amd64.zip
    mkdir python-3.12.2
    tar -xf python.zip -C python-3.12.2\
    del python.zip
    set PATH="%~dp0python-3.12.2;%PATH%"
)

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
    curl -L -o voicevox-download-windows-x64.exe https://github.com/VOICEVOX/voicevox_core/releases/download/%VOICEVOX_VERSION%/download-windows-x64.exe
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