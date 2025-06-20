# voicevox_talker/main.py

import sys
import asyncio
from voicevox_yomiage import VoicevoxYomiage, VV_Speaker

async def main():
    if len(sys.argv) < 2:
        print("使用方法: python main.py '読み上げるテキスト'")
        sys.exit(1)

    text = sys.argv[1]

    # スピーカーIDや速度はここで調整可能
    vv = VoicevoxYomiage(speaker_id=VV_Speaker.四国めたん.value, speed=1.1)
    await vv(text)

if __name__ == "__main__":
    asyncio.run(main())
