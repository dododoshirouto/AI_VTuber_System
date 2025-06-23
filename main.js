const fs = require('fs');
const axios = require('axios');
const path = require('path');
const { spawn } = require('child_process');
const { replay, nextTopic } = require('./use_chatgpt');

const VV_SERVER_HOST = "http://127.0.0.1:50021/";

const bookmarks_json_path = path.join(__dirname, 'read_bookmark/bookmarks.json');
var bookmarks = [];

(async _ => {
    await launchPythonServer();
    await get_bookmarks();

    // let count = 0;
    // while (true) {
    //     post.text = await replay(post.text);
    //     await create_voicevox_wav_and_json(post.text);
    //     if (count++ > 5) await nextTopic();
    //     await new Promise(r => setTimeout(r, 60 * 1000));
    // }

    await main();
})();

/** @type { { name: string, useBookmark: boolean, prompts: string[] }[] } */
const stream_topics_prompts = [
    {
        name: "配信開始",
        useBookmark: false,
        prompts: [
            "配信開始の雑談",
            "配信開始の挨拶",
            `季節の挨拶: ${(new Date()).toLocaleDateString()}`,
        ]
    },
    {
        name: "雑談",
        useBookmark: false,
        prompts: [
            "配信の途中の雑談",
            `季節の雑談: ${(new Date()).toLocaleDateString()}`,
            "日常の雑談",
            "ニューストピックの雑談",
        ]
    },
    {
        name: "ツイート読み始め",
        useBookmark: true,
        prompts: [
            "このツイート内容についてコメント",
            "自分の考えや知識と絡めたこのツイート内容についてコメント",
        ]
    },
    {
        name: "ツイート読み続き",
        useBookmark: false,
        prompts: [
            "さっきのツイート内容についてコメント",
            "さっきのツイート内容について自分の考えや知識と絡めたコメント",
        ]
    },
    {
        name: "配信終了",
        useBookmark: false,
        prompts: [
            "配信終了の雑談",
            "配信終了の挨拶",
            "今日の内容を踏まえた配信終了の雑談",
            "日常の雑談を交えて配信終了の雑談",
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
    for (let i = 0; i < count; i++) {
        await create_topic_serif("雑談");
    }
    await nextTopic();

    // ブクマの紹介
    count = Math.floor(Math.random() * 3 + 1);
    for (let i = 0; i < count; i++) {
        let count2 = 0;
        await create_topic_serif("ツイート読み始め");
        count2 = Math.floor(Math.random() * 3 + 1);
        for (let j = 0; j < count2; j++) {
            await create_topic_serif("ツイート読み続き");
        }

        count2 = Math.floor(Math.random() * 3);
        for (let j = 0; j < count2; j++) {
            await create_topic_serif("雑談");
        }
        await nextTopic();
    }

    // 配信終了の挨拶
    Array(Math.floor(Math.random() * 3 + 1)).fill(0).forEach(async _ => await create_topic_serif("配信終了"));

    Array(Math.floor(Math.random() * 3)).fill(0).forEach(async _ => await create_topic_serif("雑談"));
    await nextTopic();
}

async function create_topic_serif(stream_topic_name) {
    console.log(`📣 ${stream_topic_name}`);
    let topic_prompts = stream_topics_prompts.find(t => t.name === stream_topic_name);
    if (!topic_prompts) return null;

    const prompt = topic_prompts.prompts[Math.floor(Math.random() * topic_prompts.prompts.length)];
    // return await replay(prompt);

    if (topic_prompts.useBookmark) {
        // TODO: 過去に配信で使ってないブクマを順番に使用するようにする
        const bookmark = bookmarks[Math.floor(Math.random() * bookmarks.length)];
        if (bookmark) prompt += "\n---\n# ツイート主\n" + bookmark.author + "\n# ツイート内容\n" + bookmark.text;
    }

    let text = await replay(prompt);
    await create_voicevox_wav_and_json(text);
}

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

async function get_bookmarks() {
    const jsonText = fs.readFileSync(bookmarks_json_path, 'utf-8');
    bookmarks = JSON.parse(jsonText);
}