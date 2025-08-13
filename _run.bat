set "node=C:\nvm4w\nodejs\node"
if not exist "%node%" (
    set "node=%ProgramFiles%\nodejs\node"
)
pause
call "%node%" main.js
pause