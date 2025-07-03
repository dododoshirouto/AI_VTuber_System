const fs = require('fs');
const axios = require('axios');
const path = require('path');
const wav = require('node-wav');
const { spawn } = require('child_process');
const { replay, nextTopic, exit: exitChatGPT } = require('./use_chatgpt');
const { GetYouTubeLiveComments } = require('./use_youtube');

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

var prompt_history = [];
var speak_history = [];
var summary_history = [];

let end_flag = false;

if (require.main === module) {

    (async _ => {
        // 生成ループ
        await launchPythonServer();
        get_bookmarks_json();
        await main();
    })();

    (async _ => {
        // 再生ループ
        while (true) {
            await new Promise(r => setTimeout(r, 1000 / 10));
            if (voice_queue_list.length > 0 && Date.now() > last_wav_start_time + last_wav_duration + voice_buffer_time_ms) {
                save_wav_and_json();
            }
            if (voice_queue_list.length == 0 && Date.now() > last_wav_start_time + last_wav_duration + voice_buffer_time_ms) {
                last_wav_duration = 0;
            }
            if (end_flag && Date.now() > last_wav_start_time + last_wav_duration + voice_buffer_time_ms) {
                process.exit();
            }
        }
    })();

    (async () => {
        // コメント取得ループ
        const gylc = new GetYouTubeLiveComments();
        gylc.setCallback(push_comments);
        await gylc.start();
    })();

}

var comment_list = [];
var comment_read_timeout = false;
async function push_comments(comments) {
    comment_list.push(...comments);
    for (const comment of comments) {
        console.log(`[${comment.time}] ${comment.author}: ${comment.text}`);
    }

    if (comment_read_timeout) return;
    comment_read_timeout = true;
    await new Promise(r => setTimeout(r, 15 * 1000));
    comment_read_timeout = false;
    await read_comments();
    await new Promise(r => setTimeout(r, 15 * 1000));
}

async function read_comments() {
    console.log('comment_list', comment_list);
    if (!comment_list.length) return;

    const comments_text = comment_list.map(c => `${c.author}: ${c.text}`).join('\n');
    comment_list = [];

    console.log(`コメントが来たので、これまでの流れを踏まえて、短く1文で答えて\n${comments_text}`);
    const text = await getChatGPTResponseWithRetry("コメントが来たので、これまでの流れを踏まえて答えて\n" + comments_text);
    配信の流れ_割り込み生成();
    const audio_queue = await create_voicevox_wav_and_json(text, null, bookmark);

    // voice_queue_list.unshift(audio_queue);
}

/** @type { { name: string, useBookmark: boolean, prompts: string[] }[] } */
const stream_topics_prompts = [
    {
        name: "配信開始",
        useBookmark: false,
        prompts: [
            `今日はブックマークしたツイートを紹介する配信です。配信開始の雑談をして: ${(new Date()).toLocaleString()}`,
            `今日はブックマークしたツイートを紹介する配信です。配信開始の挨拶をして: ${(new Date()).toLocaleString()}`,
            `今日はブックマークしたツイートを紹介する配信です。季節を踏まえた挨拶雑談をして: ${(new Date()).toLocaleString()}`,
            `今日はブックマークしたツイートを紹介する配信です。最近の日常を交えて挨拶雑談をして: ${(new Date()).toLocaleString()}`,
            `今日はブックマークしたツイートを紹介する配信です。直近のニュースを交えて挨拶雑談をして: ${(new Date()).toLocaleString()}`,
            `今日はブックマークしたツイートを紹介する配信です。最近の面白い話を交えて挨拶雑談をして: ${(new Date()).toLocaleString()}`,
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
            "このツイート内容をまとめて、なぜブックマークしたのか説明して",
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
            "今のツイートをなぜブックマークしたのか説明して",
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

var 配信の流れ = [];
var 配信の流れ_generat_i = 0;
var 配信の流れ_speak_i = 0;

function 配信の流れ_割り込み生成() {
    last_queue = voice_queue_list.filter(v => v.index)[0];
    if (!last_queue) return;

    配信の流れ_generat_i = 配信の流れ_speak_i = last_queue.index || 0 - 1;
    bookmark = last_queue.bookmark || null;
    // if (配信の流れ_generat_i >= 配信の流れ.length) return;
    voice_queue_list = voice_queue_list.filter(v => !v.index);
}

async function main() {
    // 今日紹介するブックマーク
    bookmarks = get_use_bookmarks(Math.ceil(Math.random() * 3 + 2));

    配信の流れ = [
        { topic: "配信開始" },
        ...Array(Math.floor(Math.random() * 2)).fill({ topic: "雑談" }),
        { "gotoNextTopic": true },
        ...Array(bookmarks.length).fill(0).map((_, i) => {
            let topic_prompts = stream_topics_prompts.find(t => t.name === "ツイート読み続き").prompts.sort(() => Math.random() - 0.5);
            return [
                { topic: "ツイート読み始め", bookmark: bookmarks[i] },
                ...Array(Math.ceil(Math.random() * 2)).fill(0).map((_, i) => { return { topic: "ツイート読み続き", bookmark: bookmarks[i], prompt: topic_prompts[i] } }).flat(),
                ...Array(Math.floor(Math.random() * 3)).fill({ topic: "雑談" }),
                { "gotoNextTopic": true }
            ]
        }).flat(),
        { topic: "配信終了" },
    ];

    console.log("配信の流れ", 配信の流れ);

    // 配信の流れ
    // TODO: コメントが来たらリアクションの生成を先にして、その後のセリフも再生成していく
    //          - YouTubeのコメント取得
    //          - リアクション用セリフ生成（非同期）
    //          - 今のセリフの残り再生時間を見て、今か次かにセリフ生成→キュー追加
    //          懸念点：再生成するときにスレッドの会話履歴も前のところからでできひんかなって
    //              → サマリーを保存しといて、それを再利用する。プロンプト量は諦める。
    // TODO: コメントが来たら今生成中のChatGPTをキャンセルする
    // TODO: 配信時間から繰り返し回数を計算する

    // let count = 0;

    // 配信開始の挨拶
    // await speak_topic("配信開始", { bookmarks: bookmarks });

    // count = Math.floor(Math.random() * 2);
    // let topic_prompts = stream_topics_prompts.find(t => t.name === "雑談").prompts.sort(() => Math.random() - 0.5);
    // for (let i = 0; i < count; i++) {
    //     await speak_topic("雑談", { topic_prompt: topic_prompts[i] });
    // }
    // await gotoNextTopic();

    // // ブックマークの紹介
    // for (let i = 0; i < bookmarks.length; i++) {
    //     let count2 = 0;

    //     await speak_topic("ツイート読み始め", { bookmark: bookmarks[i] });

    //     count2 = Math.floor(Math.random() * 2 + 1);
    //     topic_prompts = stream_topics_prompts.find(t => t.name === "ツイート読み続き").prompts.sort(() => Math.random() - 0.5);
    //     for (let j = 0; j < count2; j++) {
    //         await speak_topic("ツイート読み続き", { topic_prompt: topic_prompts[j], bookmark: bookmarks[i] });
    //     }

    //     count2 = Math.floor(Math.random() * 3);
    //     topic_prompts = stream_topics_prompts.find(t => t.name === "雑談").prompts.sort(() => Math.random() - 0.5);
    //     for (let j = 0; j < count2; j++) {
    //         await speak_topic("雑談", { topic_prompt: topic_prompts[j] });
    //     }
    //     await gotoNextTopic();
    // }

    // await speak_topic("配信終了");

    for (配信の流れ_generat_i = 0; 配信の流れ_generat_i < 配信の流れ.length; 配信の流れ_generat_i++) {
        let topic = 配信の流れ[配信の流れ_generat_i];

        if (topic.gotoNextTopic) {
            await gotoNextTopic();
            speak_history.push({ time: new Date().toLocaleString(), text: "gotoNextTopic", index: 配信の流れ_generat_i });
            save_history_jsons();
            continue;
        }

        let topic_prompt = topic.prompt || null;
        bookmark = topic.bookmark || null;

        if (topic.topic == "配信開始") {

        } else if (topic.topic == "ツイート読み始め") {

        } else if (topic.topic == "ツイート読み続き") {

        } else if (topic.topic == "雑談") {

        } else if (topic.topic == "配信終了") {

        }

        await speak_topic(topic.topic, 配信の流れ_generat_i, { topic_prompt, bookmark });

        if (配信の流れ_generat_i == 配信の流れ.length - 1) {
            while (配信の流れ_generat_i == 配信の流れ.length - 1 && !voice_queue_list.length) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }

    await exitChatGPT();
    save_history_jsons();
}

async function gotoNextTopic() {
    let summary = await nextTopic();
    summary_history.push(summary);
    save_history_jsons();
}

let bookmark = null;

async function speak_topic(stream_topic_name, index, { topic_prompt = null, bookmark = null, bookmarks = [] } = {}) {
    console.log(`📣 ${stream_topic_name}`);
    let topic_creating_start_time = Date.now();

    // セリフを生成するためのプロンプトを取得
    topic_prompt = getTopicPrompt(stream_topic_name, topic_prompt);

    if (stream_topic_name.indexOf("ツイート") == -1) {
        bookmark = null;
    }

    if (bookmark && stream_topic_name == "ツイート読み始め") {
        // プロンプトにツイート情報を追加する
        topic_prompt = addBookmarkInfoToPrompt(topic_prompt, bookmark);
        updateBookmarks(bookmark);
        await speakBookmark(bookmark, index);
    }

    // if (bookmarks.length > 0) {
    //     let bookmarks_text = "今から紹介していく予定のブックマーク情報(まだツイート内容にはまだ言及せず、繋がる他の話をして)\n";
    //     bookmarks_text += [...bookmarks.map(b => `${get_before_time_text(b.time)}のツイート\n${b.text.replace(/\n+/g, "\n")}`), ""].join("\n\n---\n\n");
    //     topic_prompt = bookmarks_text + topic_prompt;
    // }

    if (stream_topic_name == "配信終了") {
        topic_prompt += `\n# 今日の内容\n${summary_history.join("\n")}`;
    }

    if (["配信開始"].includes(stream_topic_name) && comment_list.length > 0) {
        const comments_text = comment_list.map(c => `${c.author}: ${c.text}`).join('\n');
        comment_list = [];
        topic_prompt += `今来てるコメント\n${comments_text}`;
    }

    const text = await getChatGPTResponseWithRetry(topic_prompt, index, { imageUrls: bookmark?.medias || [] });

    await speakAndSave(text, index, bookmark || null, stream_topic_name === "配信終了");
    save_history_jsons();
}

function getTopicPrompt(stream_topic_name, topic_prompt) {
    let topic_prompts = stream_topics_prompts.find(t => t.name === stream_topic_name);
    if (!topic_prompt && topic_prompts) {
        topic_prompt = topic_prompts.prompts[Math.floor(Math.random() * topic_prompts.prompts.length)];
    }
    return topic_prompt;
}

function addBookmarkInfoToPrompt(prompt, bookmark) {
    // URL除去など
    bookmark.text = bookmark.text.replace(/https?:\/\/[^\s]+/g, '');
    let result = `${prompt}\n---\n# 投稿日\n${get_before_time_text(bookmark.time)}のツイート\n# 投稿主\n${bookmark.author}\n# ツイート内容\n${bookmark.text}`;
    if (bookmark.medias && bookmark.medias.length) result += `\n# 添付メディア\n${bookmark.medias.join('\n')}`;
    if (bookmark.mediaLinks && bookmark.mediaLinks.length) result += `\n# 添付URL\n${bookmark.mediaLinks.join('\n')}`;
    return result;
}

function updateBookmarks(bookmark) {
    // bookmarks = bookmarks.filter(b => b !== bookmark);
    bookmarks_raw[bookmarks_raw.findIndex(b => b.id === bookmark.id)].used_in_stream = true;
    update_bookmarks_json();
}

async function speakBookmark(bookmark, index) {
    let text = `${bookmark.author}さんのツイートを紹介するわ。\n${bookmark.text}`;
    let audio_queue = await create_voicevox_wav_and_json(text, index, bookmark);
}

var chatGPTQueue = [];
async function getChatGPTResponseWithRetry(prompt, index, { imageUrls = [] } = {}) {
    let text = "";
    let error = false;
    chatGPTQueue.push(prompt);
    if (chatGPTQueue.length > 1) {
        while (chatGPTQueue[0] !== prompt) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    // console.log(`chatGPTQueue`, chatGPTQueue);
    do {
        try {
            text = await replay(prompt, { imageUrls });
            error = false;
        } catch (e) {
            console.log(e);
            console.log(e.error);
            if (e.error?.type == 'server_error') {
                error = true;
                console.log("ChatGPTがサーバーエラーなのでリトライします…");
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                return "";
            }
        }
    } while (error);
    chatGPTQueue = chatGPTQueue.filter(id => id !== prompt);
    let pi = prompt_history.push({
        time: new Date().toLocaleString(),
        prompt, text
    });
    if (imageUrls?.length) {
        prompt_history[pi - 1].imageUrls = imageUrls;
    }
    return text;
}

async function speakAndSave(text, index, bookmark = null, isFinal = false) {
    let audio_queue = await create_voicevox_wav_and_json(text, index, bookmark, isFinal);
}

function getWavDuration(buffer) {
    const result = wav.decode(buffer);
    return result.sampleRate ? result.channelData[0].length / result.sampleRate : 10; // fallback: 10秒
}

var VOICEVOXQueue = [];
async function create_voicevox_wav_and_json(text, index, bookmark = null, isFinal = false) {
    text = text.replace(/https?:\/\/[^\s]+/g, '').trim();
    text = text.replace(/\s+/g, ' ').replace(/([。、．，\.,])\s/g, '$1').trim();
    text = text.replace(/\s*\n+\s*/g, '。');
    text = text.replace(/\s*[）\)」\]｝}・]+\s*/g, '');

    VOICEVOXQueue.push(text);
    if (VOICEVOXQueue.length > 1) {
        while (VOICEVOXQueue[0] !== text) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    // console.log(`VOICEVOXQueue`, VOICEVOXQueue);

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

    // if (voice_queue_list.length == 1 && last_wav_duration == 0) {
    //     last_wav_duration = getWavDuration(wavRes.data);
    // }

    let queue_l = voice_queue_list.push({
        index,
        query_json: {
            text,
            query: audioQuery,
            isFinal: isFinal,
            bookmark
        },
        wav: wavRes.data
    });

    VOICEVOXQueue = VOICEVOXQueue.filter(t => t !== text);

    console.log(`Push AudioQueue: ${voice_queue_list.length}`);

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
    last_wav_start_time = Date.now();
    last_wav_duration = getWavDuration(audio_queue.wav) * 1000;
    end_flag = audio_queue.query_json.isFinal;
    配信の流れ_speak_i = audio_queue.index || 配信の流れ_speak_i;
    console.log(`queue:${voice_queue_list.length} 🎙 speak`, audio_queue.query_json.text);


    let si = speak_history.push({
        time: new Date().toLocaleString(),
        text: audio_queue.query_json.text,
        duration: new Date(getWavDuration(audio_queue.wav) - 9 * 60 * 60 * 1000).toLocaleTimeString(),
        index: audio_queue.index
    });
    if (bookmark) {
        speak_history[si - 1].bookmark = bookmark;
    }
    save_history_jsons();
}

async function launchPythonServer() {
    try {
        // PingしてFastAPIが生きてるか確認
        await axios.get(VV_SERVER_HOST);
        console.log("FastAPIはすでに起動済み");
        return; // 起動済みなので終了
    } catch (e) {
        // console.log(e);
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
    bookmarks = bookmarks.map(b => { b.text?.replace(/https?:\/\/[^\s]+/g, ''); return b; });
    bookmarks = bookmarks.map(b => { b.mediaLinks = b.mediaLinks.filter(l => l.indexOf('https://x.com/hashtag/') === -1); return b; });
    bookmarks = bookmarks.map(b => { b.medias = b.medias.filter(l => l.trim()); return b; });
    bookmarks = bookmarks.sort((a, b) => new Date(b.time) - new Date(a.time));
    return bookmarks;
}

function update_bookmarks_json() {
    fs.writeFileSync(bookmarks_json_path, JSON.stringify(bookmarks_raw, null, 2));
}

function save_history_jsons() {
    fs.writeFileSync("history_speak.json", JSON.stringify(speak_history, null, 2));
    fs.writeFileSync("history_prompt.json", JSON.stringify(prompt_history, null, 2));
    fs.writeFileSync("history_summary.json", JSON.stringify(summary_history, null, 2));
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
    // const before_time_to_text = [
    //     {
    //         time: (24 * 60 * 60 * 1000),
    //         text: "今日"
    //     },
    //     {
    //         time: (24 * 60 * 60 * 1000 * 2),
    //         text: "昨日"
    //     },
    //     {
    //         time: (24 * 60 * 60 * 1000 * 7),
    //         text: "今週"
    //     },
    //     {
    //         time: (24 * 60 * 60 * 1000 * 14),
    //         text: "先週"
    //     },
    //     {
    //         time: (24 * 60 * 60 * 1000 * 30),
    //         text: "今月"
    //     },
    //     {
    //         time: (24 * 60 * 60 * 1000 * 60),
    //         text: "先月"
    //     },
    //     {
    //         time: (24 * 60 * 60 * 1000 * 365),
    //         text: "今年"
    //     },
    //     {
    //         time: (24 * 60 * 60 * 1000 * 365 * 2),
    //         text: "去年"
    //     }
    // ];
    const MS_DAY = 24 * 60 * 60 * 1000;

    let d = new Date();
    let now = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

    const post = new Date(time_iso_txt);

    const diff = now.getTime() - post.getTime();

    if (diff < MS_DAY) return "今日";
    if (diff < MS_DAY * 2) return "昨日";
    if (diff < MS_DAY * 7) return "今週";
    if (diff < MS_DAY * 14) return "先週";

    if (now.getFullYear() === post.getFullYear()) {
        if (now.getMonth() === post.getMonth()) return "今月";
        if (now.getMonth() - 1 === post.getMonth()) return "先月";
        return "今年";
    }

    if (now.getFullYear() - 1 === post.getFullYear()) return "去年";

    return null;
}

// SIGINT（Ctrl+C）
process.on('SIGINT', async () => {
    console.log('🛑 SIGINT (Ctrl+C) を受信しました');
    await exitChatGPT();
    save_history_jsons();
    process.exit(0);
});

// 予期しないエラーでクラッシュしそうなとき
process.on('uncaughtException', async (err) => {
    console.error('💥 uncaughtException:', err);
    await exitChatGPT();
    save_history_jsons();
    process.exit(1);
});

module.exports = { bookmarks_json_path, get_bookmarks_json, get_before_time_text }