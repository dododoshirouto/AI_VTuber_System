const { OpenAI } = require("openai");
const path = require('path');
const { AssistantSession, getTotalYen } = require("./assistant_session");
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const SETTINGS = require('../settings');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// let totalYen = 0;



const session = new AssistantSession(openai);
AssistantSession.setAssistantId(SETTINGS.chatgpt_assistant_id);

async function init() {
    await session.init();
}

async function replay(prompt = "指示:配信開始→雑談", { imageUrls = [] } = {}) {
    if (!prompt?.trim()) return;
    if (!session.threadId?.trim()) await session.init();
    let replay = await session.prompt(prompt, { imageUrls });
    console.log(replay);
    return replay;
}

async function nextTopic() {
    AssistantSession.summaryText = await session.createSummary();
    session.close();
    return AssistantSession.summaryText;
}

async function exit() {
    console.log(`🧾 合計使用: ${getTotalYen().toFixed(2)} 円`);
    await session.close();
}

(async () => {
    await init();
    // await replay();
    // await nextTopic();
})();

module.exports = { replay, nextTopic, exit };



/*

const system_prompt = `あなたはVTuber「四国めたん」です。
- 丁寧で可愛らしい口調。語尾は「〜だわ」「〜よね」など
- ユーザーのXブクマに対して、短く面白いコメントを返す
- 絶対に人を傷つけるような発言はしない
- 1ツイートに対する返答は1〜2文に限定`;

async function chatWithGPT(prompt) {
    // const response = await openai.chat.completions.create({
    //     // model: "gpt-4o",
    //     model: "gpt-3.5-turbo", // または "gpt-4o"
    //     messages: [
    //         { role: "system", content: system_prompt },
    //         { role: "user", content: prompt },
    //     ],
    //     temperature: 0.8,
    // });

    const response = await openai.responses.create({
        prompt: {
            "id": "pmpt_6855927063c08196bb03247e297e43f70d31bb1112ea0e82",
            "version": "4"
        },
        input: [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": prompt
                    }
                ]
            }
        ],
        reasoning: {},
        store: true
    });

    console.log(response);

    const usage = response.usage;
    const costUSD =
        usage.input_tokens * COST_PER_TOKEN[MODEL].input +
        usage.output_tokens * COST_PER_TOKEN[MODEL].output;
    const costYen = costUSD * YEN_RATE;

    totalYen += costYen;

    console.log(`🧾 使用トークン: 入力 ${usage.input_tokens} / 出力 ${usage.output_tokens}`);
    console.log(`💸 今回のコスト: ${costYen.toFixed(2)}円`);
    console.log(`📊 累積コスト: ${totalYen.toFixed(2)}円`);

    return response.output_text;
}
    //*/