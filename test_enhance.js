const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  
  console.log("Navigating to local server...");
  await page.goto('http://localhost:8080');
  
  console.log("Uploading test video...");
  const inputUploadHandle = await page.$('#file-input');
  const filePath = path.join(__dirname, 'test_video.mp4');
  await inputUploadHandle.uploadFile(filePath);
  
  console.log("Waiting for UI to render configure section...");
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("Clicking Enhance Now button (#btn-process)...");
  try {
    await page.click('#btn-process');
    console.log("Button clicked successfully.");
  } catch (e) {
    console.log("Could not click button:", e.message);
  }
  
  console.log("Waiting 3 seconds to capture processing logs...");
  await new Promise(r => setTimeout(r, 3000));
  
  console.log("Test finished.");
  await browser.close();
})();
