const puppeteer = require('puppeteer');
const path = require('path');

async function launchBrowserAndLogin() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        userDataDir: path.resolve(__dirname, './.puppeteer_profile'),
    });

    const page = await browser.newPage();
    await page.goto('https://twitter.com/i/bookmarks');

    console.log('📌 手動でログインしてください。そのままブクマページに到達したら自動再開します。');

    const autoResumeAfterMs = 5000;

    const shouldAutoResume = await new Promise(resolve => {
        const timeout = setInterval(async () => {
            const currentUrl = page.url();
            if (
                currentUrl.includes('twitter.com/i/bookmarks') ||
                currentUrl.includes('x.com/i/bookmarks')
            ) {
                console.log('✅ ブクマページにアクセス済み。自動再開します。');
                clearInterval(timeout);
                resolve(true);
            } else {
                // resolve(false);
            }
        }, autoResumeAfterMs);

        process.stdin.resume();
        process.stdin.once('data', () => {
            clearInterval(timeout);
            resolve(true); // 手動Enterでも再開
        });
    });

    // const pages = await browser.pages();
    // page = pages[pages.length - 1];

    return { browser, page };
}


async function fetchTweetsByScroll(page, existingIds, scrollLimit = 30) {
    const collected = [];

    for (let i = 0; i < scrollLimit; i++) {
        console.log(`📜 スクロール中... (${i + 1}/${scrollLimit})`);

        // await page.mouse.wheel({ deltaY: 800 });
        await page.keyboard.press('PageDown');
        await page.keyboard.press('PageDown');
        await page.keyboard.press('PageDown');
        await new Promise(resolve => setTimeout(resolve, 1000));

        const newTweets = await page.evaluate(() => {
            const tweetNodes = document.querySelectorAll('article[data-testid="tweet"]');
            const result = [];
            console.log(`👀 DOMから取得できたツイート数: ${tweetNodes.length}`, tweetNodes);


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
                    console.log(data);
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

        console.log(`👀 DOMから取得できたツイート数: ${newTweets.length}`);

        for (const tweet of newTweets) {
            if (!existingIds.has(tweet.id)) {
                collected.push(tweet);
                existingIds.add(tweet.id);
            }
        }
    }

    return collected;
}

module.exports = {
    launchBrowserAndLogin,
    fetchTweetsByScroll,
};
