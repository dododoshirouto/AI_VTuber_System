:



echo [!] Require Python 3.10

echo === Make Node.js for root ===

IF NOT EXIST package.json (
    call npm init -y
    call npm install axios node-wav
)



echo === Make Node.js for Read X Bookmark ===

IF NOT EXIST read_bookmark (
    mkdir read_bookmark
)
cd read_bookmark
IF NOT EXIST package.json (
    call npm init -y
    call npm install puppeteer child_process
)
cd ..



echo === Make Node.js for Use ChatGPT ===

IF NOT EXIST use_chatgpt (
    mkdir use_chatgpt
)
cd use_chatgpt
IF NOT EXIST package.json (
    call npm init -y
    call npm install openai dotenv
)
cd ..



echo === Make Python for Use VOICEVOX Core ===

IF NOT EXIST voicevox_talker (
    mkdir voicevox_talker
)
cd voicevox_talker
IF NOT EXIST venv (
    python -m venv venv
)
call _install.bat
cd ..

echo Project Install All Done.