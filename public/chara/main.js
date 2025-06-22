var PSD = require('psd');
var pngElem = null;
var canvas = null;
var ctx = null;
var faceData = null;





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
    }
}
update();