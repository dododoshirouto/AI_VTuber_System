# voicevox_talker/main.py

# import sys
# import asyncio
from voicevox_yomiage import VoicevoxYomiage, VV_Speaker

from fastapi import FastAPI
from fastapi.responses import FileResponse
import uvicorn
import json
from pathlib import Path

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY
import traceback

def get_settings():
    """
    settings.jsonを読み込み、Pythonの辞書オブジェクトとして返す関数よ。
    この世界の理（ことわり）を、Python使いにもたらすためのもの。
    """
    try:
        # このスクリプトファイルがある場所を基準に、'settings.json'へのパスを構築する
        settings_path = Path(__file__).parent / '../settings.json'

        # 'with'構文でファイルを開くのが作法よ。自動で閉じてくれるから、後始末の心配もいらない
        with open(settings_path, 'r', encoding='utf-8') as f:
            # JSONファイルを読み込んで、Pythonの辞書に変換する
            settings = json.load(f)
        
        return settings

    except FileNotFoundError:
        print(f"致命的なエラー：設定ファイルが見つからないわ。『{settings_path}』は存在する？")
        # 本来なら、ここで例外を発生させるか、プログラムを終了させるべきよ
        # raise
        return {"voicevox_speaker_name": "四国めたん"}
    except json.JSONDecodeError:
        print("致命的なエラー：settings.jsonの中身が、美しいJSON形式になっていないようね。確認なさい。")
        # raise
        return {"voicevox_speaker_name": "四国めたん"}

SETTINGS = get_settings()

app = FastAPI()
yomiage = VoicevoxYomiage(speaker_id=VV_Speaker[SETTINGS["voicevox_speaker_name"]].value, speed=1)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print("🔥 Validation Error:", exc)
    print("🔥 Error details:", exc.errors())
    print("🔥 Request body:", await request.body())
    traceback.print_exc()
    return JSONResponse(
        status_code=HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": await request.body()},
    )

@app.get("/speak")
async def speak(text: str):
    wav = yomiage.synthesize(text)
    wav_path = "out.wav"
    with open(wav_path, "wb") as f:
        f.write(wav)
    return FileResponse(wav_path, media_type="audio/wav")

from fastapi import Body
from fastapi import Request, Depends
@app.post("/speak_from_query")
async def speak_from_query(request: Request):
    # print(request)
    query = await request.json()
    wav = yomiage.synthesize_from_query(query)
    wav_path = "out.wav"
    with open(wav_path, "wb") as f:
        f.write(wav)
    return FileResponse(wav_path, media_type="audio/wav")

@app.get("/query")
async def query(text: str):
    # return VoicevoxYomiage.AudioQuery_to_dict(yomiage.get_audio_query(text))
    return json.dumps(VoicevoxYomiage.AudioQuery_to_dict(yomiage.get_audio_query(text)))
    

@app.get("/")
async def root():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=50021)
