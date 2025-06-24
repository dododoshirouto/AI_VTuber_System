# voicevox_yomiage.py
# Reference: https://qiita.com/taka7n/items/1dc61e507274b93ee868

from enum import Enum
import os
import sys
from pathlib import Path
import pyaudio
import asyncio
import re

from use_japanglish import convert_mixed_text

# VOICEVOX Core v0.16.0 API
from voicevox_core.blocking import Synthesizer, Onnxruntime, OpenJtalk, VoiceModelFile

class VV_Speaker(Enum):
    四国めたん = 2
    四国めたん_ヒソヒソ = 37
    ずんだもん = 3
    ずんだもん_ヒソヒソ = 22
    春日部つむぎ = 8
    雨晴はう = 10
    九州そら = 16
    九州そら_ささやき = 19
    WhiteCUL = 23
    No_7 = 29
    No_7_読み聞かせ = 31
    中国うさぎ = 61
    栗田まろん = 67

class VoicevoxYomiage:
    def __init__(self, speaker_id: int=0, speed:float = 1.2, jtalk_path: str="open_jtalk_dic_utf_8-1.11"):
        self.speaker_id = speaker_id
        self.speed_scale = speed

        if hasattr(sys, '_MEIPASS'):
            base_path = sys._MEIPASS
        else:
            base_path = os.path.dirname(__file__)

        self.jtalk_path = os.path.join(base_path, jtalk_path)

        try:
            onnx = Onnxruntime.get()
        except Exception:
            onnx = None

        if onnx is None:
            onnx_path = os.path.join(base_path, "onnxruntime", "lib", Onnxruntime.LIB_VERSIONED_FILENAME)
            onnx = Onnxruntime.load_once(filename=onnx_path)

        open_jtalk = OpenJtalk(self.jtalk_path)
        self.synthesizer = Synthesizer(onnx, open_jtalk)

        vvms_dir = os.path.join(base_path, "models", "vvms")
        for file in os.listdir(vvms_dir):
            if file.endswith(".vvm"):
                with VoiceModelFile.open(os.path.join(vvms_dir, file)) as vm:
                    metas = vm.metas
                    if any(meta.name == VV_Speaker(self.speaker_id).name for meta in metas):
                        self.synthesizer.load_voice_model(vm)
                        break

        self.pa = pyaudio.PyAudio()
        self.stream = self.pa.open(format=pyaudio.paInt16, channels=1, rate=24000, output=True)

        self.eng_to_kana_init()

    async def __call__(self, text: str):
        text_kana = self.eng_to_kana(text)
        query = self.synthesizer.create_audio_query(text_kana, self.speaker_id)
        query.speed_scale = self.speed_scale
        wave_bytes = self.synthesizer.synthesis(query, self.speaker_id)
        self.stream.write(wave_bytes)

    def synthesize(self, text: str) -> bytes:
        text_kana = self.eng_to_kana(text)
        query = self.synthesizer.create_audio_query(text_kana, self.speaker_id)
        query.speed_scale = self.speed_scale
        return self.synthesizer.synthesis(query, self.speaker_id)

    def get_audio_query(self, text: str) -> dict:
        text_kana = self.eng_to_kana(text)
        query = self.synthesizer.create_audio_query(text_kana, self.speaker_id)
        query.speed_scale = self.speed_scale
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
            if re.compile("[a-zA-Z]").search(text_l[i]) and re.compile("[^a-zA-Z]").search(text_l[i-1]): text_l.insert(i," ")
            elif re.compile("[^a-zA-Z]").search(text_l[i]) and re.compile("[a-zA-Z]").search(text_l[i+-1]): text_l.insert(i," ")
        text = "".join(text_l)
        text_split = re.split(r'[ \,\*\-\_\=\(\)\[\]\'\"\&\$　]',text)
        for i in range(len(text_split)):
            if str.upper(text_split[i]) in self.kana_dict:
                text_split[i] = self.kana_dict[str.upper(text_split[i])]
        
        return convert_mixed_text("".join(text_split))
    
    import voicevox_core
    staticmethod
    def AudioQuery_to_dict(query: voicevox_core.AudioQuery) -> dict:
        accentPhraseList = []
        for accentPhrase in query.accent_phrases:
            dict = {}
            dict["accent"] = accentPhrase.accent
            dict["is_interrogative"] = accentPhrase.is_interrogative
            dict["moras"] = []
            for mora in accentPhrase.moras:
                dict["moras"].append({
                    "text": mora.text,
                    "vowel": mora.vowel,
                    "vowel_length": mora.vowel_length,
                    "pitch": mora.pitch,
                    "consonant": mora.consonant,
                    "consonant_length": mora.consonant_length,
                })
            pause_mora = accentPhrase.pause_mora
            dict["pause_mora"] = {
                    "text": pause_mora.get("text", ""),
                    "vowel": pause_mora.get("vowel", ""),
                    "vowel_length": pause_mora.get("vowel_length", 0),
                    "pitch": pause_mora.get("pitch", 0),
                    "consonant": pause_mora.get("consonant", None),
                    "consonant_length": pause_mora.get("consonant_length", None),
                } if pause_mora is not None else None
            accentPhraseList.append(dict)
        return {
            "speed_scale": query.speed_scale,
            "pitch_scale": query.pitch_scale,
            "intonation_scale": query.intonation_scale,
            "intonation_scale": query.intonation_scale,
            "volume_scale": query.volume_scale,
            "pre_phoneme_length": query.pre_phoneme_length,
            "post_phoneme_length": query.post_phoneme_length,
            "output_sampling_rate": query.output_sampling_rate,
            "output_stereo": query.output_stereo,
            "kana": query.kana,
            "accent_phrases": accentPhraseList
        }


if __name__ == "__main__":
    async def main():
        vv = VoicevoxYomiage(speaker_id=VV_Speaker.四国めたん.value)
        await vv("Popular tracks tagged #zundamon Play popular tracks tagged zundamon on SoundCloud desktop and mobile.")
        print("終了")

    asyncio.run(main())
