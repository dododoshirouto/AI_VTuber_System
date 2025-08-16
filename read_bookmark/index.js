log = (...mes) => { console.log(new Date().toLocaleTimeString(), ...mes); }
const { launchBrowserAndLogin, fetchTweetsByScroll } = require('./puppeteer_helper');
const { loadBookmarks, saveBookmarks } = require('./bookmark_storage');

(async () => {
    const { browser, page } = await launchBrowserAndLogin();

    if (!browser || !page) {
        log('...ログイン処理に失敗したみたいね。プログラムを終了するわ。');
        return; // ここで処理を打ち切る！
    }

    const existing = loadBookmarks();
    const existingIds = new Set(existing.map(b => b.id));


    try {
        const newTweets = await fetchTweetsByScroll(page, existingIds, 10); // ← scrollLimit
        const allTweets = [...existing, ...newTweets];

        saveBookmarks(allTweets);

        log(`✅ ${newTweets.length}件の新しいブクマを追加しました`);
        log(`📁 総計：${allTweets.length}件を保存しました`);
    } catch (error) {
        log('📜 メイン処理でエラーが発生:', error.message);
    } finally {
        // finallyブロックなら、エラーがあってもなくても必ず実行されるわ
        log('...処理を終了し、ブラウザを閉じるわね。');
        if (browser) {
            browser.removeAllListeners('disconnected');
            await browser.close();
        }
    }

    await browser.close();

    process.exit(0);
})();
