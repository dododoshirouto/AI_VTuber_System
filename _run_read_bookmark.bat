::_run_read_bookmark.bat

@echo off
setlocal

set "node=C:\nvm4w\nodejs"
if not exist "%node%" (
    set "node=%ProgramFiles%\nodejs"
)

call "%node%\node" read_bookmark
:: cd..