const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  
  console.log("Navigating to local server...");
  await page.goto('http://localhost:8080');
  
  console.log("Creating test video...");
  // Create a minimal test video
  await page.evaluate(async () => {
    function createTestVideo() {
      return new Promise((resolve, reject) => {
        const c = document.createElement('canvas'); c.width = 320; c.height = 240;
        const ctx = c.getContext('2d');
        const stream = c.captureStream(24);
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks = [];
        recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
        recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
        recorder.start(100);
        const interval = setInterval(() => { ctx.fillStyle = 'blue'; ctx.fillRect(0,0,320,240); }, 1000/24);
        setTimeout(() => { clearInterval(interval); recorder.stop(); }, 1000);
      });
    }
    const blob = await createTestVideo();
    const file = new File([blob], "test.webm", { type: "video/webm" });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const fileInput = document.getElementById('file-input');
    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  });
  
  console.log("Waiting for UI to render configure section...");
  await new Promise(r => setTimeout(r, 1000));
  
  console.log("Clicking Enhance Now button (#btn-process)...");
  await page.evaluate(() => {
    const btn = document.getElementById('btn-process') || document.getElementById('enhance-btn');
    if(btn) btn.click();
  });
  
  console.log("Waiting 3 seconds to observe processing page...");
  await new Promise(r => setTimeout(r, 3000));
  
  const stepUpload = await page.evaluate(() => document.getElementById('step-upload').style.display);
  const stepConfig = await page.evaluate(() => document.getElementById('step-configure').style.display);
  const stepProc = await page.evaluate(() => document.getElementById('step-processing').style.display);
  const stepResult = await page.evaluate(() => document.getElementById('step-result').style.display);
  
  console.log("UI STATE:");
  console.log("  Upload:", stepUpload);
  console.log("  Configure:", stepConfig);
  console.log("  Processing:", stepProc);
  console.log("  Result:", stepResult);
  
  console.log("Test finished.");
  await browser.close();
})();
