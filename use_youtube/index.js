// https://console.cloud.google.com/
// init:
// 1. YouTube API を有効化
// 2. OAuth 2.0 クライアントを作成
// 3. JSONをダウンロードして、credentials.json に名称変更

const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');
// const open = require('open');

const { GetYouTubeLiveComments } = require('./get_comments');
const { CreateYouTubeLiveBroadcast, YouTubePrivacyStatus, YouTubeLiveBroadcastLifeCycleStatus } = require('./create_broadcast');

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');
const SCOPES = ['https://www.googleapis.com/auth/youtube'];



async function authorize() {
    const content = fs.readFileSync(CREDENTIALS_PATH);
    const credentials = JSON.parse(content);
    const { client_secret, client_id, redirect_uris } = credentials.installed;

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]); // redirect_uris に "http://localhost" 入っててもOK

    if (fs.existsSync(TOKEN_PATH)) {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH));

        if (token.expiry_date > Date.now()) {
            oAuth2Client.setCredentials(token);
            return oAuth2Client;
        }
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



if (require.main === module) {
    (async () => {
        const auth = await authorize();

        const cylb = new CreateYouTubeLiveBroadcast(auth);
        await cylb.createBroadcast({
            title: '【TEST】 AI VTuber System',
            description: 'Auto Created by AI VTuber System',
            scheduledStartTime: 5,
            privacyStatus: YouTubePrivacyStatus.UNLISTED
        });

        const gylc = new GetYouTubeLiveComments({ auth });
        gylc.setCallback(messList => {
            for (const mess of messList) {
                console.log(`[${mess.time}] ${mess.author}: ${mess.text}`);
            }
        });
        await gylc.start();
    })();
}

module.exports = { authorize, GetYouTubeLiveComments, CreateYouTubeLiveBroadcast, YouTubePrivacyStatus, YouTubeLiveBroadcastLifeCycleStatus };