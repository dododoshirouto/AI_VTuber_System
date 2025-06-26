const { launchBrowserAndLogin, fetchTweetsByScroll } = require('./puppeteer_helper');
const { loadBookmarks, saveBookmarks } = require('./bookmark_storage');

(async () => {
    const { browser, page } = await launchBrowserAndLogin();
    // const page = (await browser.pages())[0];

    const existing = loadBookmarks();
    const existingIds = new Set(existing.map(b => b.id));

    const newTweets = await fetchTweetsByScroll(page, existingIds, 15); // ← scrollLimit
    const allTweets = [...existing, ...newTweets];

    saveBookmarks(allTweets);

    console.log(`✅ ${newTweets.length}件の新しいブクマを追加しました`);
    console.log(`📁 総計：${allTweets.length}件を保存しました`);

    await browser.close();

    process.exit(0);
})();
