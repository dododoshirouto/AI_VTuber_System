:



echo [!] Require Python 3.10

echo === Make Node.js for root ===

IF EXIST package.json GOTO :root_package.json
    call npm init -y
    call npm install axios node-wav
:root_package.json



echo === Make Node.js for Read X Bookmark ===

IF EXIST read_bookmark GOTO :mkdir_read_bookmark
    mkdir read_bookmark
:mkdir_read_bookmark
cd read_bookmark
IF EXIST package.json GOTO :bookmark_package.json
    call npm init -y
    call npm install puppeteer child_process
:bookmark_package.json
cd ..



echo === Make Node.js for Use ChatGPT ===

IF EXIST use_chatgpt GOTO :mkdir_use_chatgpt
    mkdir use_chatgpt
:mkdir_use_chatgpt
cd use_chatgpt
IF EXIST package.json GOTO :chatgpt_package.json
    call npm init -y
    call npm install openai dotenv
:chatgpt_package.json
cd ..



echo === Make Node.js for Use YouTube API ===

IF EXIST use_youtube GOTO :mkdir_use_youtube
    mkdir use_youtube
:mkdir_use_youtube
cd use_youtube
IF EXIST package.json GOTO :youtube_package.json
    call npm init -y
    @REM call npm install openai dotenv
:youtube_package.json
cd ..



echo === Make Python for Use VOICEVOX Core ===

IF EXIST voicevox_talker GOTO :mkdir_voicevox_talker
    mkdir voicevox_talker
:mkdir_voicevox_talker
cd voicevox_talker
IF EXIST venv GOTO :voicevox_venv
    python -m venv venv
:voicevox_venv
call _install.bat
cd ..

echo Project Install All Done.