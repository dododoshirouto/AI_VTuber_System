const { google } = require('googleapis');
const path = require('path');

class YouTubePrivacyStatus {
    static PUBLIC = 'public';
    static PRIVATE = 'private';
    static UNLISTED = 'unlisted';
}

class YouTubeLiveBroadcastLifeCycleStatus {
    /** ブロードキャストが終了しました。 */
    static complete = "complete";
    /** ブロードキャストの設定が不完全で、ステータス live または testing に移行する準備はできていませんが、ブロードキャストは作成済みです。 */
    static created = "created";
    /** ブロードキャストはアクティブです。 */
    static live = "live";
    /** ブロードキャスト ステータスが live に移行中です。 */
    static liveStarting = "liveStarting";
    /** ブロードキャストの設定が完了し、ブロードキャストは live または testing のステータスに移行できます。 */
    static ready = "ready";
    /** このブロードキャストは管理者操作によって削除されました。 */
    static revoked = "revoked";
    /** ブロードキャスト ステータスが testing に移行中です。 */
    static testStarting = "testStarting";
    /** ブロードキャストの内容はパートナーにのみ表示されます。 */
    static testing = "testing";
}

class CreateYouTubeLiveBroadcast {
    static STREAM_KEY_PATH = path.join(__dirname, 'stream_key.json');

    constructor(auth) {
        this.auth = auth;
        this.youtube = google.youtube({ version: 'v3', auth });
        this.streamKey = this.getStreamKey();
        this.broadcastId = null;
    }

    async createBroadcast({ title = "AI VTuber System", description = "Auto Created by AI VTuber System", scheduledStartTime = new Date(Date.now() + 5 * 60 * 1000).toISOString(), privacyStatus = YouTubeLiveBroadcastPrivacyStatus.PUBLIC } = {}) {
        if (!this.streamKey) {
            this.streamKey = await this.createStreamKey();
        }

        if (!this.streamKey) {
            // console.log("ストリームキー作成失敗");
            return;
        }
        if (require.main === module)
            console.log(`ストリームキー: ${this.streamKey.cdn.ingestionInfo.streamName}`);

        try {
            // ライブブロードキャスト（配信枠）を作成
            const broadcastResponse = await this.youtube.liveBroadcasts.insert({
                part: ['snippet', 'status', 'contentDetails'],
                requestBody: {
                    snippet: {
                        title: title,
                        description: description,
                        scheduledStartTime: scheduledStartTime
                    },
                    status: {
                        privacyStatus: privacyStatus
                    },
                    contentDetails: {
                        boundStreamId: this.streamKey.id,
                        monitorStream: {
                            enableMonitorStream: false
                        },
                        latencyPreference: 'ultraLow',
                        enableAutoStart: true,
                        enableAutoStop: true
                    }
                }
            });

            this.broadcastId = broadcastResponse.data.id;

            // ブロードキャストとストリームをバインド
            await this.youtube.liveBroadcasts.bind({
                part: ['id', 'snippet'],
                id: this.broadcastId,
                streamId: this.streamKey.id
            });

            console.log('✅ 配信枠の作成完了！');
            console.log('配信URL: https://www.youtube.com/watch?v=' + this.broadcastId);
        } catch (err) {
            console.error(err);
            console.log("配信枠作成失敗");
        }
    }

    getStreamKey() {
        const fs = require('fs');
        try {
            const streamKey = fs.readFileSync(CreateYouTubeLiveBroadcast.STREAM_KEY_PATH, 'utf-8');
            return JSON.parse(streamKey);
        } catch (err) {
            console.log("ストリームキー読み込み失敗");
            return null;
        }
    }

    /** @returns {YouTubeLiveBroadcastLifeCycleStatus} */
    async getBroadcastStatus() {
        if (!this.broadcastId) return null;
        try {
            const broadcastResponse = await this.youtube.liveBroadcasts.list({
                part: ['snippet', 'status', 'contentDetails'],
                id: this.broadcastId
            });
            return broadcastResponse.data.items[0].status.lifeCycleStatus;
        } catch (err) {
            console.log("配信状態取得失敗");
            return null;
        }
    }

    async waitForBroadcastStart() {
        console.log("配信開始を待機中…");
        while (true) {
            const status = await this.getBroadcastStatus();
            if (status === YouTubeLiveBroadcastLifeCycleStatus.live) break;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log("配信開始");
    }

    async createStreamKey() {
        try {
            const streamResponse = await this.youtube.liveStreams.insert({
                part: ['snippet', 'cdn', 'contentDetails'],
                requestBody: {
                    snippet: {
                        title: 'AI VTuber System ' + (new Date()).toLocaleString(),
                        description: 'Auto Created by AI VTuber System'
                    },
                    cdn: {
                        resolution: 'variable', // 自動で解像度を変える
                        frameRate: 'variable',
                        ingestionType: 'rtmp'
                    }
                }
            });
            // console.log(streamResponse.data);

            const fs = require('fs');
            fs.writeFileSync(CreateYouTubeLiveBroadcast.STREAM_KEY_PATH, JSON.stringify(streamResponse.data));

            console.log("ストリームキー作成成功");
            return streamResponse.data;

        } catch (err) {
            console.error(err);
            console.log("ストリームキー作成失敗");
            return null;
        }
    }
}

module.exports = { CreateYouTubeLiveBroadcast, YouTubePrivacyStatus, YouTubeLiveBroadcastLifeCycleStatus };