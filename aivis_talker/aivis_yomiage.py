# voicevox_yomiage.py
# Reference: https://qiita.com/taka7n/items/1dc61e507274b93ee868

from enum import Enum
import os
import sys
import pyaudio
import asyncio
import re
import requests

from use_japanglish import convert_mixed_text

base_url = "http://127.0.0.1:10101"

class Aivis_Speaker(Enum):
    四国めたん = 2037533120

class AivisYomiage:
    def __init__(self, speaker_id: int=Aivis_Speaker.四国めたん.value, speed:float = 1.2, jtalk_path: str="open_jtalk_dic_utf_8-1.11"):
        self.speaker_id = speaker_id
        self.speed_scale = speed

        self.pa = pyaudio.PyAudio()
        self.stream = self.pa.open(format=pyaudio.paInt16, channels=1, rate=24000, output=True)

        self.eng_to_kana_init()

    async def __call__(self, text: str):
        wave_bytes = self.synthesize(text)
        self.stream.write(wave_bytes)

    def synthesize(self, text: str) -> bytes:
        return self.synthesize_from_query(self.get_audio_query(text))

    def synthesize_from_query(self, query: dict) -> bytes:
        query['speed_scale'] = self.speed_scale
        query['outputSamplingRate'] = 24000
        return requests.post(
            f"{base_url}/synthesis",
            params={"speaker": self.speaker_id},
            headers={"Content-Type": "application/json"},
            json=query
        ).content

    def get_audio_query(self, text: str) -> dict:
        text_kana = self.eng_to_kana(text)
        query = requests.post(
            f"{base_url}/audio_query",
            params={"text": text, "speaker": self.speaker_id}
        ).json()
        return query


    def set_speaker(self, speaker_id: int):
        self.speaker_id = speaker_id
        return self

    def set_speed(self, speed: float):
        self.speed_scale = speed
        return self

    def eng_to_kana_init(self):
        if hasattr(sys, '_MEIPASS'):
            base_path = sys._MEIPASS
        else:
            base_path = os.path.dirname(__file__)

        dic_file = os.path.join(base_path, 'bep-eng.dic.txt')
        self.kana_dict = {}
        with open(dic_file, mode='r', encoding='utf-8') as f:
            lines = f.readlines()
            for i, line in enumerate(lines):
                line_list = line.replace(r'\n', '').split(' ')
                if len(line_list) != 2:
                    continue
                self.kana_dict[line_list[0]] = line_list[1]

        self.reduction=[
            ["It's","イッツ"],["I'm","アイム"],["You're","ユーァ"],["He's","ヒーィズ"],
            ["She's","シーィズ"],["We're","ウィーアー"],["They're","ゼァー"],["That's","ザッツ"],
            ["Who's","フーズ"],["Where's","フェアーズ"],["I'd","アイドゥ"],["You'd","ユードゥ"],
            ["I've","アイブ"],["I'll","アイル"],["You'll","ユール"],["He'll","ヒール"],
            ["She'll","シール"],["We'll","ウィール"]
        ]

    def eng_to_kana(self, text:str) -> str:
        text = text.replace("+"," プラス ").replace("＋"," プラス ").replace("-"," マイナス ")
        text = text.replace("="," イコール ").replace("＝"," イコール ")
        text = re.sub(r'No\\.([0-9])',"ナンバー\\1",text)
        text = re.sub(r'No([0-9])',"ナンバー\\1",text)
        for red in self.reduction: text = text.replace(red[0]," "+red[1]+" ")
        text = re.sub(r'a ([a-zA-Z])',"アッ \\1",text)
        text = text.replace("."," . ").replace("。"," 。 ").replace("!"," ! ")
        text = text.replace("！"," ！ ")
        text_l=list(text)
        for i in range(len(text))[::-1][:-1]:
            if re.compile("[a-zA-Z0-9]").search(text_l[i]) and re.compile("[^a-zA-Z0-9]").search(text_l[i-1]): text_l.insert(i," ")
            elif re.compile("[^a-zA-Z0-9]").search(text_l[i]) and re.compile("[a-zA-Z0-9]").search(text_l[i+-1]): text_l.insert(i," ")
        text = "".join(text_l)
        text_split = re.split(r'[ \,\*\-\_\=\(\)\[\]\'\"\&\$　]',text)
        for i in range(len(text_split)):
            if str.upper(text_split[i]) in self.kana_dict:
                text_split[i] = self.kana_dict[str.upper(text_split[i])]
        
        return convert_mixed_text("".join(text_split))


if __name__ == "__main__":
    async def main():
        vv = AivisYomiage(speaker_id=Aivis_Speaker.四国めたん.value)
        await vv("Popular tracks tagged #zundamon Play popular tracks tagged zundamon on SoundCloud desktop and mobile.")
        print("終了")

    asyncio.run(main())
