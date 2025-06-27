const { bookmarks_json_path, get_bookmarks_json, get_before_time_text } = require('./main.js');
const { replay, exit: exitChatGPT } = require('./use_chatgpt');

(async _ => {
    console.log(get_before_time_text(new Date(2025, 6 - 1, 27, 0, 0, 0).toISOString()));
})()