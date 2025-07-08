// psd_chara.js
const radioLayers = {
    "mouth": [],
    "eyes": [],
    "arm_left": [],
    "arm_right": [],
}

const twincles_data = {
    isClose: false,
    intervalTime: 0,
    intervalTimeMax: 0
}
async function update_twinkle() {
    // まばたき
    twincles_data.intervalTime += deltaTime;
    const settings = faceData?.settings?.twinkles;
    if (!settings) return;

    if (twincles_data.intervalTime >= twincles_data.intervalTimeMax) {
        // 閉じと開きの切り替え
        twincles_data.isClose = !twincles_data.isClose;
        let intervalRange = twincles_data.isClose ? (settings.closeIntervalRange || { min: 0.2, max: 0.5 }) : (settings.openIntervalRange || { min: 1, max: 10 });
        twincles_data.intervalTimeMax = intervalRange.min + Math.random() * (intervalRange.max - intervalRange.min);
        twincles_data.intervalTime = 0;

        if (!twincles_data.isClose && !document.body.classList.contains('audio_playing')) {
            randomEyePos(window.psd);
        }
    }

    if (twincles_data.intervalTime <= settings?.twinclingTime || 0.1) {
        // 切替時のアニメーション
        let rate = twincles_data.intervalTime / settings?.twinclingTime || 0.1;
        if (!twincles_data.isClose) {
            rate = 1 - rate;
        }
        rate = Math.min(Math.max(rate, 0), 1);
        updateEyes(window.psd, faceData.eye_close[Math.floor(rate * faceData.eye_close.length)]);
    }
}



const visemes_alternatives = {
    k: 'e',
    s: 'u',
    t: 'e',
    n: 'e',
    h: 'a',
    m: '',
    y: 'a',
    r: 'a',
    w: 'u',

    g: 'k',
    j: 's',
    z: 'j',
    d: 't',
    b: 'm',
    p: 'b',

    ch: 'k',
    ts: 's',
    th: 't',
    ph: 'p',
}

function update_visemes() {
    if (!faceData) return;
    if (!audio_is_playing) return;
    if (!audio_query.query) return;

    let a_time = audio_elem.currentTime;

    let moras_timmings = get_moras_timmings();

    let mora = get_now_mora(moras_timmings, a_time);

    document.body.classList.toggle('audio_playing', mora != null);

    if (mora) {
        updateEyePos(psd);
    }

    // console.log(mora, a_time);

    updateMouth(window.psd, mora_to_layer_name(mora) || faceData.mouth_open[0]);
}

function mora_to_layer_name(mora) {
    mouthes = faceData.mouth_viseme;
    mora = (function get_mora(mora) {
        if (mora in mouthes) return mora;
        mora = visemes_alternatives[mora];
        if (!mora) return null;
        return get_mora(mora);
    })(mora);

    return mouthes[mora];
}

function get_now_mora(moras_timmings, time) {
    let flat_moras = moras_timmings.flat();
    for (let i = 0; i < flat_moras.length; i++) {
        let mora = flat_moras[i];
        if (mora.time > time) {
            return mora.mora;
        }
    }
    return null;
}

function get_moras_timmings() {
    if (audio_query.query.speed_scale === undefined && audio_query.query.speedScale !== undefined) {
        return get_moras_timmings_aivis();
    }
    let accent_phrases = audio_query.query.accent_phrases;
    let speed = audio_query.query.speed_scale || 1;
    let total_time = audio_query.query.pre_phoneme_length || 0;
    let moras_timmings = [{ mora: null, time: total_time / speed }];
    for (let i = 0; i < accent_phrases.length; i++) {
        let accent_phrase = accent_phrases[i];
        let moras = accent_phrase.moras;
        let mora_timmings = [];
        let total_time_phrases = 0;
        for (let j = 0; j < moras.length; j++) {
            let mora = moras[j];
            if (mora.consonant && mora.consonant_length) {
                total_time += mora.consonant_length || 0;
                total_time_phrases += mora.consonant_length || 0;
                mora_timmings.push({
                    mora: mora.consonant.toLowerCase(),
                    type: 'consonant',
                    time: total_time / speed,
                    time_phrases: total_time_phrases / speed
                })
            }
            if (mora.vowel && mora.vowel_length) {
                total_time += mora.vowel_length || 0;
                total_time_phrases += mora.vowel_length || 0;
                // if (mora.consonant && mora.consonant_length) {
                //     total_time -= mora.consonant_length || 0;
                //     total_time_phrases -= mora.consonant_length || 0;
                // }
                mora_timmings.push({
                    mora: mora.vowel.toLowerCase(),
                    type: 'vowel',
                    time: total_time / speed,
                    time_phrases: total_time_phrases / speed
                })
            }
        }
        if (accent_phrase.pause_mora) {
            total_time += accent_phrase.pause_mora.vowel_length || 0;
            mora_timmings.push({
                mora: null,
                time: total_time / speed
            })
        }
        moras_timmings.push(mora_timmings);
    }
    return moras_timmings;
}

function get_moras_timmings_aivis() {
    let accent_phrases = audio_query.query.accent_phrases;
    let speed = audio_query.query.speedScale || 1;
    let total_time = audio_query.query.prePhonemeLength || 0;
    let moras_timmings = [{ mora: null, time: total_time / speed }];
    let a_mora_time = (audio_elem.duration - (audio_query.query.prePhonemeLength || 0) - (audio_query.query.postPhonemeLength || 0)) / accent_phrases.map(v => v.moras).flat().map(v => (v.consonant ? 1 : 0) + (v.vowel ? 1 : 0)).flat().reduce((a, b) => a + b);
    for (let i = 0; i < accent_phrases.length; i++) {
        let accent_phrase = accent_phrases[i];
        let moras = accent_phrase.moras;
        let mora_timmings = [];
        let total_time_phrases = 0;
        for (let j = 0; j < moras.length; j++) {
            let mora = moras[j];
            if (mora.consonant) {
                total_time += a_mora_time || 0;
                total_time_phrases += a_mora_time || 0;
                mora_timmings.push({
                    mora: mora.consonant.toLowerCase(),
                    type: 'consonant',
                    time: total_time / speed,
                    time_phrases: total_time_phrases / speed
                })
            }
            if (mora.vowel) {
                total_time += a_mora_time || 0;
                total_time_phrases += a_mora_time || 0;
                mora_timmings.push({
                    mora: mora.vowel.toLowerCase(),
                    type: 'vowel',
                    time: total_time / speed,
                    time_phrases: total_time_phrases / speed
                })
            }
        }
        if (accent_phrase.pause_mora) {
            total_time += accent_phrase.pause_mora.vowel_length || 0;
            mora_timmings.push({
                mora: null,
                time: total_time / speed
            })
        }
        moras_timmings.push(mora_timmings);
    }
    return moras_timmings;
}



async function loadFaceJson() {
    let res = await fetch(`psd/${chara_name}/${chara_face_json}`);
    let json = await res.json();
    return json;
}



function logLayers(psd) {
    const layers = psd.tree().descendants();
    const logs = [];
    for (const layer of layers) {
        let indent = Array(layer.depth() - 1).fill('  ').join('');
        let visible = layer.layer.visible ? '👁️' : '―';
        logs.push(`${indent}${visible}${layer.name}`);
    }
    console.log(logs);
}



function getRadioLayers(psd) {
    function getLayers(psd, folderName) {
        return psd.layers.find(v => v.node?.name == folderName).node.children().filter(v => v.name[0] == '*');
    }
    radioLayers.eyes = getLayers(psd, '!目');
    radioLayers.mouth = getLayers(psd, '!口');
    radioLayers.arm_left = getLayers(psd, '!左腕');
    radioLayers.arm_right = getLayers(psd, '!右腕');
}

function createLayersImageCtx(psd) {
    let loading = 0;
    psd.layers.forEach(layer => {
        if (layer.ctx_image == null) {
            let toBase64 = layer.image?.toBase64();
            layer.ctx_image = new Image();
            loading++;
            layer.ctx_image.onload = () => {
                loading--;
                if (loading == 0) {
                    updateImage(psd);
                    // test();
                }
            }
            layer.ctx_image.src = toBase64;
        }
    })
}




function updateImage(psd) {
    if (!canvas) {
        canvas = document.getElementById('png_container');
        canvas.width = psd.image.width();
        canvas.height = psd.image.height();
        ctx = canvas.getContext('2d');
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    function drawVisibles(node) {
        for (let i = node.children().length - 1; i >= 0; i--) {
            const child = node.children()[i];
            if (child.layer.visible) {
                if (child.layer.ctx_image == null) {
                    let toBase64 = child.layer.image.toBase64();
                    child.layer.ctx_image = new Image();
                    child.layer.ctx_image.src = toBase64;
                }
                ctx.drawImage(child.layer.ctx_image, child.layer.left, child.layer.top);
                drawVisibles(child);
            }
        }
    }
    drawVisibles(psd.tree());
}



function updateEyePos(psd, x = 0, y = 0) {
    if (!faceData?.settings?.eye_move?.layer) return;

    if (!window.eye) {
        eye = psd.layers.find(v => v.node?.name == faceData.settings.eye_move.layer);
        eye_pos_def = [eye.left, eye.top];
    }
    eye.left = x + eye_pos_def[0];
    eye.top = y + eye_pos_def[1];
    updateImage(psd);
    console.log(`update eye pos: ${x}, ${y}`);
}

function randomEyePos(psd) {
    let x_max = faceData.settings?.eye_move?.x_max || 0;
    let x_min = faceData.settings?.eye_move?.x_min || 0;
    let y_max = faceData.settings?.eye_move?.y_max || 0;
    let y_min = faceData.settings?.eye_move?.y_min || 0;
    let r = Math.random() * Math.PI * 2;
    let x = Math.cos(r);
    x *= Math.abs(x > 0 ? x_max : x_min);
    let y = Math.sin(r);
    y *= Math.abs(y > 0 ? y_max : y_min);
    // updateEyePos(psd, Math.random() * x_max - Math.random() * x_min, Math.random() * y_max - Math.random() * y_min);
    updateEyePos(psd, x, y);
}



function updateLayers(psd, radioLayer, name) {
    if (!radioLayer.map(v => v.name).includes(name)) return;
    if (radioLayer.find(v => v.name == name).layer.visible) return;
    radioLayer.forEach(v => v.layer.visible = v.name == name);
    updateImage(psd);
    console.log(`update layer: ${name}`);
}

function updateMouth(psd, name) {
    updateLayers(psd, radioLayers.mouth, name);
}

function updateEyes(psd, name) {
    updateLayers(psd, radioLayers.eyes, name);
}

function updateArmLeft(psd, name) {
    updateLayers(psd, radioLayers.arm_left, name);
}

function updateArmRight(psd, name) {
    updateLayers(psd, radioLayers.arm_right, name);
}



function test() {
    if (!window.psd) {
        requestAnimationFrame(test);
        return;
    }

    updateMouth(window.psd, radioLayers.mouth.map(v => v.name)[Math.floor(Math.random() * radioLayers.mouth.length)]);

    console.log('test');
    setTimeout(test, Math.random() * 1000);
}
// test();