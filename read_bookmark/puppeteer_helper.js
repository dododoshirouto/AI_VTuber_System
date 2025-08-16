const puppeteer = require('puppeteer');
const path = require('path');

log = (...mes) => { console.log(new Date().toLocaleTimeString(), ...mes); }
log(`start puppeter_helper`);

async function launchBrowserAndLogin() {
    log(`start launchBrowserAndLogin`);
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        userDataDir: path.resolve(__dirname, './.puppeteer_profile'),
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: [
            '--disable-gpu', // グラフィックの支援機能を無効化。相性問題に効くわ
            '--no-sandbox'   // セキュリティの砂場を無効化。他のソフトとの衝突を避けるの
        ]
    });

    browser.on('disconnected', () => {
        log('❌ ブラウザが予期せず閉じられたわ！クラッシュした可能性があるわね。');
        log('   プログラムを強制終了します。');
        process.exit(1); // これでプログラムも潔く終了するわ
    });

    let page;
    try {
        page = (await browser.pages())[0] || (await browser.newPage());

        try {
            await page.goto('https://twitter.com/i/bookmarks', {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });
        } catch (error) {
            if (error.message.includes('Navigating frame was detached')) {
                log('...初回ナビゲーションでリダイレクトを検知。監視モードに移行するわ。');
            } else {
                throw error;
            }
        }

        await new Promise(t => setTimeout(t, 1500));

        const isLoginSuccessful = async (targetPage) => {
            try {
                if (targetPage.isClosed() || !targetPage.url().includes('/i/bookmarks')) return false;
                await targetPage.waitForSelector('article[data-testid="tweet"]', { timeout: 3000 });
                return true;
            } catch (e) {
                return false;
            }
        };

        const allPages = await browser.pages();
        let found = false;
        for (const p of allPages.reverse()) {
            if (await isLoginSuccessful(p)) {
                page = p;
                found = true;
                break;
            }
        }

        if (found) {
            log('✅ ログイン済み、かつページの表示を確認したわ。');
        } else {
            log('📌 ログインが必要みたいね。手動でログインを済ませなさい。');
            log('   ブックマークページが完全に表示されたら、自動で再開してあげるわ。');

            const loginTimeout = 300000; // 5分
            const pollInterval = 2000;   // 2秒ごと
            let timeWaited = 0;

            let loginSuccess = false;
            while (timeWaited < loginTimeout) {
                const currentPages = await browser.pages();
                for (const p of currentPages) {
                    if (await isLoginSuccessful(p)) {
                        log('✅ ログイン成功！ブックマークのツイート表示を確認したわ。');
                        page = p;
                        loginSuccess = true;
                        break;
                    }
                }
                if (loginSuccess) break;

                await new Promise(r => setTimeout(r, pollInterval));
                timeWaited += pollInterval;
            }

            if (!loginSuccess) {
                throw new Error('TimeoutError');
            }
        }

        log('✅ 準備完了よ。');

    } catch (error) {
        if (error.message.includes('TimeoutError')) {
            console.error('❌ 時間切れよ。指定時間内にログインが完了しなかったみたいね。');
        } else {
            console.error('❌ 準備中にエラーが発生したわ:', error.message);
        }
        if (browser) await browser.close();
        return { browser: null, page: null };
    }

    return { browser, page };
}


async function fetchTweetsByScroll(page, existingIds, scrollLimit = 30) {
    const collected = [];

    for (let i = 0; i < scrollLimit; i++) {
        try {
            if (page.isClosed()) {
                console.warn('⚠️ スクロール中にページが閉じられたわ。処理を中断するわね。');
                break;
            }

            log(`📜 スクロール中... (${i + 1}/${scrollLimit})`);

            await page.keyboard.press('PageDown');
            await page.keyboard.press('PageDown');
            await page.keyboard.press('PageDown');
            await new Promise(resolve => setTimeout(resolve, 1500)); // 待機時間を少し延長

            const newTweets = await page.evaluate(() => {
                log = (...mes) => { console.log(new Date().toLocaleTimeString(), ...mes); }
                const tweetNodes = document.querySelectorAll('article[data-testid="tweet"]');
                const result = [];
                log(`👀 DOMから取得できたツイート数: ${tweetNodes.length}`, tweetNodes);


                function postNodeToJSON(node) {
                    const text = node.querySelector('[data-testid="tweetText"]')?.innerText;
                    // const article = node.closest('article');
                    const author = node.querySelector('div[dir="ltr"] > span')?.innerText ?? 'unknown';
                    const url = node.querySelector('a[href][dir="ltr"][aria-label]')?.href;
                    const idMatch = url?.match(/status\/(\d+)/);
                    const id = idMatch ? idMatch[1] : null;
                    const time = node.querySelector('time')?.dateTime;
                    const mediaLinks = [...node.querySelectorAll('[data-testid="tweetText"] a')].map(a => a.href);
                    const medias = [
                        ...[...node.querySelectorAll('img[alt="画像"]')].map(img => img.src).filter(src => src),
                        ...[...node.querySelectorAll('video[aria-label="埋め込み動画"]')].map(video => video.src).filter(src => src),
                        ...[...node.querySelectorAll('video[aria-label="埋め込み動画"]')].map(video => video.poster).filter(src => src),
                    ];

                    if (id) {
                        const data = { id, text, author, medias, url, time, mediaLinks, used_in_stream: false };
                        log(data);
                        return data;
                    } else {
                        return null;
                    }
                }

                tweetNodes.forEach(node => {
                    const tweet = postNodeToJSON(node);
                    if (tweet) result.push(tweet);
                });

                return result;
            });

            log(`👀 DOMから取得できたツイート数: ${newTweets.length}`);

            for (const tweet of newTweets) {
                if (!existingIds.has(tweet.id)) {
                    collected.push(tweet);
                    existingIds.add(tweet.id);
                }
            }
        } catch (error) {
            if (error.message.includes('Target closed') || error.message.includes('detached')) {
                console.error('❌ ページが応答しなくなったわ。収集済みのデータで処理を終えるわね。');
                break; // ループを安全に抜ける
            } else {
                console.error(`📜 スクロール中に予期せぬエラーが発生 (${i + 1}/${scrollLimit}):`, error.message);
                // 致命的でなければ、次のループを試みるかもしれないけど、基本は抜けるのが安全
                break;
            }
        }
    }

    return collected;
}

module.exports = {
    launchBrowserAndLogin,
    fetchTweetsByScroll,
};
