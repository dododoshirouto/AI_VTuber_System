// https://platform.openai.com/docs/api-reference/runs/createRun
// https://platform.openai.com/docs/pricing
// https://platform.openai.com/playground/assistants?assistant=asst_x3KTapnMhzn0sHsxaZ0H671T&mode=assistant

var totalYen = 0;

globalThis.File = require('node:buffer').File;

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class AssistantSession {
    static assistantId = "asst_xxxxxxxxx";
    static setAssistantId(id) {
        this.assistantId = id;
    }

    // https://platform.openai.com/docs/pricing
    static costTable = {
        "gpt-5": { input: 1.25 / 1e6, output: 10.00 / 1e6 },
        "gpt-5-mini": { input: 0.25 / 1e6, output: 2.00 / 1e6 },
        "gpt-5-nano": { input: 0.05 / 1e6, output: 0.40 / 1e6 },
        "gpt-5-chat-latest": { input: 1.25 / 1e6, output: 10.00 / 1e6 },
        "gpt-4.1": { input: 2.00 / 1e6, output: 8.00 / 1e6 },
        "gpt-4.1-mini": { input: 0.40 / 1e6, output: 1.60 / 1e6 },
        "gpt-4.1-nano": { input: 0.10 / 1e6, output: 0.40 / 1e6 },
        "gpt-4o": { input: 2.50 / 1e6, output: 10.00 / 1e6 },
        "gpt-4o-2024-05-13": { input: 5.00 / 1e6, output: 15.00 / 1e6 },
        "gpt-4o-audio-preview": { input: 2.50 / 1e6, output: 10.00 / 1e6 },
        "gpt-4o-realtime-preview": { input: 5.00 / 1e6, output: 20.00 / 1e6 },
        "gpt-4o-mini": { input: 0.15 / 1e6, output: 0.60 / 1e6 },
        "gpt-4o-mini-audio-preview": { input: 0.15 / 1e6, output: 0.60 / 1e6 },
        "gpt-4o-mini-realtime-preview": { input: 0.60 / 1e6, output: 2.40 / 1e6 },
        "o1": { input: 15.00 / 1e6, output: 60.00 / 1e6 },
        "o1-pro": { input: 150.00 / 1e6, output: 600.00 / 1e6 },
        "o3-pro": { input: 20.00 / 1e6, output: 80.00 / 1e6 },
        "o3": { input: 2.00 / 1e6, output: 8.00 / 1e6 },
        "o3-deep-research": { input: 10.00 / 1e6, output: 40.00 / 1e6 },
        "o4-mini": { input: 1.10 / 1e6, output: 4.40 / 1e6 },
        "o4-mini-deep-research": { input: 2.00 / 1e6, output: 8.00 / 1e6 },
        "o3-mini": { input: 1.10 / 1e6, output: 4.40 / 1e6 },
        "o1-mini": { input: 1.10 / 1e6, output: 4.40 / 1e6 },
        // Legacy models
        "chatgpt-4o-latest": { input: 5.00 / 1e6, output: 15.00 / 1e6 },
        "gpt-4-turbo-2024-04-09": { input: 10.00 / 1e6, output: 30.00 / 1e6 },
        "gpt-4-0125-preview": { input: 10.00 / 1e6, output: 30.00 / 1e6 },
        "gpt-4-1106-preview": { input: 10.00 / 1e6, output: 30.00 / 1e6 },
        "gpt-4-1106-vision-preview": { input: 10.00 / 1e6, output: 30.00 / 1e6 },
        "gpt-4-0613": { input: 30.00 / 1e6, output: 60.00 / 1e6 },
        "gpt-4-0314": { input: 30.00 / 1e6, output: 60.00 / 1e6 },
        "gpt-4-32k": { input: 60.00 / 1e6, output: 120.00 / 1e6 },
        "gpt-3.5-turbo": { input: 0.50 / 1e6, output: 1.50 / 1e6 },
        "gpt-3.5-turbo-0125": { input: 0.50 / 1e6, output: 1.50 / 1e6 },
        "gpt-3.5-turbo-1106": { input: 1.00 / 1e6, output: 2.00 / 1e6 },
        "gpt-3.5-turbo-0613": { input: 1.50 / 1e6, output: 2.00 / 1e6 },
        "gpt-3.5-0301": { input: 1.50 / 1e6, output: 2.00 / 1e6 },
        "gpt-3.5-turbo-instruct": { input: 1.50 / 1e6, output: 2.00 / 1e6 },
        "gpt-3.5-turbo-16k-0613": { input: 3.00 / 1e6, output: 4.00 / 1e6 },
        "davinci-002": { input: 2.00 / 1e6, output: 2.00 / 1e6 },
        "babbage-002": { input: 0.40 / 1e6, output: 0.40 / 1e6 },
    };
    static yenRate = 145;
    static model = "gpt-4o-mini";
    static summaryText = null;

    constructor(openai) {
        this.openai = openai;
        this.threadId = null;
        this.totalToken = 0;
        this.totalYen = 0;
        this.usedFileIds = [];
        this.run = null;
        // this._init(summary);
    }

    async init() {
        const thread = await this.openai.beta.threads.create();
        this.threadId = thread.id;

        await this.cancelActiveRuns(this.threadId);

        if (AssistantSession.summaryText?.trim()) {
            await this.openai.beta.threads.messages.create(this.threadId, {
                role: "assistant",
                content: `これまでの流れ: ${AssistantSession.summaryText}`
            });
        }
        console.log(`これまでの流れ: ${AssistantSession.summaryText}`);
    }

    async prompt(userText, { imageUrls = [] } = {}) {
        if (!this.threadId) await this.init();

        const content = [
            { role: "user", content: [{ type: "text", text: userText }] }
        ];

        let doenloaded_images = [];
        let uploaded_images_id = [];

        if (imageUrls.length > 0) {
            let upload_properties = [];
            for (let imageUrl of imageUrls) {
                imageUrl = imageUrl.replace(/(\?|&)name=[^&]+(&|$)/, "$1name=small$2");
                let filepath = await downloadImage(imageUrl);
                if (filepath == null) continue;
                // console.log(filepath);
                upload_properties.push({
                    file: fs.createReadStream(filepath),
                    purpose: "assistants"
                });
                doenloaded_images.push(filepath);
            }
            const responses = await Promise.all(upload_properties.map(async (upload_property) => {
                let res = null;
                try {
                    res = await this.openai.files.create(upload_property);
                } catch (e) {
                    console.log(`image upload error: ${e}`);
                }
                return res;
            }));
            uploaded_images_id.push(...responses.map(res => res.id));
            this.usedFileIds.push(...uploaded_images_id);

            for (let filepath of doenloaded_images) {
                try {
                    fs.unlinkSync(filepath);
                } catch (e) {
                    console.log(e);
                }
            }

            content[0].content.unshift(...uploaded_images_id.map(id => {
                return { 'type': 'image_file', 'image_file': { 'file_id': id } }
            }))
        }

        // 他のRun実行中待機
        while (this.run) {
            await new Promise(r => setTimeout(r, 500));
        }

        // ユーザー発言登録
        let flag = false;
        while (!flag) {
            try {
                await this.openai.beta.threads.messages.create(this.threadId, content[0]);
                flag = true;
            } catch (e) {
                console.log(e);
                await new Promise(r => setTimeout(r, 500));
            }
        }

        console.log(`👤 ${userText} ${imageUrls}`);

        // Run実行
        this.run = await this.openai.beta.threads.runs.create(this.threadId, {
            assistant_id: AssistantSession.assistantId
        });
        AssistantSession.model = this.run.model;
        console.log(`Use Model: ${this.run.model}`);

        const [reply, replayed_run] = await this._waitForRun(this.run.id);
        this.run = null;
        this._logUsage(replayed_run);

        return reply;
    }

    async createSummary() {
        await this.prompt("これまでの会話を200文字以内で要約して");
        const messages = await this.openai.beta.threads.messages.list(this.threadId);
        const latest = messages.data.find(msg => msg.role === "assistant");
        return latest?.content?.[0]?.text?.value || "";
    }

    async close() {
        this.threadId = null;
        console.log(`🧾 合計使用: ${this.totalToken} tokens ≒ ${this.totalYen.toFixed(2)} 円`);
        if (this.usedFileIds.length > 0) {
            await Promise.all(this.usedFileIds.map(id => {
                try {
                    this.openai.files.delete(id);
                    console.log(`🗑️ OpenAIファイル削除: ${id}`);
                } catch (e) {
                    console.warn(`⚠️ OpenAIファイル削除失敗: ${id}`, e.message);
                }
            }));
            this.usedFileIds = [];
        }
    }

    async _waitForRun(runId) {
        let status = "queued";
        let run = null;
        while (status !== "completed") {
            console.log(`⌛ Run status: ${status}, threadId: ${this.threadId}, runId: ${runId}`);
            // const run = await this.openai.beta.threads.runs.retrieve(this.threadId, runId);
            run = await this.openai.beta.threads.runs.retrieve(runId, { thread_id: this.threadId });
            status = run.status;
            if (status === "failed" || status === "cancelled") {
                for (let i = 0; i < 10; i++) {
                    console.log(`retray run chatgpt ${run}`);
                    await new Promise(r => setTimeout(r, 500));
                    run = await this.openai.beta.threads.runs.retrieve(runId, { thread_id: this.threadId });
                    if (run.status !== "failed" && run.status !== "cancelled") break;
                }
                if (status === "failed" || status === "cancelled") throw new Error(`Run failed: ${status}`);
            }
            if (status !== "completed") await new Promise(r => setTimeout(r, 500));
        }

        const messages = await this.openai.beta.threads.messages.list(this.threadId);
        const latest = messages.data.find(msg => msg.role === "assistant");
        let replay = latest?.content?.[0]?.text?.value || "";
        return [replay, run];
    }

    _logUsage(run) {
        const model = AssistantSession.model;
        const rate = AssistantSession.yenRate;
        const costPerToken = AssistantSession.costTable[model];

        const usage = run.usage;

        const inputTokens = usage.prompt_tokens || 0;
        const outputTokens = usage.completion_tokens || 0;

        const costUSD =
            inputTokens * costPerToken.input +
            outputTokens * costPerToken.output;

        const costYen = costUSD * rate;
        const totalTokens = inputTokens + outputTokens;

        this.totalToken += totalTokens;
        this.totalYen += costYen;
        totalYen += costYen;

        console.log(`🧾 使用トークン: 入力 ${inputTokens}, 出力 ${outputTokens}`);
        console.log(`💸 コスト: ${costYen.toFixed(2)} 円`);
    }



    async cancelActiveRuns(threadId) {
        const runs = await this.openai.beta.threads.runs.list(threadId);
        const activeRun = runs.data.find(r => !["completed", "failed", "cancelled", "expired"].includes(r.status));

        if (activeRun) {
            console.log(`⛔ アクティブなRunをキャンセル: ${activeRun.id}`);
            await this.openai.beta.threads.runs.cancel(threadId, activeRun.id);
        } else {
            console.log("✅ アクティブなRunは存在しません");
        }
    }
}

async function downloadImage(url, folder = 'tmp') {
    let urlObj = new URL(url);
    let saveFilename = path.basename(urlObj.pathname); // ex: 'ABC123.jpg'
    if (!/\.(mp4|webm)$/i.test(saveFilename)) return null;
    if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(saveFilename)) {
        // fallback: 拡張子が無ければ `.jpg` を強制的に足す（最悪対応）
        const ext = urlObj.searchParams.get('format') || 'jpg';
        saveFilename += '.' + ext;
    }

    console.log(`Downloading image: ${url}`);
    const response = await axios.get(url, { responseType: 'stream' });
    const writer = fs.createWriteStream(path.join(__dirname, folder, saveFilename));
    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
    return path.join(__dirname, folder, saveFilename);
}

function getTotalYen() {
    return totalYen;
}

module.exports = { AssistantSession, getTotalYen };