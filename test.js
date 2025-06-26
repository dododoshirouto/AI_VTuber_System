const { bookmarks_json_path, get_bookmarks_json } = require('./main.js');
const { replay, exit: exitChatGPT } = require('./use_chatgpt');

(async _ => {
    bookmarks = get_bookmarks_json();

    let bookmark = bookmarks.filter(b => b.medias?.length).sort(() => Math.random() - 0.5)[0];

    console.log(bookmarks_json_path, bookmarks.length, bookmark);

    let res_text = await replay("この画像に短く斜め上なコメントして", { imageUrls: bookmark.medias });

    console.log(res_text);

    await exitChatGPT();
})()