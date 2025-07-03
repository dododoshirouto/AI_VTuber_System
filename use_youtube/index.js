// https://console.cloud.google.com/
// init:
// 1. YouTube API を有効化
// 2. OAuth 2.0 クライアントを作成
// 3. JSONをダウンロードして、credentials.json に名称変更



const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');
// const open = require('open');

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');
const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];

async function authorize() {
    const content = fs.readFileSync(CREDENTIALS_PATH);
    const credentials = JSON.parse(content);
    const { client_secret, client_id, redirect_uris } = credentials.installed;

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]); // redirect_uris に "http://localhost" 入っててもOK

    if (fs.existsSync(TOKEN_PATH)) {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
        oAuth2Client.setCredentials(token);
        return oAuth2Client;
    }

    const open = (await import('open')).default;
    const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
    console.log('認証が必要です。以下のURLを開いてコードを入力してください：\n', authUrl);
    await open(authUrl); // 自動でブラウザを開く

    const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    const code = await new Promise(resolve => readline.question('コードを入力: ', ans => resolve(ans)));
    readline.close();

    const { tokens } = await oAuth2Client.getToken(code);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    oAuth2Client.setCredentials(tokens);
    console.log('トークンを保存しました');
    return oAuth2Client;
}



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




async function getLivechatID() {
    const auth = await authorize();
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

    return { auth, liveChatId: live.snippet.liveChatId };
}



class GetYouTubeLiveComments {
    constructor({ autoStart = true } = {}) {
        this.auth = null;
        this.liveChatId = null;
        this.nextPageToken = '';
        this.callback = async _ => { };
        this.enabled = autoStart;
    }

    setCallback(callback = async _ => { }) {
        this.callback = callback;
    }

    async start() {
        this.enabled = true;
        if (!this.auth) this.auth = await authorize();
        if (!this.liveChatId) {
            let { liveChatId } = await getLivechatID();
            this.liveChatId = liveChatId;
        }

        await this.run();
    }

    async run() {
        let { nextPageToken, delay } = await getLiveChatMessages(this.auth, this.liveChatId, { pageToken: this.nextPageToken, callback: this.callback });
        this.nextPageToken = nextPageToken;

        if (this.enabled && this.nextPageToken) {
            setTimeout(() => this.run(), delay);
        }
    }

    async stop() {
        this.enabled = false;
    }
}



if (require.main === module) {
    (async () => {
        const gylc = new GetYouTubeLiveComments();
        gylc.setCallback(messList => {
            for (const mess of messList) {
                console.log(`[${mess.time}] ${mess.author}: ${mess.text}`);
            }
        });
        await gylc.start();
    })();
}

module.exports = { GetYouTubeLiveComments };