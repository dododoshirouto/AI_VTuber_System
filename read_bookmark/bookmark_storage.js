const fs = require('fs');
const path = require('path');

const savePath = path.resolve(__dirname, 'bookmarks.json');

function loadBookmarks() {
    if (fs.existsSync(savePath)) {
        return JSON.parse(fs.readFileSync(savePath, 'utf-8'));
    } else {
        return [];
    }
}

function saveBookmarks(bookmarks) {
    fs.mkdirSync(path.dirname(savePath), { recursive: true });
    fs.writeFileSync(savePath, JSON.stringify(bookmarks, null, 2));
}

module.exports = {
    loadBookmarks,
    saveBookmarks,
};
