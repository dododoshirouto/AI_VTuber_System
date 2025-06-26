# voicevox_talker/main.py

# import sys
# import asyncio
from voicevox_yomiage import VoicevoxYomiage, VV_Speaker

from fastapi import FastAPI
from fastapi.responses import FileResponse
import uvicorn
import json

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY
import traceback

app = FastAPI()
yomiage = VoicevoxYomiage(speaker_id=VV_Speaker.四国めたん.value, speed=1)

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
