set "node=C:\nvm4w\nodejs"
if not exist "%node%" (
    set "node=%ProgramFiles%\nodejs"
)
pause
call "%node%\node" main.js
pause