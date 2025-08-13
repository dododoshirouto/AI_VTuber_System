const { OpenAI } = require("openai");
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function delete_file(id) {
    try {
        await openai.files.delete(id);
        console.log(`🗑️ OpenAIファイル削除: ${id}`);
    } catch (e) {
        console.warn(`⚠️ OpenAIファイル削除失敗: ${id}`, e.message);
    }
}

async function get_all_files(limit = 100) {
    const files = await openai.files.list({ limit });
    return files.data.map(file => file.id);
}



async function delete_all_files() {
    const files = await get_all_files();
    await Promise.all(files.map(id => delete_file(id)));
}




(async _ => {
    if (require.main !== module) return;

    delete_all_files();
})()