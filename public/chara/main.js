var PSD = require('psd');
var pngElem = null;
var canvas = null;
var ctx = null;
var faceData = null;

const audio_file = "voice.wav";
const audio_query_json = "current.json";
var audio_query = null;
const audio_elem = document.getElementById("speech_audio");
audio_elem.onended = () => audio_is_playing = false;

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
        update_visemes();
    }
}
update();




async function play_audio() {
    audio_elem.src = audio_file + '?' + Date.now();
    audio_elem.currentTime = 0;
    await load_audio_query_json();
    audio_elem.play();
    audio_is_playing = true;
}