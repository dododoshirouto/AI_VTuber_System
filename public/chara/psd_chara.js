// psd_chara.js

const twincles_data = {
    isClose: false,
    intervalTime: 0,
    intervalTimeMax: 0
}
async function update_twinkle() {
    // まばたき
    twincles_data.intervalTime += deltaTime;
    const settings = faceData.settings.twinkles;

    if (twincles_data.intervalTime >= twincles_data.intervalTimeMax) {
        // 閉じと開きの切り替え
        twincles_data.isClose = !twincles_data.isClose;
        let intervalRange = twincles_data.isClose ? settings.closeIntervalRange : settings.openIntervalRange;
        twincles_data.intervalTimeMax = intervalRange.min + Math.random() * (intervalRange.max - intervalRange.min);
        twincles_data.intervalTime = 0;
    }

    if (twincles_data.intervalTime <= settings.twinclingTime) {
        // 切替時のアニメーション
        let rate = twincles_data.intervalTime / settings.twinclingTime;
        if (!twincles_data.isClose) {
            rate = 1 - rate;
        }
        rate = Math.min(Math.max(rate, 0), 1);
        updateEyes(window.psd, faceData.eye_close[Math.floor(rate * faceData.eye_close.length)]);
    }
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
                ctx.drawImage(child.layer.ctx_image, child.left, child.top);
                drawVisibles(child);
            }
        }
    }
    drawVisibles(psd.tree());
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