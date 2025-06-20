# AI VTuber システム

## 概要

Xでブクマしたポストにコメントしていく配信をするVTuberを作る試み

## 使用技術と構成

1. Puppeteer：X（Twitter）のブクマ取得
2. ChatGPT API：ブクマ内容に応じたセリフ生成
3. VOICEVOX API：生成テキストを音声化（四国めたん使用）
4. OBS：ブクマ画面、立ち絵、音声を統合して配信

## 配信中のメイン処理フロー（ループ）

1. PuppeteerでXのブクマ一覧を取得（未処理分のみ）
2. JSON形式で保存（"id", "text", "author", "isDone"）
3. 未処理の1件をChatGPTに渡してセリフ生成
4. VOICEVOX APIで音声ファイルを生成
5. OBSのHTMLブラウザソースでツイート・音声・立ち絵を表示
6. 音声再生後、該当ツイートを「処理済み」にマーク
7. 次のブクマへループ

## 動作概要

| ステップ | 処理内容                           | 関連ファイル                              | 備考                      |
| ---- | ------------------------------ | ----------------------------------- | ----------------------- |
| ①    | 未処理のポストを `bookmarks.json` から取得 | `read_bookmark/bookmark_storage.js` | 1件ずつ処理                  |
| ②    | ChatGPTでセリフ生成                  | `use_chatgpt/index.js`              | モデルやキャラはID指定済           |
| ③    | VOICEVOXで音声ファイル作成/発音情報取得              | `voicevox_talker/main.py`           | FastAPIで呼び出し  |
| ④    | 音声と立ち絵、ポスト表示をOBSに反映            | `public/` or OBSブラウザソース             | 再生は `.wav` 再生 or HTML連携 |
| ⑤    | URLがある場合はその先を取得して再度①～④         | `node-fetch` or `puppeteer`         | ページテキスト解析が必要            |
| ⑥    | 終了後に「処理済みマーク」を付与               | `bookmarks.json` 更新                 | `isDone: true` など       |

### OBSへの表示・音声反映はどうやる？

1つのHTMLページに音声、立ち絵を反映させる → OBSにブラウザソースで取り込み、位置調整

### 口パクはどうやる？

AudioQuery(JSON)からタイミングと口形を反映させる（音声再生時間と同期させる）

### Xのポストはどう表示させる？

OBSのブラウザソースのプロパティを外部から変更（後で調べる）

## フォルダ構成（抜粋）

```bash
AI_VTuber_System/
├── main.js                   # 配信全体制御（Node.js）
├── read_bookmark/            # Xのブクマ取得と保存
│   ├── index.js              # Puppeteer実行スクリプト
│   ├── puppeteer_helper.js   # スクロール処理など
│   ├── bookmark_storage.js   # JSON保存・管理
│   └── bookmarks.json        # 保存されたポストデータ
├── use_chatgpt/              # ChatGPTセリフ生成
│   ├── index.js              # prompt → response（Node.js）
│   └── assistant_session.js  # 会話制御＆コスト管理
├── voicevox_talker/          # VOICEVOX音声生成（Python）
│   ├── main.py               # FastAPIサーバ立ち上げ＆合成トリガー
│   ├── voicevox_yomiage.py   # 音声再生＆辞書処理
│   ├── bep-eng.dic.txt       # 英語→カナ変換辞書
│   ├── models/                # VOICEVOXモデルデータ
│   └── venv/                 # Python仮想環境
├── public/                   # OBS表示素材（画像・wav・HTMLなど）
└── _install.bat              # セットアップバッチ（Node+Python）
```

## やることリスト

- [ ] root/main.jsから統合処理
- [x] Xからブクマを取得する
- [x] ChatGPTでセリフを生成する
- [x] VOICEVOXで音声を生成する
- [ ] 立ち絵をOBSに反映させる
- [ ] 音声をOBSに反映させる
- [ ] XのポストをOBSに反映させる
- [ ] コメントに反応する
