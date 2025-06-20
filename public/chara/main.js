var PSD = require('psd');
var pngElem = null;
var canvas = null;
var ctx = null;

const radioLayers = {
    "mouth": [],
    "eyes": [],
    "arm_left": [],
    "arm_right": [],
}

window.addEventListener('DOMContentLoaded', () => {
    PSD.fromURL('psd/四国めたん立ち絵素材2.1/四国めたん立ち絵素材2.1.psd').then(psd => {
        window.psd = psd;

        logLayers(psd);

        getRadioLayers(psd);
        createLayersImageCtx(psd);
    }).catch(e => console.error('PSD load error:', e));
});



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



function updateMouth(psd, name) {
    if (!radioLayers.mouth.map(v => v.name).includes(name)) return;
    radioLayers.mouth.forEach(v => v.layer.visible = v.name == name);
    updateImage(psd);
    console.log(`update mouth: ${name}`);
}

function updateEyes(psd, name) {
    console.log(`update eyes: ${name}`)
    updateImage(psd);
}

function updateArmLeft(psd, name) {
    console.log(`update arm_left: ${name}`)
    updateImage(psd);
}

function updateArmRight(psd, name) {
    console.log(`update arm_right: ${name}`)
    updateImage(psd);
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