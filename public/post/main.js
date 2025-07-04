
const audio_query_json = "../chara/current.json";
var audio_query = null;
var bookmark = null;
const container_elem = document.getElementById("container");

// var time = 0;
// var lastTime = 0;
// var deltaTime = 0;
// async function update() {
//     while (true) {
//         await new Promise(r => requestAnimationFrame(r));
//         lastTime = time;
//         time = Date.now() / 1000;
//         deltaTime = time - lastTime;
//     }
// }
// update();

var last_text = "";
async function json_update_check() {
    while (true) {
        await new Promise(r => setTimeout(r, 500));
        try {
            let json = await fetch(audio_query_json + '?' + Date.now()).then(res => res.json()).then(json => json);
            if (json.text != last_text) {
                if (bookmark?.url != json.bookmark?.url) container_elem.classList.remove('display');
                last_text = json.text;
                try {
                    await load_audio_query_json();
                } catch (e) {
                    console.error(e);
                }
            }
        } catch (e) {
            console.error(e);
        }
    }
}
(async () => await json_update_check())();

async function load_audio_query_json() {
    let json = await fetch(audio_query_json + '?' + Date.now()).then(res => res.json()).then(json => json);
    audio_query = json;
    if (bookmark?.url != json.bookmark?.url) {
        bookmark = audio_query.bookmark;
        display_bookmark_embed();
    }
}

function display_bookmark_embed() {
    if (!bookmark) {
        // container_elem.innerHTML = "";
        container_elem.classList.remove('display');
        return;
    }

    container_elem.innerHTML = `
        <blockquote class="twitter-tweet" data-lang="ja" data-dnt="true">
            <p lang="ja" dir="ltr">${bookmark.text}</p>
            — ${bookmark.author} <a href="${bookmark.url.replace('x.com', 'twitter.com')}?ref_src=twsrc%5Etfw">${bookmark.time}</a>
        </blockquote>
    `;

    if (window.twttr && window.twttr.widgets) {
        window.twttr.widgets.load(container_elem);
        setTimeout(() => container_elem.classList.add('display'), 1000);
    } else {
        const script = document.createElement('script');
        script.src = 'https://platform.twitter.com/widgets.js';
        script.onload = () => window.twttr.widgets.load(container_elem); // ←重要！
        document.body.appendChild(script);
    }
}