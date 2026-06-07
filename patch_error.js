const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');
code = code.replace(/video\.onerror = \(\) => safeReject\(new Error\('Video playback error'\)\);/g, 
  "video.onerror = (e) => safeReject(new Error('Video onerror: [' + (video.error ? video.error.code : 'no-code') + '] ' + (video.error && video.error.message ? video.error.message : 'Unknown detail')));");
fs.writeFileSync('main.js', code);
console.log("Updated error logging.");
