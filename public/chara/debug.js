var query = {};
((document.location.search + document.location.hash).match(/([^?&=]+(=[^?&=]*|))/g) ?? []).map((v) => {
    let m = v.match(/([^=]+)/g);
    m[1] == decodeURIComponent(m[1]);
    if (typeof m[1] == 'string' && m[1].toUpperCase() == 'TRUE') m[1] = true;
    if (typeof m[1] == 'string' && m[1].toUpperCase() == 'FALSE') m[1] = false;
    if (m[1] == m[1] - 0) m[1] = m[1] - 0;
    query[decodeURIComponent(m[0])] = m[1] ?? true;
});
Object.keys(query).map((k) => {
    if (!query[k]) return;
    if (query[k] === true) document.body.classList.add(k);
    else document.body.classList.add(`${k}-${query[k]}`);
});



var error_box = document.getElementById('debug_console');

function add_error_text(situation, error) {
    error_box.innerText = `[${situation}] : ${error}`;
}

window.addEventListener('error', function (event) {
    add_error_text('JS ERROR', `${event.message} @ ${event.filename}:${event.lineno}`);
});

window.addEventListener('unhandledrejection', function (event) {
    add_error_text('PROMISE ERROR', `${event.reason}`);
});