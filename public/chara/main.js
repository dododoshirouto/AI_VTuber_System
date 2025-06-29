var PSD = require('psd');
var pngElem = null;
var canvas = null;
var ctx = null;
var faceData = null;

const audio_file = "voice.wav";
const audio_query_json = "current.json";
var audio_query = null;
const audio_elem = document.getElementById("speech_audio");
audio_elem.onended = async () => {
    audio_is_playing = false;
    document.body.classList.remove('audio_playing');
    updateMouth(window.psd, faceData.mouth_open[0]);
    await exit_streaming_if_final_wav_ended();
}

async function exit_streaming_if_final_wav_ended() {
    if (!audio_is_playing && audio_query.isFinal && window.obsstudio) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        window.obsstudio.stopRecording();
        window.obsstudio.stopStreaming();
    }
}

var can_audio_play = false;
var audio_is_playing = false;



const chara_name = "四国めたん立ち絵素材2.1";
const chara_psd = `${chara_name}.psd`;
const chara_face_json = `${chara_name}.face.json`;



// TODO: wavを再生する
// TODO: AudioQueryを使ってクチパクする
// TODO: 口パクをwavの再生時間と同期する
// TODO: 口パクに合わせてcss animationする

async function init() {
    faceData = await loadFaceJson()

    PSD.fromURL(`psd/${chara_name}/${chara_psd}`).then(psd => {
        window.psd = psd;

        logLayers(psd);

        getRadioLayers(psd);
        createLayersImageCtx(psd);

        audio_update_check();
    }).catch(e => console.error('PSD load error:', e));
}

window.addEventListener('DOMContentLoaded', async () => {
    await init();
});

var time = 0;
var lastTime = 0;
var deltaTime = 0;
async function update() {
    while (true) {
        await new Promise(r => requestAnimationFrame(r));
        lastTime = time;
        time = Date.now() / 1000;
        deltaTime = time - lastTime;
        if (!window.psd) continue;
        if (!faceData) continue;

        update_twinkle();
        if (can_audio_play) {
            try {
                update_visemes();
            } catch (e) {
                console.error(e);
            }
        }
    }
}
update();




async function play_audio() {
    audio_elem.src = audio_file + '?' + Date.now();
    audio_elem.currentTime = 0;
    await load_audio_query_json();
    audio_elem.play();
    audio_is_playing = true;
    document.body.classList.add('audio_playing');
}



var last_text = "";
async function audio_update_check() {
    while (true) {
        await new Promise(r => setTimeout(r, 500));
        let json = await fetch(audio_query_json + '?' + Date.now()).then(res => res.json()).then(json => json);
        if (json.text != last_text && can_audio_play && !audio_is_playing) {
            last_text = json.text;
            try {
                play_audio();
            } catch (e) {
                console.error(e);
            }
        }
    }
}



if (window.obsstudio) {
    can_audio_play = true;
    window.addEventListener('click', () => audio_elem.currentTime = audio_elem.duration);
    setTimeout(() => audio_elem.currentTime = audio_elem.duration, 5000);
} else {
    window.addEventListener('click', () => {
        can_audio_play = true;
        setTimeout(() => audio_elem.currentTime = audio_elem.duration, 5000);
    });
}