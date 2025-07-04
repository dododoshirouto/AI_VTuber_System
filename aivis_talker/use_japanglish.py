import re
from pyjapanglish import Japanglish
from fugashi import Tagger

# 英→カタカナ変換器初期化
japan = Japanglish()

# 日本語分かち書き用 Tagger（MeCab系）
tagger = Tagger()

def convert_mixed_text(text: str) -> str:
    result_tokens = []
    for token in tagger(text):
        surface = token.surface
        # ASCII 英単語か判定
        if re.fullmatch(r"([A-Za-z][A-Za-z0-9\-]*)" , surface):
            # PyJapanglish で英単語をカタカナ化
            kana = japan.convert(surface)
            result_tokens.append(kana)
        else:
            result_tokens.append(surface)
    # print(result_tokens)
    return "".join(result_tokens)

if __name__ == "__main__":
    # 🎯 テスト例
    samples = [
        "このバージョンはRustで実装されています。",
        "Please install API before using this.",
        "音声合成では OpenAI tokenization が重要です。"
    ]

    for s in samples:
        print("元文:", s)
        print("→変換:", convert_mixed_text(s))
        print("---")
