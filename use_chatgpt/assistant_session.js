// https://platform.openai.com/docs/api-reference/runs/createRun
// https://platform.openai.com/docs/pricing

class AssistantSession {
    static assistantId = "asst_xxxxxxxxx";
    static setAssistantId(id) {
        this.assistantId = id;
    }

    static costTable = {
        "gpt-3.5-turbo": { input: 0.0015 / 1000, output: 0.002 / 1000 },
        "gpt-4o": { input: 2.50 / 1e6, output: 10.00 / 1e6 },
        "gpt-4o-mini": { input: 0.15 / 1e6, output: 0.60 / 1e6 },
        "o4-mini": { input: 1.10 / 1e6, output: 4.40 / 1e6 },
    };
    static yenRate = 145;
    static model = "gpt-4o-mini";

    constructor(openai, summary = null) {
        this.openai = openai;
        this.threadId = null;
        this.totalToken = 0;
        this.totalYen = 0;
        // this._init(summary);
    }

    async init(summary = null) {
        const thread = await this.openai.beta.threads.create();
        this.threadId = thread.id;

        if (summary) {
            await this.openai.beta.threads.messages.create(this.threadId, {
                role: "system",
                content: `前回のスレッドの要約: ${summary}`
            });
        }
    }

    async prompt(userText) {
        // ユーザー発言登録
        await this.openai.beta.threads.messages.create(this.threadId, {
            role: "user",
            content: userText
        });

        // Run実行
        const run = await this.openai.beta.threads.runs.create(this.threadId, {
            assistant_id: AssistantSession.assistantId
        });
        AssistantSession.model = run.model;
        console.log(`Use Model: ${run.model}`);

        const [reply, replayed_run] = await this._waitForRun(run.id);
        this._logUsage(replayed_run);

        return reply;
    }

    async createSummary() {
        await this.prompt("これまでの会話を200文字以内で要約して");
        const messages = await this.openai.beta.threads.messages.list(this.threadId);
        const latest = messages.data.find(msg => msg.role === "assistant");
        return latest?.content?.[0]?.text?.value || "";
    }

    close() {
        this.threadId = null;
        console.log(`🧾 合計使用: ${this.totalToken} tokens ≒ ${this.totalYen.toFixed(2)} 円`);
    }

    async _waitForRun(runId) {
        let status = "queued";
        let run = null;
        while (status !== "completed") {
            console.log(`⌛ Run status: ${status}, threadId: ${this.threadId}, runId: ${runId}`);
            // const run = await this.openai.beta.threads.runs.retrieve(this.threadId, runId);
            run = await this.openai.beta.threads.runs.retrieve(runId, { thread_id: this.threadId });
            status = run.status;
            if (status === "failed" || status === "cancelled") throw new Error(`Run failed: ${status}`);
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

        console.log(`🧾 使用トークン: 入力 ${inputTokens}, 出力 ${outputTokens}`);
        console.log(`💸 コスト: ${costYen.toFixed(2)} 円`);
    }
}

module.exports = { AssistantSession };