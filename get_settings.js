const fs = require('fs');
const path = require('path');

const SETTINGS = JSON.parse(fs.readFileSync(path.join(__dirname, 'settings.json'), 'utf-8'));

module.exports = SETTINGS;