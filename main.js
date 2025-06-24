const fs = require('fs');
const axios = require('axios');
const path = require('path');
const wav = require('node-wav');
const { spawn } = require('child_process');
const { replay, nextTopic, exit: exitChatGPT } = require('./use_chatgpt');

const VV_SERVER_HOST = "http://127.0.0.1:50021/";

const bookmarks_json_path = path.join(__dirname, 'read_bookmark/bookmarks.json');
var bookmarks = [];

(async _ => {
    await launchPythonServer();
    await get_bookmarks();

    await main();
})();

/** @type { { name: string, useBookmark: boolean, prompts: string[] }[] } */
const stream_topics_prompts = [
    {
        name: "配信開始",
        useBookmark: false,
        prompts: [
            `今日はブクマしたツイートを紹介する配信です。配信開始の雑談をして: ${(new Date()).toLocaleString()}`,
            `今日はブクマしたツイートを紹介する配信です。配信開始の挨拶をして: ${(new Date()).toLocaleString()}`,
            `今日はブクマしたツイートを紹介する配信です。季節を踏まえた挨拶雑談をして: ${(new Date()).toLocaleString()}`,
            `今日はブクマしたツイートを紹介する配信です。最近の日常を交えて挨拶雑談をして: ${(new Date()).toLocaleString()}`,
            `今日はブクマしたツイートを紹介する配信です。直近のニュースを交えて挨拶雑談をして: ${(new Date()).toLocaleString()}`,
            `今日はブクマしたツイートを紹介する配信です。最近の面白い話を交えて挨拶雑談をして: ${(new Date()).toLocaleString()}`,
        ]
    },
    {
        name: "雑談",
        useBookmark: false,
        prompts: [
            "いまのトピックを交えて、つなぎの雑談をして",
            `いまのトピックを交えて、季節をふまえた雑談をして: ${(new Date()).toLocaleDateString()}`,
            "いまのトピックを交えて、日常のことについて雑談して",
            "いまのトピックを交えて、なんかおもしろい雑談して",
            "いまのトピックを交えて、最近の出来事について雑談して",
        ]
    },
    {
        name: "ツイート読み始め",
        useBookmark: true,
        prompts: [
            "このツイート内容をまとめて、それについてコメントして",
            "このツイート内容をまとめて、自分の考えや知識と絡めてコメントして",
            "このツイート内容をまとめて、リアクションして",
            "このツイート内容をまとめて、なぜブクマしたのか説明して",
        ]
    },
    {
        name: "ツイート読み続き",
        useBookmark: false,
        prompts: [
            "今のツイート内容についてのコメントを続けて",
            "今のツイート内容について自分の考えや知識と絡めたコメントして",
            "今のツイートについて内容を分析してみて",
            "今のツイートに関係ある最近のニュースを解説して",
            "今のツイートについて構成を分析してみて",
            "今のツイートについてリアクションのあるコメントをして",
            "今のツイートについてからめて雑談して",
            "今のツイートをなぜブクマしたのか説明して",
        ]
    },
    {
        name: "配信終了",
        useBookmark: false,
        prompts: [
            "今日全体の内容を踏まえて、配信終了に行き着くような雑談をして配信を締めて",
            "今日全体の内容を踏まえて、雑談ののち配信終了の挨拶をして配信を締めて",
            "今日全体の内容を踏まえて、まとめ雑談をして配信を締めて",
            "今日全体の内容を踏まえて、日常の雑談を交えて配信終了の雑談をして配信を締めて",
            "今日全体の内容を踏まえて、最近の出来事について雑談しながら配信を締めて",
        ]
    }
];

async function main() {
    // 配信の流れ
    // TODO: コメントが来たら反応する

    let count = 0;

    // 配信開始の挨拶
    await create_topic_serif("配信開始");

    count = Math.floor(Math.random() * 3);
    let topic_prompts = stream_topics_prompts.find(t => t.name === "雑談").prompts.sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
        await create_topic_serif("雑談", topic_prompts[i]);
    }
    await nextTopic();

    // ブクマの紹介
    count = Math.floor(Math.random() * 3 + 2);
    for (let i = 0; i < count; i++) {
        let count2 = 0;

        await create_topic_serif("ツイート読み始め");
        count2 = Math.floor(Math.random() * 2 + 1);
        topic_prompts = stream_topics_prompts.find(t => t.name === "ツイート読み続き").prompts.sort(() => Math.random() - 0.5);
        for (let j = 0; j < count2; j++) {
            await create_topic_serif("ツイート読み続き", topic_prompts[j]);
        }

        count2 = Math.floor(Math.random() * 3);
        topic_prompts = stream_topics_prompts.find(t => t.name === "雑談").prompts.sort(() => Math.random() - 0.5);
        for (let j = 0; j < count2; j++) {
            await create_topic_serif("雑談", topic_prompts[j]);
        }
        await nextTopic();
    }

    await create_topic_serif("配信終了");

    exitChatGPT();
}

let last_wav_start_time = 0;
let last_wav_duration = 0;
let bookmark = null;

async function create_topic_serif(stream_topic_name, topic_prompt = null) {
    console.log(`📣 ${stream_topic_name}`);
    let topic_creating_start_time = Date.now();
    let topic_prompts = null;
    topic_prompts = stream_topics_prompts.find(t => t.name === stream_topic_name);
    if (!topic_prompt) {
        if (!topic_prompts) return null;
        topic_prompt = topic_prompts.prompts[Math.floor(Math.random() * topic_prompts.prompts.length)];
    }

    if (stream_topic_name.indexOf("ツイート") == -1) {
        bookmark = null;
    }

    if (topic_prompts?.useBookmark) {
        // TODO: 過去に配信で使ってないブクマを順番に使用するようにする
        bookmark = bookmarks[Math.floor(Math.random() * bookmarks.length)];
        if (bookmark) topic_prompt += "\n---\n# ツイート主\n" + bookmark.author + "\n# ツイート内容\n" + bookmark.text;
        bookmarks = bookmarks.filter(b => b !== bookmark);

        let text = `${bookmark.author}さんのツイートを紹介するわ。\n${bookmark.text}`;
        let { wav_buffer, text: _text, audioQuery } = await create_voicevox_wav_and_json(text);
        let wait_time = Math.max(0, (last_wav_duration + 800) - (Date.now() - last_wav_start_time));
        console.log(`⏱ ${(wait_time / 1000).toFixed(2)}s 待機`);
        await new Promise(resolve => setTimeout(resolve, wait_time));
        console.log(`🎙 save wav and json ${_text}`);
        save_wav_and_json(wav_buffer, _text, audioQuery, bookmark);
        last_wav_start_time = Date.now();
        last_wav_duration = getWavDuration(wav_buffer) * 1000;
    }

    var text = "";
    var error = false;
    do {
        try {
            text = await replay(topic_prompt);
        } catch (e) {
            console.log(e);
            console.log(e.error);
            if (e.error?.type == 'server_error') {
                error = true;
                console.log("ChatGPTがサーバーエラーなのでリトライします…");
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    } while (error);
    let { wav_buffer, text: _text, audioQuery } = await create_voicevox_wav_and_json(text);

    let wait_time = Math.max(0, (last_wav_duration + 800) - (Date.now() - last_wav_start_time));
    console.log(`⏱ ${(wait_time / 1000).toFixed(2)}s 待機`);
    await new Promise(resolve => setTimeout(resolve, wait_time));

    console.log(`🎙 save wav and json ${_text}`);
    save_wav_and_json(wav_buffer, _text, audioQuery, bookmark || null, stream_topic_name == "配信終了");
    last_wav_start_time = Date.now();
    last_wav_duration = getWavDuration(wav_buffer) * 1000;
}

function getWavDuration(buffer) {
    const result = wav.decode(buffer);
    return result.sampleRate ? result.channelData[0].length / result.sampleRate : 10; // fallback: 10秒
}

async function create_voicevox_wav_and_json(text) {
    text = text.replace(/https?:\/\/[^\s]+/g, '').trim();
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

    return { wav_buffer: wavRes.data, text, audioQuery };
}

function save_wav_and_json(wav_buffer, text, audioQuery, bookmark = null, isFinal = false) {
    const wavPath = path.join(__dirname, "public", "chara", "voice.wav");
    fs.writeFileSync(wavPath, wav_buffer);

    // current.json を書き出す
    const current = {
        text,
        audio: "voice.wav",
        query: audioQuery,
        isFinal: isFinal,
        bookmark
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
            let text = data.toString();
            if (text.length > 120) text = text.slice(0, 120) + '…';
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

async function get_bookmarks() {
    const jsonText = fs.readFileSync(bookmarks_json_path, 'utf-8');
    bookmarks = JSON.parse(jsonText);
    bookmarks = bookmarks.filter(b => b.text).filter(b => b.text.length > 100);
}

// SIGINT（Ctrl+C）
process.on('SIGINT', () => {
    console.log('🛑 SIGINT (Ctrl+C) を受信しました');
    exitChatGPT();
    process.exit(0);
});

// 予期しないエラーでクラッシュしそうなとき
process.on('uncaughtException', (err) => {
    console.error('💥 uncaughtException:', err);
    exitChatGPT();
    process.exit(1);
});