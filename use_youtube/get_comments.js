

const { google } = require('googleapis');



async function getLiveChatMessages(auth, liveChatId, { pageToken = '', callback = async _ => { } } = {}) {
    const youtube = google.youtube({ version: 'v3', auth });

    const res = await youtube.liveChatMessages.list({
        liveChatId,
        part: 'snippet,authorDetails',
        pageToken,
    });

    const messages = res.data.items;
    const messList = [];
    for (const msg of messages) {
        const author = msg.authorDetails.displayName;
        const text = msg.snippet.displayMessage;
        const time = msg.snippet.publishedAt;
        messList.push({ author, text, time });
    }

    const nextPageToken = res.data.nextPageToken;
    const delay = res.data.pollingIntervalMillis || 2000;

    await callback(messList);
    return { messList, nextPageToken, delay };
}




async function getLivechatID(auth) {
    // const auth = await authorize();
    const youtube = google.youtube({ version: 'v3', auth });

    const res = await youtube.liveBroadcasts.list({
        part: 'snippet',
        mine: true
    });

    const live = res.data.items[0];
    if (!live) {
        console.log('ライブ配信が見つかりません。');
        return;
    }

    console.log('ライブ配信を見つけました。');
    return { auth, liveChatId: live.snippet.liveChatId };
}



class GetYouTubeLiveComments {
    constructor({ autoStart = true, auth = null } = {}) {
        this.auth = auth;
        this.liveChatId = null;
        this.nextPageToken = '';
        this.callback = async _ => { };
        this.enabled = autoStart;
    }

    setCallback(callback = async _ => { }) {
        this.callback = callback;
    }

    async start(auth = null) {
        this.enabled = true;
        if (auth) this.auth = auth;
        if (!this.liveChatId) {
            let { liveChatId } = await getLivechatID(this.auth);
            this.liveChatId = liveChatId;
        }

        await this.run();
    }

    async run() {
        let [nextPageToken, delay] = [null, null];
        try {
            let { nextPageToken: _nextPageToken, delay: _delay } = await getLiveChatMessages(this.auth, this.liveChatId, { pageToken: this.nextPageToken, callback: this.callback });
            nextPageToken = _nextPageToken;
            delay = _delay;
        } catch (e) {
            console.log(`Error: ${e}`);
        }
        if (!nextPageToken) {
            console.log("コメント読みが無効になりました");
            return;
        }

        this.nextPageToken = nextPageToken;

        if (this.enabled && this.nextPageToken) {
            setTimeout(() => this.run(), Math.max(delay, 500));
        }
    }

    async stop() {
        this.enabled = false;
    }
}

module.exports = { GetYouTubeLiveComments };