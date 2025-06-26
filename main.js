const fs = require('fs');
const axios = require('axios');
const path = require('path');
const wav = require('node-wav');
const { spawn } = require('child_process');
const { replay, nextTopic, exit: exitChatGPT } = require('./use_chatgpt');

const VV_SERVER_HOST = "http://127.0.0.1:50021/";

const bookmarks_json_path = path.join(__dirname, 'read_bookmark/bookmarks.json');
var bookmarks = [];
var bookmarks_raw = [];

/**
 * @type { { query_json: { text:string, query:AudioQuery, isFinal:boolean, bookmark:object}, wav: NodeJS.ArrayBufferView }[] }
 */
var voice_queue_list = [];
let last_wav_start_time = 0;
let last_wav_duration = 0;
const voice_buffer_time_ms = 800;

let end_flag = false;

(async _ => {
    // 生成ループ
    await launchPythonServer();
    get_bookmarks_json();

    await main();
})();

(async _ => {
    // 再生ループ
    while (true) {
        await new Promise(r => setTimeout(r, 1000 / 60));
        if (voice_queue_list.length > 0 && Date.now() > last_wav_start_time + last_wav_duration + voice_buffer_time_ms) {
            last_wav_start_time = Date.now();
            let queue = voice_queue_list[0];
            last_wav_duration = getWavDuration(queue.wav) * 1000;
            end_flag = queue.query_json.isFinal;
            console.log(`queue:${voice_queue_list.length} 🎙 speak`, queue.query_json.text);
            save_wav_and_json();
        }
        if (end_flag && Date.now() > last_wav_start_time + last_wav_duration + voice_buffer_time_ms) {
            process.exit();
        }
    }

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
    // 今日紹介するブクマ
    bookmarks = get_use_bookmarks(Math.floor(Math.random() * 3 + 2));

    // 配信の流れ
    // TODO: コメントが来たらリアクションの生成を先にして、その後のセリフも再生成していく
    //          - YouTubeのコメント取得
    //          - リアクション用セリフ生成（非同期）
    //          - 今のセリフの残り再生時間を見て、今か次かにセリフ生成→キュー追加
    //          懸念点：再生成するときにスレッドの会話履歴も前のところからでできひんかなって
    //              → サマリーを保存しといて、それを再利用する。プロンプト量は諦める。
    // TODO: メディアつきツイートの画像/動画もChatGPTに送信する → 生成後ストレージから削除もする
    // TODO: 配信時間から繰り返し回数を計算する

    let count = 0;

    // 配信開始の挨拶
    await speak_topic("配信開始", { bookmarks: bookmarks });

    count = Math.floor(Math.random() * 3);
    let topic_prompts = stream_topics_prompts.find(t => t.name === "雑談").prompts.sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
        await speak_topic("雑談", { topic_prompt: topic_prompts[i] });
    }
    await nextTopic();

    // ブクマの紹介
    for (let i = 0; i < bookmarks.length; i++) {
        let count2 = 0;

        await speak_topic("ツイート読み始め", { bookmark: bookmarks[i] });
        count2 = Math.floor(Math.random() * 2 + 1);
        topic_prompts = stream_topics_prompts.find(t => t.name === "ツイート読み続き").prompts.sort(() => Math.random() - 0.5);
        for (let j = 0; j < count2; j++) {
            await speak_topic("ツイート読み続き", { topic_prompt: topic_prompts[j] });
        }

        count2 = Math.floor(Math.random() * 3);
        topic_prompts = stream_topics_prompts.find(t => t.name === "雑談").prompts.sort(() => Math.random() - 0.5);
        for (let j = 0; j < count2; j++) {
            await speak_topic("雑談", { topic_prompt: topic_prompts[j] });
        }
        await nextTopic();
    }

    await speak_topic("配信終了");

    exitChatGPT();
}

let bookmark = null;

async function speak_topic(stream_topic_name, { topic_prompt = null, bookmark = null, bookmarks = [] } = {}) {
    console.log(`📣 ${stream_topic_name}`);
    let topic_creating_start_time = Date.now();

    // セリフを生成するためのプロンプトを取得
    topic_prompt = getTopicPrompt(stream_topic_name, topic_prompt);

    if (stream_topic_name.indexOf("ツイート") == -1) {
        bookmark = null;
    }

    if (bookmark || UNUSE_shouldUseBookmark(stream_topic_name)) {
        bookmark = bookmark || UNUSE_pickBookmark();
        if (bookmark) {
            // プロンプトにツイート情報を追加する
            topic_prompt = addBookmarkInfoToPrompt(topic_prompt, bookmark);
            updateBookmarks(bookmark);
            await speakBookmark(bookmark);
        }
    }

    if (bookmarks.length > 0) {
        let bookmarks_text = "今日紹介するツイート一覧(直接言及はせず、繋がる雑談をして)\n";
        bookmarks_text += [...bookmarks.map(b => `${get_before_time_text(b.time)}のツイート\n${b.author}\n${b.text}`), ""].join("\n\n---\n\n");
        topic_prompt = bookmarks_text + topic_prompt;
    }

    const text = await getChatGPTResponseWithRetry(topic_prompt);
    await speakAndSave(text, bookmark || null, stream_topic_name === "配信終了");
}

function getTopicPrompt(stream_topic_name, topic_prompt) {
    let topic_prompts = stream_topics_prompts.find(t => t.name === stream_topic_name);
    if (!topic_prompt && topic_prompts) {
        topic_prompt = topic_prompts.prompts[Math.floor(Math.random() * topic_prompts.prompts.length)];
    }
    return topic_prompt;
}

function UNUSE_shouldUseBookmark(stream_topic_name) {
    let topic_prompts = stream_topics_prompts.find(t => t.name === stream_topic_name);
    return topic_prompts?.useBookmark;
}

function UNUSE_pickBookmark() {
    if (bookmarks.length === 0) return null;
    return bookmarks[Math.floor(Math.random() * bookmarks.length)];
}

function addBookmarkInfoToPrompt(prompt, bookmark) {
    // URL除去など
    bookmark.text = bookmark.text.replace(/https?:\/\/[^\s]+/g, '');
    let result = `${prompt}\n---\n# ブックマークした日\n${get_before_time_text(bookmark.time)}\n# ツイート主\n${bookmark.author}\n# ツイート内容\n${bookmark.text}`;
    if (bookmark.medias && bookmark.medias.length) result += `\n# 添付メディア\n${bookmark.medias.join('\n')}`;
    if (bookmark.mediaLinks && bookmark.mediaLinks.length) result += `\n# 添付URL\n${bookmark.mediaLinks.join('\n')}`;
    return result;
}

function updateBookmarks(bookmark) {
    bookmarks = bookmarks.filter(b => b !== bookmark);
    bookmarks_raw[bookmarks_raw.findIndex(b => b.id === bookmark.id)].used_in_stream = true;
    update_bookmarks_json();
}

async function speakBookmark(bookmark) {
    let text = `${bookmark.author}さんのツイートを紹介するわ。\n${bookmark.text}`;
    let audio_queue = await create_voicevox_wav_and_json(text, bookmark);
}

async function getChatGPTResponseWithRetry(prompt) {
    let text = "";
    let error = false;
    do {
        try {
            text = await replay(prompt);
            error = false;
        } catch (e) {
            console.log(e);
            console.log(e.error);
            if (e.error?.type == 'server_error') {
                error = true;
                console.log("ChatGPTがサーバーエラーなのでリトライします…");
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                throw e;
            }
        }
    } while (error);
    return text;
}

async function speakAndSave(text, bookmark = null, isFinal = false) {
    let audio_queue = await create_voicevox_wav_and_json(text, bookmark, isFinal);
}

function getWavDuration(buffer) {
    const result = wav.decode(buffer);
    return result.sampleRate ? result.channelData[0].length / result.sampleRate : 10; // fallback: 10秒
}

async function create_voicevox_wav_and_json(text, bookmark = null, isFinal = false) {
    text = text.replace(/https?:\/\/[^\s]+/g, '').trim();
    text = text.replace(/\s+/g, ' ').replace(/([。、．，\.,])\s/g, '$1').trim();
    text = text.replace(/\s*\n+\s*/g, '。');
    text = text.replace(/\s*[）\)」\]｝}・]+\s*/g, '');

    // AudioQuery を取得
    const queryRes = await axios.get(VV_SERVER_HOST + "query", {
        params: { text }
    });
    const audioQuery = JSON.parse(queryRes.data);

    // 音声ファイルを取得して保存
    let wavRes = await axios.post(VV_SERVER_HOST + "speak_from_query", audioQuery, {
        headers: { 'Content-Type': 'application/json' },
        responseType: "arraybuffer",
        validateStatus: function (...status) {
            console.log("status: ", status);
            return true;
        }
    });

    let queue_l = voice_queue_list.push({
        query_json: {
            text,
            query: audioQuery,
            isFinal: isFinal,
            bookmark
        },
        wav: wavRes.data
    });

    console.log(`Push AudioQueue: ${voice_queue_list.length}`);
    if (voice_queue_list.length == 1) {
        last_wav_duration = getWavDuration(wavRes.data) * 1000;
    }

    return voice_queue_list[queue_l - 1];
}

/**
 * 
 * @param {{ wav: NodeJS.ArrayBufferView, query_json: {text: string, query: AudioQuery, isFinal: boolean, bookmark: object} }} audio_queue 
 */
function save_wav_and_json(audio_queue = null) {
    audio_queue = voice_queue_list.shift();
    console.log(`Shift AudioQueue: ${voice_queue_list.length}`);
    const wavPath = path.join(__dirname, "public", "chara", "voice.wav");
    fs.writeFileSync(wavPath, audio_queue.wav);
    // fs.unlinkSync("out.wav");

    fs.writeFileSync("public/chara/current.json", JSON.stringify(audio_queue.query_json, null, 2));
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

function get_bookmarks_json() {
    const jsonText = fs.readFileSync(bookmarks_json_path, 'utf-8');
    bookmarks_raw = JSON.parse(jsonText);
    bookmarks = bookmarks_raw.filter(b => !('used_in_stream' in b) || b.used_in_stream === false);
    bookmarks = bookmarks.filter(b => b.text).filter(b => b.text.length > 100);
    bookmarks = bookmarks.sort((a, b) => new Date(b.time) - new Date(a.time));
}

function update_bookmarks_json() {
    fs.writeFileSync(bookmarks_json_path, JSON.stringify(bookmarks_raw, null, 2));
}

function get_use_bookmarks(count = 3, shuffle_count = 10) {
    let bookmarks = bookmarks_raw.filter(b => !('used_in_stream' in b) || b.used_in_stream === false);
    bookmarks = bookmarks.filter(b => b.text).filter(b => b.text.length > 100);
    for (i = 0; i < shuffle_count; i++) {
        bookmarks = bookmarks.sort(() => Math.random() - 0.5);
    }
    return bookmarks.slice(0, count);
}

function get_before_time_text(time_iso_txt) {
    const before_time_to_text = [
        {
            time: (24 * 60 * 60 * 1000),
            text: "今日"
        },
        {
            time: (24 * 60 * 60 * 1000 * 2),
            text: "昨日"
        },
        {
            time: (24 * 60 * 60 * 1000 * 7),
            text: "今週"
        },
        {
            time: (24 * 60 * 60 * 1000 * 14),
            text: "先週"
        },
        {
            time: (24 * 60 * 60 * 1000 * 30),
            text: "今月"
        },
        {
            time: (24 * 60 * 60 * 1000 * 60),
            text: "先月"
        },
        {
            time: (24 * 60 * 60 * 1000 * 365),
            text: "今年"
        },
        {
            time: (24 * 60 * 60 * 1000 * 365 * 2),
            text: "去年"
        }
    ]
    let post_time = new Date(time_iso_txt).getTime();
    let now = new Date().getTime();
    for (let i = 0; i < before_time_to_text.length; i++) {
        let before_time = now - before_time_to_text[i].time;
        if (post_time < before_time) {
            return before_time_to_text[i].text;
        }
    }
    return null;
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