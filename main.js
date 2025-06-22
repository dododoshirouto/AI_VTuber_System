const fs = require('fs');
const axios = require('axios');
const path = require('path');
const { spawn } = require('child_process');

const VV_SERVER_HOST = "http://127.0.0.1:50021/";

new Promise(async _ => {
    // 1. ブクマ1件取得（仮）
    const post = {
        id: "abc123",
        text: "こんにちは、これはテストです！"
    };

    await launchPythonServer();

    await create_voicevox_wav_and_json(post.text);

});

async function create_voicevox_wav_and_json(text) {
    try {
        // PingしてFastAPIが生きてるか確認
        await axios.get(VV_SERVER_HOST);
        console.log("✅ FastAPIはすでに起動済み");
    } catch (e) {
        console.log("⚠ FastAPIが未起動");
        await new Promise(resolve => setTimeout(resolve, 500));
        return await create_voicevox_wav_and_json();
    }

    // AudioQuery を取得
    const queryRes = await axios.get(VV_SERVER_HOST + "query", {
        params: { text }
    });
    const audioQuery = JSON.parse(queryRes.data);

    // 音声ファイルを取得して保存
    const wavRes = await axios.get(VV_SERVER_HOST + "speak", {
        params: { text },
        responseType: "arraybuffer"
    });
    const wavPath = path.join(__dirname, "public", "chara", "voice.wav");
    fs.writeFileSync(wavPath, wavRes.data);

    // current.json を書き出す
    const current = {
        text,
        audio: "voice.wav",
        query: audioQuery
    };
    fs.writeFileSync("public/chara/current.json", JSON.stringify(current, null, 2));
}

async function launchPythonServer() {
    try {
        // PingしてFastAPIが生きてるか確認
        await axios.get(VV_SERVER_HOST);
        console.log("FastAPIはすでに起動済み");
        return; // 起動済みなので終了
    } catch (e) {
        console.log(e);
        console.log("FastAPIが未起動、起動します…");
    }

    return new Promise((resolve, reject) => {

        const venvPython = path.join(__dirname, 'voicevox_talker', 'venv', 'Scripts', 'python.exe');
        const py = spawn(venvPython, ['voicevox_talker/main.py']);

        py.stdout.on('data', (data) => {
            const text = data.toString();
            console.log(`[py] ${text}`);
            if (text.includes("running on")) resolve();  // 起動検知
        });

        py.stderr.on('data', (data) => {
            console.error(`[py:err] ${data}`);
            const text = data.toString();
            if (text.includes("running on")) resolve();  // 起動検知
        });

        py.on('close', (code) => {
            console.log(`[py] 終了コード: ${code}`);
        });

        new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`FastAPIを起動中…`);
    });
}