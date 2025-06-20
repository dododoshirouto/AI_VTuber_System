const { OpenAI } = require("openai");
const { AssistantSession } = require("./assistant_session");
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // ← セキュリティのため.env推奨
});

// const MODEL = "gpt-4o-mini"; // または "gpt-3.5-turbo"
// const YEN_RATE = 145; // ドル円換算

// const COST_PER_TOKEN = {
//     "gpt-3.5-turbo": { input: 0.0015 / 1000, output: 0.002 / 1000 }, // ?
//     "gpt-4o": { input: 2.50 / 1000000, output: 10.00 / 1000000 },
//     "gpt-4o-mini": { input: 0.15 / 1000000, output: 0.60 / 1000000 },
//     "o4-mini": { input: 1.10 / 1000000, output: 4.40 / 1000000 },
// };

let totalYen = 0;



const session = new AssistantSession(openai);
AssistantSession.setAssistantId("asst_x3KTapnMhzn0sHsxaZ0H671T");

async function init() {
    await session.init();
}

async function replay() {
    let replay = await session.prompt("指示:配信開始→雑談");
    console.log(replay);
}

async function nextTopic() {
    session.close();
}

(async () => {
    await init();
    await replay();
    await nextTopic();
})();



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