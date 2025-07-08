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

| ステップ | 処理内容 | 関連ファイル | 備考 |
| --- | --- | --- | --- |
| ① | 未処理のポストを `bookmarks.json` から取得 | `read_bookmark/bookmark_storage.js` | 1件ずつ処理 |
| ② | ChatGPTでセリフ生成 | `use_chatgpt/index.js` | モデルやキャラはID指定済 |
| ③ | VOICEVOXで音声ファイル作成/発音情報取得 | `voicevox_talker/main.py` | FastAPIで呼び出し |
| ④ | 音声と立ち絵、ポスト表示をOBSに反映 | `public/` or OBSブラウザソース | 再生は `.wav` 再生 or HTML連携 |
| ⑤ | URLがある場合はその先を取得して再度①～④ | `node-fetch` or `puppeteer` | ページテキスト解析が必要 |
| ⑥ | 終了後に「処理済みマーク」を付与 | `bookmarks.json` 更新 | `isDone: true` など |

### OBSへの表示・音声反映はどうやる？(実装済み)

1つのHTMLページに音声、立ち絵を反映させる → OBSにブラウザソースで取り込み、位置調整

### 口パクはどうやる？(実装済み)

AudioQuery(JSON)からタイミングと口形を反映させる（音声再生時間と同期させる）

### Xのポストはどう表示させる？(実装済み)

ツイートの埋め込みを表示するページを作って、動的に表示させる（HTML）

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
├── use_youtube/              # YouTubeLiveコメント取得
│   ├── index.js              # 
│   ├── get_comments.js       # 配信のコメントを取得
│   └── create_broadcast.js   # 配信枠作成
├── voicevox_talker/          # VOICEVOX音声生成（Python）
│   ├── main.py               # FastAPIサーバ立ち上げ＆合成トリガー
│   ├── voicevox_yomiage.py   # 音声再生＆辞書処理
│   ├── bep-eng.dic.txt       # 英語→カナ変換辞書
│   ├── models/               # VOICEVOXモデルデータ
│   └── venv/                 # Python仮想環境
├── aivis_talker/             # VOICEVOX音声生成のaivis版（AivisSpeechが別途必要）
├── public/                   # OBS表示素材（画像・wav・HTMLなど）
│   ├── chara/                # OBS表示素材（画像・wav・HTMLなど）
│   │   ├── index.html        # OBSブラウザソース
│   │   ├── main.js           # 
│   │   ├── psd_chara.js      # 立ち絵制御（PSD）
│   │   └── psd/              # 立ち絵素材置場
│   ├── post/                 # 紹介するツイートを表示する
│   │   ├── index.html        # 
│   │   └── main.js           # 
│   └── comments/             # YouTubeコメントを表示する
│       ├── index.html        # 
│       └── main.js           # 
└── _install.bat              # セットアップバッチ（Node+Python）
```

## やることリスト

- [x] root/main.jsから統合処理
- [x] Xからブクマを取得する
- [x] ChatGPTでセリフを生成する
- [x] VOICEVOXで音声を生成する
- [x] 立ち絵をOBSに反映させる
- [x] 音声をOBSに反映させる
- [x] XのポストをOBSに反映させる
- [x] コメントに反応する
- [x] 配信枠の作成
  - [ ] サムネを設定する
- [x] 配信開始する
- [ ] OBSブラウザソースのサーバもnode.jsで立ち上げる
- [ ] OBSブラウザとの連携方法をWebSocketにする
- [ ] 配信告知をツイートする
- [ ] 他の人が簡単にインストールできるようにする

### 細かいの

- すぐできる
  - [ ] 配信の流れ、プロンプトをJSONにする
  - [ ] ChatGPT APIキーと、Google API情報をルートに配置する(インストール時にファイルを作成してコピペしやすいようにする)
  - [ ] _install.batで、.env.sampleをコピーして.envを作成する
  - [ ] コメント取得時にその時喋ってるブクマの情報を入れておく
  - [ ] VOICEVOXの話すスピードを1倍にする(変えれるようにする)
  - [ ] 配信開始時に、前回の配信の時のサマリーを含めてみる
  - [ ] public/charaで、エラー時にそれを表示させるデバッグモード
- ちょっと大変
  - [ ] 配信開始と終了時に、シーン切り替えをする(シーン名はJSONで設定)
  - [ ] public/postのツイート埋込を、縦が画面サイズを超えたら上揃えになるようにする
  - [ ] ブックマーク取得時に、リンクのOGPタグ(image/description)を取得する
  - [ ] ブックマーク取得時に、すでに取得してるブックマークが情報が違ったら上書きする
- 長期的に
  - [ ] ChatGPTの生成部分をStreamingにして、生成途中から音声生成するシステムにする
    - → そしたら生成キューの部分いらないかも
  - [ ] 配信時間から繰り返し回数を計算する
