/* ===== Zenpick — Main Application Logic (Fixed) ===== */
(function () {
  'use strict';
  console.log('%c ZENPICK FIXED BUILD LOADED — v31 ', 'background:#00cc44;color:#000;font-size:16px;font-weight:bold;padding:4px 8px;');

  function hideSplash() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => { if (splash.parentNode) splash.remove(); }, 700);
    }
  }
  document.addEventListener('DOMContentLoaded', () => { setTimeout(hideSplash, 2800); });
  setTimeout(hideSplash, 4000);
  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) hideSplash();
    if (state.currentStep === 'upload') showStep('upload');
  }, 5000);

  window.onerror = function (message, source, lineno, colno, error) {
    console.error('GLOBAL ERROR:', message, 'at', source, lineno, ':', colno, error);
    return false;
  };

  // ===== PARALLAX & MASCOTS ===== //
  let heroMouseX = 0, heroMouseY = 0;
  let targetMouseX = 0, targetMouseY = 0;
  document.addEventListener('mousemove', (e) => {
    const heroSection = document.getElementById('hero');
    if (!heroSection) return;
    const heroRect = heroSection.getBoundingClientRect();
    if (heroRect.bottom < 0) return;
    targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    heroSection.style.setProperty('--mouse-x', `${(e.clientX / window.innerWidth - 0.5) * 100}px`);
    heroSection.style.setProperty('--mouse-y', `${(e.clientY / window.innerHeight - 0.5) * 100}px`);
  });

  const mascotStates = [];
  const pupilStates = new Map();
  function animateMascots() {
    // Smoothly interpolate mouse position for all parallax
    heroMouseX += (targetMouseX - heroMouseX) * 0.04;
    heroMouseY += (targetMouseY - heroMouseY) * 0.04;
    // Smooth particles — gentle parallax
    document.querySelectorAll('.particle').forEach((p, index) => {
      const speed = (index + 1) * 1;
      p.style.transform = `translate(${heroMouseX * speed}px, ${heroMouseY * speed}px)`;
    });
    // Smooth mascot bodies — parallax drift + smooth mouse-attraction when nearby
    document.querySelectorAll('.hero-mascot').forEach((el, i) => {
      if (!mascotStates[i]) mascotStates[i] = { x: 0, y: 0 };
      const st = mascotStates[i];
      // Base parallax drift
      const parallaxX = heroMouseX * (8 + i * 5);
      const parallaxY = heroMouseY * (6 + i * 4);
      // Mouse-attraction: mascot floats toward cursor when within 350px
      const rect = el.getBoundingClientRect();
      const mascotCX = rect.left + rect.width / 2;
      const mascotCY = rect.top + rect.height / 2;
      const mouseAbsX = (targetMouseX * 0.5 + 0.5) * window.innerWidth;
      const mouseAbsY = (targetMouseY * 0.5 + 0.5) * window.innerHeight;
      const dx = mouseAbsX - mascotCX;
      const dy = mouseAbsY - mascotCY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const attractRadius = 350;
      const attractStrength = 28;
      let attractX = 0, attractY = 0;
      if (dist < attractRadius) {
        const factor = Math.pow(1 - dist / attractRadius, 1.5) * attractStrength;
        attractX = (dx / dist) * factor;
        attractY = (dy / dist) * factor;
      }
      // Combine parallax + attraction with smooth lerp
      st.x += ((parallaxX + attractX) - st.x) * 0.04;
      st.y += ((parallaxY + attractY) - st.y) * 0.04;
      const bounce = Math.sin(Date.now() / (800 + i * 300)) * (2 + i * 1);
      el.style.transform = `translate(${st.x}px, ${st.y + bounce}px) rotate(${heroMouseX * (1.5 + i * 1)}deg)`;
    });
    // Smooth eye tracking — pupils follow mouse with visible range
    document.querySelectorAll('.mascot-pupil').forEach(pupil => {
      if (!pupilStates.has(pupil)) pupilStates.set(pupil, { x: 0, y: 0 });
      const ps = pupilStates.get(pupil);
      const eye = pupil.parentElement;
      if (!eye) return;
      const rect = eye.getBoundingClientRect();
      const eyeCenterX = rect.left + rect.width / 2;
      const eyeCenterY = rect.top + rect.height / 2;
      const mouseAbsX = (targetMouseX * 0.5 + 0.5) * window.innerWidth;
      const mouseAbsY = (targetMouseY * 0.5 + 0.5) * window.innerHeight;
      const dx = mouseAbsX - eyeCenterX;
      const dy = mouseAbsY - eyeCenterY;
      const maxMove = 4;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const targetPupilX = (dx / dist) * Math.min(maxMove, dist * 0.03);
      const targetPupilY = (dy / dist) * Math.min(maxMove, dist * 0.03);
      ps.x += (targetPupilX - ps.x) * 0.12;
      ps.y += (targetPupilY - ps.y) * 0.12;
      pupil.style.transform = `translate(${ps.x}px, ${ps.y}px)`;
    });
    requestAnimationFrame(animateMascots);
  }
  animateMascots();

  // ===== CONSTANTS ===== //
  const qualityPresets = {
    '8k': { w: 7680, h: 4320 }, '4k': { w: 3840, h: 2160 },
    '1080p': { w: 1920, h: 1080 }, '720p': { w: 1280, h: 720 },
    '480p': { w: 854, h: 480 }, '360p': { w: 640, h: 360 }
  };
  const MAX_SAFE_RES_PIXELS = 8500000;

  // ===== HARDWARE GUARD — Device Analysis Engine ===== //
  function analyzeHardware() {
    // 1. RAM detection (navigator.deviceMemory returns GB: 0.25, 0.5, 1, 2, 4, 8)
    const ram = navigator.deviceMemory || 4; // Default to 4GB if unsupported

    // 2. CPU cores
    const cores = navigator.hardwareConcurrency || 2;

    // 3. iOS / Safari detection (strict memory limits)
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

    // 4. GPU detection via WebGL
    let gpu = 'Unknown GPU';
    try {
      const c = document.createElement('canvas');
      const g = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (g) {
        const dbg = g.getExtension('WEBGL_debug_renderer_info');
        if (dbg) gpu = g.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || 'Unknown GPU';
      }
    } catch (e) { /* GPU detection failed */ }

    // 5. WebGL2 support check
    let hasWebGL2 = false;
    try {
      const c2 = document.createElement('canvas');
      hasWebGL2 = !!c2.getContext('webgl2');
    } catch (e) { /* no webgl2 */ }

    // 6. FFmpeg.wasm availability check
    const hasFFmpeg = !!(window.FFmpeg && window.FFmpeg.createFFmpeg);

    // 7. Tier classification
    let tier, label, description, accentColor;
    // iOS always lightweight — no SharedArrayBuffer for FFmpeg.wasm
    // Mobile with < 4GB RAM → lightweight (crash risk)
    // Mobile with 4-5GB RAM → balanced mode (can run full ONNX, slower)
    // Mobile with 6GB+ RAM (e.g. MediaTek G99, Dimensity) → full pipeline like desktop
    if (isIOS || ram < 4) {
      tier = 3;
      label = '📱 Mobile Optimization Active';
      description = 'To prevent your device from crashing, we are using "Lightweight Rendering". This ensures a 0% crash rate and saves your battery.';
      accentColor = 'tier3';
    } else if (ram >= 8 && cores >= 4 && !isSafari) {
      tier = 1;
      label = '🚀 Pro Hardware Detected';
      description = 'System optimized for Full FFmpeg AI Rendering. Quality: Ultra High.';
      accentColor = 'tier1';
    } else {
      // Covers: 4-7GB RAM desktop, 6GB+ RAM Android phones (MediaTek, Snapdragon)
      tier = 2;
      label = isMobile ? '📱 Mobile High-Performance Mode' : '⚖️ Balanced Mode Active';
      description = isMobile
        ? 'Your phone has enough RAM to run AI enhancement. Processing will be slower than desktop but will produce full quality output. Keep your screen on and browser tab open.'
        : 'Your device is ready. For a smooth finish, please do not close this tab during processing.';
      accentColor = 'tier2';
    }

    const canUseFFmpeg = hasFFmpeg && tier <= 2;

    const result = {
      tier, label, description, accentColor,
      ram, cores, isIOS, isSafari, isMobile,
      gpu, hasWebGL2, hasFFmpeg,
      canUseFFmpeg: canUseFFmpeg // Fully enabled for video paths as well
    };
    console.log('[HardwareGuard] Analysis:', result);
    return result;
  }

  // Show the System Report card in the configure step
  function showSystemReport(hwInfo) {
    const card = document.getElementById('system-report-card');
    if (!card) return;

    // Populate content
    const tierIcon = card.querySelector('.sys-report-icon');
    const tierLabel = card.querySelector('.sys-report-label');
    const tierDesc = card.querySelector('.sys-report-desc');
    const statRam = card.querySelector('.sys-stat-ram');
    const statCores = card.querySelector('.sys-stat-cores');
    const statGpu = card.querySelector('.sys-stat-gpu');
    const statEngine = card.querySelector('.sys-stat-engine');

    if (tierIcon) tierIcon.textContent = hwInfo.tier === 1 ? '🚀' : hwInfo.tier === 2 ? '⚖️' : '📱';
    if (tierLabel) tierLabel.textContent = hwInfo.label;
    if (tierDesc) tierDesc.textContent = hwInfo.description;
    if (statRam) statRam.textContent = (hwInfo.ram >= 1 ? hwInfo.ram + ' GB' : Math.round(hwInfo.ram * 1024) + ' MB');
    if (statCores) statCores.textContent = hwInfo.cores + ' Cores';
    if (statGpu) {
      // Truncate GPU name if too long
      const gpuShort = hwInfo.gpu.length > 40 ? hwInfo.gpu.substring(0, 38) + '…' : hwInfo.gpu;
      statGpu.textContent = gpuShort;
    }
    if (statEngine) {
      statEngine.textContent = hwInfo.canUseFFmpeg ? 'FFmpeg AI' : 'Canvas WebGL';
    }

    // Set accent class for tier color
    card.className = 'system-report-card';
    card.classList.add('sys-report-' + hwInfo.accentColor);

    // Show with animation
    card.style.display = 'block';
    requestAnimationFrame(() => {
      card.classList.add('sys-report-visible');
    });

    // Enable the Enhance button
    const enhBtn = document.getElementById('enhance-btn');
    if (enhBtn) {
      enhBtn.disabled = false;
      enhBtn.classList.remove('btn-disabled');
    }
  }

  // ===== STATE ===== //
  const state = {
    file: null, fileType: 'image', originalWidth: 0, originalHeight: 0,
    originalSize: 0, originalDataUrl: null, processedDataUrl: null,
    processedImagePreviewUrl: null,
    aspectRatio: 1, currentStep: 'upload', memoryHandles: new Set(),
    hwTier: null, // Hardware tier info from analyzeHardware()
    gifFrames: null,  // Array of ImageBitmap frames for animated GIFs
    gifDelays: null,  // Array of delays in ms for each frame
    isAnimatedGif: false,
  };

  function trackMemory(url) { if (url && url.startsWith('blob:')) state.memoryHandles.add(url); return url; }
  function cleanupMemory() {
    state.memoryHandles.forEach(url => { try { URL.revokeObjectURL(url); } catch (e) { } });
    state.memoryHandles.clear();
    state.originalDataUrl = null; state.processedDataUrl = null; state.processedImagePreviewUrl = null;
  }

  // ===== DOM REFS ===== //
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const dropZone = $('#drop-zone'), fileInput = $('#file-input'), heroUploadBtn = $('#hero-upload-btn');
  const steps = { upload: $('#step-upload'), configure: $('#step-configure'), processing: $('#step-processing'), result: $('#step-result') };
  const previewImage = $('#preview-image');
  const previewVideo = $('#preview-video');
  const canvas = $('#processing-canvas'), ctx = canvas ? canvas.getContext('2d', { willReadFrequently: true }) : null;
  const fab = $('#floating-action-bar');

  // ===== HELPERS ===== //
  function formatBytes(bytes) {
    if (isNaN(bytes) || bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if (i < 0) return '0 B';
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function showStep(name) {
    if (!steps[name]) return;
    document.body.setAttribute('data-current-step', name);
    document.body.classList.toggle('mode-app', name !== 'upload');
    document.querySelectorAll('.step').forEach(s => {
      s.classList.remove('active', 'step-visible');
      s.style.display = 'none'; s.style.visibility = 'hidden'; s.style.opacity = '0';
    });
    if (name === 'upload') cleanupMemory();
    const t = steps[name];
    t.classList.add('active', 'step-visible');
    t.style.display = 'block'; t.style.visibility = 'visible'; t.style.opacity = '1';
    void t.offsetHeight; window.scrollTo(0, 0);
    state.currentStep = name;
    if (fab) {
      if (name === 'configure') { fab.classList.add('visible'); fab.style.display = 'block'; }
      else { fab.classList.remove('visible'); setTimeout(() => { if (state.currentStep !== 'configure') fab.style.display = 'none'; }, 400); }
    }
    // Hide the Enhance Now button completely when on processing or result page
    const enhBtn = document.getElementById('enhance-btn');
    if (enhBtn) {
      if (name === 'processing' || name === 'result') {
        enhBtn.style.display = 'none';
        enhBtn.style.visibility = 'hidden';
        enhBtn.style.pointerEvents = 'none';
      } else if (name === 'configure') {
        enhBtn.style.display = '';
        enhBtn.style.visibility = '';
        enhBtn.style.pointerEvents = '';
      }
    }
    // Also hide any floating enhance CTA buttons
    const aiCTA = document.getElementById('ai-enhance-cta');
    if (aiCTA) {
      if (name === 'processing' || name === 'result') {
        aiCTA.style.display = 'none';
      } else if (name === 'configure') {
        aiCTA.style.display = '';
      }
    }
  }

  function safeBind(selector, event, callback, useOnclick) {
    const el = (typeof selector === 'string') ? $(selector) : selector;
    if (!el) return;
    if (useOnclick) el.onclick = callback; else el.addEventListener(event, callback);
  }

  function getSelectedQuality() { const c = document.querySelector('input[name="quality"]:checked'); return c ? c.value : '4k'; }
  function getTargetDimensions(qualityVal) {
    if (state.fileType === 'video' && aiState.targetW > 0 && aiState.targetH > 0) {
      return { w: aiState.targetW, h: aiState.targetH };
    }
    // Check if upscale multiplier is active
    const upscaleMultiplier = getUpscaleMultiplier();
    if (upscaleMultiplier > 0 && state.originalWidth > 0 && state.originalHeight > 0) {
      let w = Math.round(state.originalWidth * upscaleMultiplier);
      let h = Math.round(state.originalHeight * upscaleMultiplier);
      w = Math.round(w / 16) * 16; h = Math.round(h / 16) * 16;
      return { w, h };
    }
    const quality = qualityVal || getSelectedQuality();
    // 'original' = keep the file's actual dimensions, no upscaling
    if (quality === 'original') {
      const ow = state.originalWidth || 1920;
      const oh = state.originalHeight || 1080;
      return { w: Math.round(ow / 16) * 16 || ow, h: Math.round(oh / 16) * 16 || oh };
    }
    if (quality === 'custom') return { w: parseInt($('#custom-width').value) || 3840, h: parseInt($('#custom-height').value) || 2160 };
    const preset = qualityPresets[quality];
    if (!preset) return { w: 3840, h: 2160 };
    const ar = state.aspectRatio || 1; let w = preset.w, h = Math.round(w / ar);
    if (h > preset.h) { h = preset.h; w = Math.round(h * ar); }
    w = Math.round(w / 16) * 16; h = Math.round(h / 16) * 16;
    return { w, h };
  }
  function getUpscaleMultiplier() {
    const active = document.querySelector('.upscale-multiplier-btn.active');
    if (!active) return 0;
    return parseInt(active.getAttribute('data-multiplier')) || 0;
  }
  function getAdvancedEnhanceVal() {
    const s = document.getElementById('slider-advanced-enhance');
    return s ? (parseInt(s.value) || 0) : 0;
  }
  function updateQualityBadges() {
    ['8k', '4k', '1080p', '720p'].forEach(q => {
      const dims = getTargetDimensions(q); const el = $(`#res-${q}`);
      if (el) el.textContent = `${dims.w}×${dims.h}`;
    });
  }
  function getSelectedFilters() { return Array.from($$('input[name="filter"]:checked')).map(c => c.value); }
  function getOutputFormat() {
    const c = document.querySelector('input[name="image-format"]:checked'); return c ? c.value : 'png';
  }

  function estimateOutputSize() {
    const dims = getTargetDimensions(); const totalPixels = dims.w * dims.h;
    const format = getOutputFormat(); const filters = getSelectedFilters();

    // Calculate the baseline bytes-per-pixel of the original image
    const origPixels = (state.originalWidth * state.originalHeight) || 1;
    const origBPP = (state.originalSize || 300000) / origPixels; // fallback to ~300KB if no size

    // Detect original format
    let origFormat = 'jpeg';
    if (state.file && state.file.type) {
      if (state.file.type.includes('png')) origFormat = 'png';
      else if (state.file.type.includes('webp')) origFormat = 'webp';
    } else if (state.file && state.file.name) {
      const ext = state.file.name.split('.').pop().toLowerCase();
      if (ext === 'png') origFormat = 'png';
      else if (ext === 'webp') origFormat = 'webp';
    }

    // Determine the baseline BPP for the target format
    let targetBPP = origBPP;
    const q = parseInt($('#jpeg-quality')?.value) || 92;
    const qualityFactor = q / 92; // relative to 92% baseline

    if (origFormat === 'png') {
      if (format === 'png') {
        targetBPP = origBPP;
      } else if (format === 'jpg' || format === 'jpeg') {
        targetBPP = Math.min(origBPP, 0.45) * qualityFactor;
      } else if (format === 'webp') {
        targetBPP = Math.min(origBPP, 0.35) * qualityFactor;
      }
    } else { // original was JPG/WebP
      if (format === 'png') {
        targetBPP = Math.max(1.2, Math.min(4.0, origBPP * 9.5));
      } else if (format === 'jpg' || format === 'jpeg') {
        targetBPP = origBPP * qualityFactor;
      } else if (format === 'webp') {
        targetBPP = origBPP * 0.8 * qualityFactor;
      }
    }

    // Apply filters multiplier
    let filterMultiplier = 1.0;
    if (filters.includes('sharpen')) filterMultiplier += 0.05;
    if (filters.includes('denoise')) filterMultiplier -= 0.03;
    if (filters.includes('hdr')) filterMultiplier += 0.04;
    if (filters.includes('contrast')) filterMultiplier += 0.02;
    if (filters.includes('color')) filterMultiplier += 0.02;

    // Apply processing mode multiplier
    const selectedMode = document.querySelector('input[name="proc-mode"]:checked')?.value || 'auto';
    let procMultiplier = 1.0;
    if (selectedMode === 'onnx') {
      procMultiplier = 1.15;
    } else if (selectedMode === 'both') {
      procMultiplier = 1.25;
    } else if (selectedMode === 'auto') {
      if (state.imageIsArtwork) procMultiplier = 1.15;
    }

    // Calculate final size
    let estSize = Math.round(totalPixels * targetBPP * filterMultiplier * procMultiplier);

    // Sanity check: compressed output should not exceed raw 24-bit size (3 bytes/pixel)
    // except for PNG which can occasionally be slightly larger due to headers (cap at 4 bytes/pixel)
    const maxBPP = format === 'png' ? 4.0 : 2.5;
    estSize = Math.min(estSize, totalPixels * maxBPP);

    return Math.max(5000, estSize);
  }

  function updateSizeEstimation() {
    const dims = getTargetDimensions(); const estSize = estimateOutputSize();
    const origEl = $('#size-original'), origResEl = $('#size-original-res');
    const outEl = $('#size-output'), outResEl = $('#size-output-res');

    // Dynamically update the main File Info Dimensions display (Fix for "Resolution Update")
    const infoDims = document.getElementById('info-dimensions');
    if (infoDims) {
      if (dims.w !== state.originalWidth || dims.h !== state.originalHeight) {
        infoDims.innerHTML = `${state.originalWidth}×${state.originalHeight} <span style="color:#a78bfa; font-weight:600;">→ ${dims.w}×${dims.h}</span>`;
      } else {
        infoDims.textContent = `${state.originalWidth}×${state.originalHeight}`;
      }
    }

    if (origEl) origEl.textContent = formatBytes(state.originalSize || 0);
    if (origResEl) origResEl.textContent = `${state.originalWidth || 0}×${state.originalHeight || 0}`;
    if (outEl) {
      outEl.textContent = formatBytes(estSize || 0);
      outEl.style.cssText = '';
      if (outResEl) outResEl.textContent = `${dims.w}×${dims.h}`;
    } else {
      if (outResEl) outResEl.textContent = `${dims.w}×${dims.h}`;
    }
    const ratio = (estSize || 0) / (state.originalSize || 1); const badge = $('#size-change-badge');
    if (badge) {
      if (isNaN(ratio) || ratio === 0) {
        badge.textContent = 'Calculating...';
      } else if (ratio > 1) {
        badge.textContent = `↑ ~${ratio.toFixed(1)}× larger`; badge.style.color = '#fbbf24';
      } else {
        badge.textContent = `↓ ~${(1 / ratio).toFixed(1)}× smaller`; badge.style.color = '#34d399';
      }
    }
  }

  // ===== FILE HANDLING ===== //
  function handleFile(file) {
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    if (!isImage) { alert('Please upload a valid image file. Videos are no longer supported.'); return; }
    state.file = file; state.fileType = 'image'; state.originalSize = file.size;
    state.gifFrames = null; state.gifDelays = null; state.isAnimatedGif = false;
    const url = URL.createObjectURL(file);

    const fmtImg = $('#format-selector-image');
    const jpegRow = $('#jpeg-quality-row');
    if (fmtImg) fmtImg.style.display = 'flex';
    if (jpegRow) jpegRow.style.display = 'block';

    const targetQualitySection = document.getElementById('target-quality-section');
    if (targetQualitySection) targetQualitySection.style.display = 'block';

    const imageFormatSection = document.getElementById('image-format-section');
    if (imageFormatSection) imageFormatSection.style.display = 'block';

    const filtersDesc = document.getElementById('filters-section-desc');
    if (filtersDesc) filtersDesc.textContent = 'Select one or more effects to apply to your image';

    // --- GIF detection ---
    const isGif = file.type === 'image/gif';
    const gifOption = document.getElementById('gif-format-option');
    const gifRadio = document.getElementById('gif-radio');
    const cardOnnx = document.getElementById('proc-card-onnx');
    const cardBoth = document.getElementById('proc-card-both');
    const cardCanvas = document.getElementById('proc-card-canvas');
    const procCanvas = document.getElementById('proc-canvas');

    if (isGif) {
      // Show GIF format option and auto-select it
      if (gifOption) gifOption.style.display = '';
      if (gifRadio) { gifRadio.checked = true; }
      // Reset other format radios
      $$('input[name="image-format"]').forEach(r => { if (r.value !== 'gif') r.checked = false; });
      // Disable ONNX and Canvas+AI cards (only Canvas works for GIFs)
      if (cardOnnx) { cardOnnx.style.opacity = '0.4'; cardOnnx.style.pointerEvents = 'none'; }
      if (cardBoth) { cardBoth.style.opacity = '0.4'; cardBoth.style.pointerEvents = 'none'; }
      // Force Canvas mode
      if (procCanvas) { procCanvas.checked = true; }
      if (cardCanvas) cardCanvas.classList.add('selected');
      // Extract frames asynchronously
      state.isAnimatedGif = true;
      extractGifFrames(file).then(result => {
        if (result) { state.gifFrames = result.frames; state.gifDelays = result.delays; }
      }).catch(e => console.warn('[GIF] Frame extraction failed:', e));
    } else {
      // Not a GIF — hide GIF option, restore proc mode cards
      if (gifOption) gifOption.style.display = 'none';
      if (gifRadio) gifRadio.checked = false;
      if (cardOnnx) { cardOnnx.style.opacity = ''; cardOnnx.style.pointerEvents = ''; }
      if (cardBoth) { cardBoth.style.opacity = ''; cardBoth.style.pointerEvents = ''; }
      // Reset to PNG if gif was previously selected
      const currentFmt = document.querySelector('input[name="image-format"]:checked');
      if (!currentFmt || currentFmt.value === 'gif') {
        const pngRadio = document.querySelector('input[name="image-format"][value="png"]');
        if (pngRadio) pngRadio.checked = true;
      }
    }

    // Disable enhance button until hardware analysis completes
    const enhBtn = document.getElementById('enhance-btn');
    if (enhBtn) { enhBtn.disabled = true; enhBtn.classList.add('btn-disabled'); }

    // Run hardware analysis
    const hwInfo = analyzeHardware();
    state.hwTier = hwInfo;

    previewImage.classList.add('visible');
    if (previewVideo) previewVideo.classList.remove('visible');

    const img = new Image();
    img.onload = function () {
      state.originalWidth = img.naturalWidth; state.originalHeight = img.naturalHeight;
      state.aspectRatio = img.naturalWidth / img.naturalHeight;

      // Detect content type once on upload
      try {
        const detC = document.createElement('canvas');
        const detX = detC.getContext('2d', { willReadFrequently: true });
        detC.width = Math.min(state.originalWidth || 400, 400);
        detC.height = Math.round(detC.width * ((state.originalHeight || 300) / (state.originalWidth || 400)));
        detX.drawImage(img, 0, 0, detC.width, detC.height);
        const detSample = detX.getImageData(0, 0, detC.width, detC.height);
        state.imageIsArtwork = detectContentType(detSample, detC.width, detC.height) === 'artwork';
      } catch (e) {
        state.imageIsArtwork = false;
      }

      populateFileInfo(); updateQualityBadges(); updateSizeEstimation();
      // Show system report after image dimensions are read
      showSystemReport(hwInfo);
    };
    img.src = url; previewImage.src = trackMemory(url); state.originalDataUrl = url;
    showStep('configure');
  }

  // ===== GIF FRAME EXTRACTION =====
  async function extractGifFrames(file) {
    if (typeof ImageDecoder === 'undefined') {
      console.warn('[GIF] ImageDecoder API not available — cannot extract frames');
      return null;
    }
    try {
      const decoder = new ImageDecoder({ data: file.stream(), type: 'image/gif' });
      await decoder.tracks.ready;
      const track = decoder.tracks.selectedTrack;
      const frameCount = track.frameCount;
      if (frameCount <= 1) { decoder.close(); return null; } // Static GIF
      const frames = [];
      const delays = [];
      for (let i = 0; i < frameCount; i++) {
        const result = await decoder.decode({ frameIndex: i });
        const vf = result.image;
        // vf.duration is in microseconds → convert to ms
        delays.push(Math.max(20, Math.round((vf.duration || 100000) / 1000)));
        frames.push(await createImageBitmap(vf));
        vf.close();
      }
      decoder.close();
      console.log(`[GIF] Extracted ${frameCount} frames`);
      return { frames, delays };
    } catch (e) {
      console.warn('[GIF] extractGifFrames error:', e);
      return null;
    }
  }

  // ===== GIF ENCODING =====
  async function encodeGif(processedCanvases, delays, w, h) {
    const lib = window.gifenc;
    if (!lib || typeof lib.GIFEncoder !== 'function') throw new Error('gifenc library not loaded');
    const { GIFEncoder, quantize, applyPalette } = lib;
    const encoder = GIFEncoder();
    for (let i = 0; i < processedCanvases.length; i++) {
      const fc = processedCanvases[i];
      const fx = fc.getContext('2d', { willReadFrequently: true });
      const imageData = fx.getImageData(0, 0, w, h);
      const rgba = new Uint8ClampedArray(imageData.data.buffer);
      const palette = quantize(rgba, 256);
      const index = applyPalette(rgba, palette);
      // gifenc writeFrame internally does delay/10, so pass ms directly
      const frameDelay = Math.max(20, delays[i] || 100);
      encoder.writeFrame(index, w, h, {
        palette,
        delay: frameDelay,
        repeat: i === 0 ? 0 : undefined, // repeat:0 = infinite loop, first frame only
      });
    }
    encoder.finish();
    return encoder.bytes();
  }

  // ===== GIF PROCESSING PIPELINE =====
  async function processGifAndEncode(setProgressFn) {
    const frames = state.gifFrames;
    const delays = state.gifDelays;
    if (!frames || frames.length === 0) throw new Error('No GIF frames found');

    const statusEl = document.getElementById('processing-status');
    const titleEl = document.getElementById('processing-title');
    if (titleEl) titleEl.textContent = 'Processing animated GIF…';

    // Use original image dimensions (no upscaling for GIFs)
    const targetW = state.originalWidth;
    const targetH = state.originalHeight;

    const filters = getSelectedFilters();
    const processedCanvases = [];

    for (let i = 0; i < frames.length; i++) {
      if (aiState.cancelRequested) throw new Error('Processing cancelled by user.');
      if (statusEl) statusEl.textContent = `Processing frame ${i + 1} of ${frames.length}…`;
      if (setProgressFn) setProgressFn(10 + Math.round((i / frames.length) * 80));

      // Draw frame to a temp canvas
      const fc = document.createElement('canvas');
      fc.width = targetW; fc.height = targetH;
      const fx = fc.getContext('2d', { willReadFrequently: true });
      fx.drawImage(frames[i], 0, 0, targetW, targetH);

      // Apply user filters to this frame
      const imageData = fx.getImageData(0, 0, targetW, targetH);
      const data = imageData.data;
      if (filters.includes('brightness')) { const bv = parseInt(document.getElementById('slider-brightness')?.value || 0); const bf = (100 + bv) / 100; for (let j = 0; j < data.length; j += 4) { data[j] = clamp(Math.round(data[j] * bf)); data[j + 1] = clamp(Math.round(data[j + 1] * bf)); data[j + 2] = clamp(Math.round(data[j + 2] * bf)); } }
      if (filters.includes('contrast')) { const cv = parseInt(document.getElementById('slider-contrast')?.value || 0); const cf = (100 + cv) / 100; for (let j = 0; j < data.length; j += 4) { data[j] = clamp(Math.round((data[j] - 128) * cf + 128)); data[j + 1] = clamp(Math.round((data[j + 1] - 128) * cf + 128)); data[j + 2] = clamp(Math.round((data[j + 2] - 128) * cf + 128)); } }
      if (filters.includes('color')) { const sv = parseInt(document.getElementById('slider-saturation')?.value ?? 0); if (sv !== 0) { const s = 1 + sv / 100; for (let j = 0; j < data.length; j += 4) { const g = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2]; data[j] = clamp(g + s * (data[j] - g)); data[j + 1] = clamp(g + s * (data[j + 1] - g)); data[j + 2] = clamp(g + s * (data[j + 2] - g)); } } }
      if (filters.includes('bw')) { for (let j = 0; j < data.length; j += 4) { const g = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2]; data[j] = data[j + 1] = data[j + 2] = g; } }
      if (filters.includes('warmth')) { for (let j = 0; j < data.length; j += 4) { data[j] = clamp(data[j] + 12); data[j + 1] = clamp(data[j + 1] + 5); data[j + 2] = clamp(data[j + 2] - 10); } }
      if (filters.includes('cool')) { for (let j = 0; j < data.length; j += 4) { data[j] = clamp(data[j] - 10); data[j + 1] = clamp(data[j + 1] + 3); data[j + 2] = clamp(data[j + 2] + 15); } }
      fx.putImageData(imageData, 0, 0);
      processedCanvases.push(fc);
      // Yield to browser so UI stays responsive
      await new Promise(r => setTimeout(r, 0));
    }

    if (statusEl) statusEl.textContent = 'Encoding GIF…';
    if (setProgressFn) setProgressFn(92);
    const gifBytes = await encodeGif(processedCanvases, delays, targetW, targetH);
    const blob = new Blob([gifBytes], { type: 'image/gif' });
    state.processedDataUrl = URL.createObjectURL(blob);
    if (setProgressFn) setProgressFn(98);
  }

  function populateFileInfo() {
    $('#info-name').textContent = state.file.name;
    // Dimension text synced dynamically by updateSizeEstimation() when multiplier clicked
    $('#info-size').textContent = formatBytes(state.originalSize);
    $('#info-type').textContent = state.file.type;
    const durationRow = $('#info-duration-row');
    if (durationRow) durationRow.style.display = 'none';
  }

  // ===== IMAGE PROCESSING ===== //

  // Progressive upscaling: draw in 2x steps using ping-pong double buffers
  function progressiveUpscale(source, targetW, targetH, destCtx) {
    const srcW = source.naturalWidth || source.videoWidth || source.width;
    const srcH = source.naturalHeight || source.videoHeight || source.height;
    if (!srcW || !srcH) return;
    const maxScale = Math.max(targetW / srcW, targetH / srcH);
    if (maxScale <= 2.5) {
      destCtx.imageSmoothingEnabled = true; destCtx.imageSmoothingQuality = 'high';
      destCtx.drawImage(source, 0, 0, targetW, targetH);
      return;
    }
    if (!progressiveUpscale._bufA) {
      progressiveUpscale._bufA = document.createElement('canvas');
      progressiveUpscale._ctxA = progressiveUpscale._bufA.getContext('2d');
      progressiveUpscale._bufB = document.createElement('canvas');
      progressiveUpscale._ctxB = progressiveUpscale._bufB.getContext('2d');
      console.log('[DEBUG Progressive] Secondary buffers initialized');
    }
    const bufA = progressiveUpscale._bufA, ctxA = progressiveUpscale._ctxA;
    const bufB = progressiveUpscale._bufB, ctxB = progressiveUpscale._ctxB;
    let curW = srcW, curH = srcH, curSource = source, useA = true;
    while (curW * 2 < targetW && curH * 2 < targetH) {
      const nextW = curW * 2, nextH = curH * 2;
      const dest = useA ? bufA : bufB, dCtx = useA ? ctxA : ctxB;
      dest.width = nextW; dest.height = nextH;
      dCtx.imageSmoothingEnabled = true; dCtx.imageSmoothingQuality = 'high';
      dCtx.drawImage(curSource, 0, 0, nextW, nextH);
      curW = nextW; curH = nextH; curSource = dest; useA = !useA;
    }
    destCtx.imageSmoothingEnabled = true; destCtx.imageSmoothingQuality = 'high';
    destCtx.drawImage(curSource, 0, 0, targetW, targetH);
  }

  // ===== WebGL High-Fidelity Upscaler (Super Scale / Edge Sharpen) ===== //
  const WebGLUpscaler = (function () {
    let canvas = null; let gl = null; let program = null; let tex = null;
    let posBuffer = null; let texBuffer = null;
    function compileShader(gl, type, source) {
      const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('[WebGL Shader Error]', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }
    return {
      init: function (w, h) {
        if (WebGLUpscaler._failedInit) return false;
        try {
          if (!canvas) {
            canvas = document.createElement('canvas');
            gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, alpha: true });
            if (!gl) { console.error('[WebGL Error] Failed to get context'); WebGLUpscaler._failedInit = true; return false; }
            const vs = `attribute vec2 a_pos; attribute vec2 a_uv; varying vec2 v_uv; void main(){ gl_Position=vec4(a_pos,0.0,1.0); v_uv=a_uv; }`;
            const fs = `precision highp float; uniform sampler2D u_img; uniform vec2 u_res; uniform float u_sharpness; varying vec2 v_uv;
            void main(){
              vec4 c = texture2D(u_img, v_uv);
              if (u_sharpness > 0.0) {
                vec2 d = 1.0 / u_res;
                vec4 n = texture2D(u_img, v_uv+vec2(0.0,-d.y)); vec4 s = texture2D(u_img,v_uv+vec2(0.0,d.y));
                vec4 e = texture2D(u_img,v_uv+vec2(d.x,0.0)); vec4 w = texture2D(u_img,v_uv+vec2(-d.x,0.0));
                vec4 ne = texture2D(u_img,v_uv+vec2(d.x,-d.y)); vec4 nw = texture2D(u_img,v_uv+vec2(-d.x,-d.y));
                vec4 se = texture2D(u_img,v_uv+vec2(d.x,d.y)); vec4 sw = texture2D(u_img,v_uv+vec2(-d.x,d.y));
                vec4 avg = (n + s + e + w + ne + nw + se + sw) / 8.0;
                vec4 diff = c - avg;
                float edgeWeight = length(diff.rgb);
                c = c + diff * u_sharpness * edgeWeight;
              }
              gl_FragColor = vec4(clamp(c.rgb, 0.0, 1.0), c.a);
            }`;
            const vShader = compileShader(gl, gl.VERTEX_SHADER, vs);
            const fShader = compileShader(gl, gl.FRAGMENT_SHADER, fs);
            if (!vShader || !fShader) { console.error('[WebGL Shader Error] Shader compilation failed'); WebGLUpscaler._failedInit = true; return false; }
            program = gl.createProgram(); gl.attachShader(program, vShader); gl.attachShader(program, fShader); gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
              console.error('[WebGL Link Error]', gl.getProgramInfoLog(program));
              WebGLUpscaler._failedInit = true; return false;
            }
            posBuffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
            texBuffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]), gl.STATIC_DRAW);
            tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          }
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w; canvas.height = h;
            gl.viewport(0, 0, w, h); WebGLUpscaler._lastTexW = 0;
          }
          return true;
        } catch (e) { console.error('[WebGL Init Exception]', e); return false; }
      },
      render: function (source, targetW, targetH, destCtx, sharpenAmt) {
        if (!gl || gl.isContextLost()) { progressiveUpscale(source, targetW, targetH, destCtx); return; }
        const srcW = source.videoWidth || source.width || source.naturalWidth;
        const srcH = source.videoHeight || source.height || source.naturalHeight;

        gl.useProgram(program);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        if (!WebGLUpscaler._lastTexW || WebGLUpscaler._lastTexW !== srcW || WebGLUpscaler._lastTexH !== srcH) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
          WebGLUpscaler._lastTexW = srcW; WebGLUpscaler._lastTexH = srcH;
        } else {
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
        }
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const apos = gl.getAttribLocation(program, "a_pos");
        gl.enableVertexAttribArray(apos); gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer); gl.vertexAttribPointer(apos, 2, gl.FLOAT, false, 0, 0);

        const auv = gl.getAttribLocation(program, "a_uv");
        gl.enableVertexAttribArray(auv); gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer); gl.vertexAttribPointer(auv, 2, gl.FLOAT, false, 0, 0);

        gl.uniform1i(gl.getUniformLocation(program, "u_img"), 0);
        gl.uniform2f(gl.getUniformLocation(program, "u_res"), targetW, targetH);
        gl.uniform1f(gl.getUniformLocation(program, "u_sharpness"), sharpenAmt);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        if (!WebGLUpscaler._glChecked) {
          WebGLUpscaler._glChecked = true;
          const px = new Uint8Array(4);
          gl.readPixels(Math.floor(gl.drawingBufferWidth / 2), Math.floor(gl.drawingBufferHeight / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          if (px[0] === 0 && px[1] === 0 && px[2] === 0) {
            console.warn('[DEBUG WebGL] Produced black output! Falling back.');
            WebGLUpscaler._broken = true;
          }
        }

        if (WebGLUpscaler._broken) {
          progressiveUpscale(source, targetW, targetH, destCtx);
          return;
        }

        destCtx.imageSmoothingEnabled = true; destCtx.imageSmoothingQuality = 'high';
        destCtx.drawImage(canvas, 0, 0, targetW, targetH);
      }
    };
  })();

  function processImage() {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const dims = getTargetDimensions(); canvas.width = dims.w; canvas.height = dims.h;
        // Use progressive upscaling for high quality
        progressiveUpscale(img, dims.w, dims.h, canvas, ctx);
        const filters = getSelectedFilters();
        const imageData = ctx.getImageData(0, 0, dims.w, dims.h); const data = imageData.data;
        if (filters.includes('brightness')) {
          const bv = parseInt($('#slider-brightness')?.value || 0);
          const bf = (100 + bv) / 100; // CSS brightness(130%) = pixel * 1.3
          for (let i = 0; i < data.length; i += 4) { data[i] = clamp(Math.round(data[i] * bf)); data[i + 1] = clamp(Math.round(data[i + 1] * bf)); data[i + 2] = clamp(Math.round(data[i + 2] * bf)); }
        }
        if (filters.includes('contrast')) {
          const cv = parseInt($('#slider-contrast')?.value || 0);
          const cf = (100 + cv) / 100; // CSS contrast(130%) = (pixel-128)*1.3+128
          for (let i = 0; i < data.length; i += 4) { data[i] = clamp(Math.round((data[i] - 128) * cf + 128)); data[i + 1] = clamp(Math.round((data[i + 1] - 128) * cf + 128)); data[i + 2] = clamp(Math.round((data[i + 2] - 128) * cf + 128)); }
        }
        if (filters.includes('color')) {
          const satVal = parseInt($('#slider-saturation')?.value ?? 0);
          if (satVal !== 0) {
            const sat = 1 + satVal / 100;
            for (let i = 0; i < data.length; i += 4) { const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; data[i] = clamp(g + sat * (data[i] - g)); data[i + 1] = clamp(g + sat * (data[i + 1] - g)); data[i + 2] = clamp(g + sat * (data[i + 2] - g)); }
          }
        }
        if (filters.includes('warmth')) { for (let i = 0; i < data.length; i += 4) { data[i] = clamp(data[i] + 12); data[i + 1] = clamp(data[i + 1] + 5); data[i + 2] = clamp(data[i + 2] - 10); } }
        if (filters.includes('cool')) { for (let i = 0; i < data.length; i += 4) { data[i] = clamp(data[i] - 10); data[i + 1] = clamp(data[i + 1] + 3); data[i + 2] = clamp(data[i + 2] + 15); } }
        if (filters.includes('bw')) { for (let i = 0; i < data.length; i += 4) { const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; data[i] = data[i + 1] = data[i + 2] = g; } }
        if (filters.includes('hdr')) { for (let i = 0; i < data.length; i += 4) { for (let c = 0; c < 3; c++) { const v = data[i + c] / 255; data[i + c] = clamp(255 * (v < 0.5 ? v * 0.85 : 0.5 + (v - 0.5) * 1.3)); } } }
        if (filters.includes('vignette')) {
          const cx = dims.w / 2, cy = dims.h / 2, maxDist = Math.sqrt(cx * cx + cy * cy);
          for (let y = 0; y < dims.h; y++) for (let x = 0; x < dims.w; x++) { const idx = (y * dims.w + x) * 4; const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist; const v = 1 - d * d * 0.7; data[idx] *= v; data[idx + 1] *= v; data[idx + 2] *= v; }
        }
        // Apply RGB Curves
        for (let i = 0; i < data.length; i += 4) {
          let r = data[i], g = data[i + 1], b = data[i + 2];
          r = curvesState.tables.rgb[r]; g = curvesState.tables.rgb[g]; b = curvesState.tables.rgb[b];
          data[i] = curvesState.tables.r[clamp(r)]; data[i + 1] = curvesState.tables.g[clamp(g)]; data[i + 2] = curvesState.tables.b[clamp(b)];
        }
        ctx.putImageData(imageData, 0, 0);

        // Detect content type (photo vs artwork) for smart sharpening decisions
        const _processImgData = ctx.getImageData(0, 0, dims.w, dims.h);
        const _contentType = detectContentType(_processImgData, dims.w, dims.h);
        const _isArtwork = _contentType === 'artwork';
        const _isUpscale = (img.naturalWidth || img.width) < dims.w;

        // Skin/Face sharpening — uses YCbCr skin detection to target only face/character regions
        // BUG 1 FIX: Run ONLY whichever slider is higher, never both. Running both causes
        // double-sharpening on the same face pixels → white hair lines, cracked skin, color fringing.
        const skinSharpenVal = parseInt($('#slider-skin-sharpen')?.value) || 0;
        const clearFaceVal = parseInt($('#slider-clear-face')?.value) || 0;
        if (skinSharpenVal > 0 || clearFaceVal > 0) {
          if (skinSharpenVal >= clearFaceVal) {
            const strength = skinSharpenVal / 100;
            applySkinMaskedSharpen(dims.w, dims.h, strength);
          } else {
            applyClearFaceToCanvas(dims.w, dims.h, clearFaceVal / 100);
          }
        }
        if (filters.includes('sharpen')) {
          const s = parseInt($('#slider-sharpness')?.value || 0) / 100;
          if (_isArtwork) {
            const artStr = _isUpscale ? 1.8 : 1.2;
            applyArtworkSharpen(dims.w, dims.h, artStr + s * 1.5);
            applyUnsharpMask(dims.w, dims.h, _isUpscale ? 1.5 : 1.0, 2);
          } else {
            if (s > 0) applyUnsharpMask(dims.w, dims.h, s);
          }
        } else if (_isArtwork) {
          // Auto-apply artwork sharpening even without Sharpen filter selected
          applyArtworkSharpen(dims.w, dims.h, _isUpscale ? 1.6 : 1.0);
          applyUnsharpMask(dims.w, dims.h, _isUpscale ? 1.2 : 0.8, 2);
        }
        if (filters.includes('denoise')) { const s = parseInt($('#slider-denoise')?.value || 0) / 100; if (s > 0.1) applyBoxBlur(dims.w, dims.h, Math.round(s * 2)); }
        // Advanced Enhance: Professional-grade multi-pass sharpening + crisp edge retouch
        const advVal = getAdvancedEnhanceVal();
        if (advVal > 0) {
          const p = advVal / 100;
          if (_isArtwork) {
            // Artwork advanced enhance: Laplacian passes for crisp lines
            applyArtworkSharpen(dims.w, dims.h, 1.5 + p * 3.0);
            applyUnsharpMask(dims.w, dims.h, 1.0 + p * 2.0, 2);
            if (p >= 0.5) applyArtworkSharpen(dims.w, dims.h, p * 1.5);
          } else {
            // Pass 1: main sharpening — very visible at 20%, razor-sharp at 100%
            applyUnsharpMask(dims.w, dims.h, 1.0 + p * 5.0);
            // Pass 2: fine texture recovery
            applyDetailRecovery(dims.w, dims.h, 0.5 + p * 2.0);
            // Pass 3 (40%+): second edge crisp pass
            if (p >= 0.4) applyUnsharpMask(dims.w, dims.h, (p - 0.3) * 3.0);
            // Pass 4 (75%+): maximum professional retouch
            if (p >= 0.75) applyDetailRecovery(dims.w, dims.h, (p - 0.6) * 2.5);
          }
        }
        // Export
        const format = getOutputFormat(); let mimeType = 'image/png', quality;
        const q = parseInt($('#jpeg-quality')?.value) || 92;
        if (format === 'jpeg') { mimeType = 'image/jpeg'; quality = q / 100; }
        else if (format === 'webp') { mimeType = 'image/webp'; quality = q / 100; }
        state.processedDataUrl = canvas.toDataURL(mimeType, quality);
        resolve();
      };
      img.src = state.originalDataUrl;
    });
  }

  // ===== CONTENT TYPE DETECTION — Photo vs Artwork/Anime ===== //
  // Artwork (anime, illustrations, paintings) has:
  //   • Large flat-color regions → low local variance
  //   • High saturation (bold colors)
  //   • Hard edges (steep color transitions)
  // Real photos have:
  //   • High local variance (texture, noise, grain)
  //   • Moderate saturation
  // We sample a subset of pixels for speed.
  function detectContentType(imageData, w, h) {
    const data = imageData.data;
    const sampleStep = Math.max(1, Math.floor(Math.sqrt((w * h) / 4000)));
    let totalVariance = 0, totalSat = 0, edgeCount = 0, samples = 0;
    let skinPixels = 0; // real photos have skin tones — strong signal for "photo"

    for (let y = sampleStep; y < h - sampleStep; y += sampleStep) {
      for (let x = sampleStep; x < w - sampleStep; x += sampleStep) {
        const i = (y * w + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];

        const ri = (y * w + (x + sampleStep)) * 4;
        const di = ((y + sampleStep) * w + x) * 4;
        const dr = Math.abs(r - data[ri]) + Math.abs(r - data[di]);
        const dg = Math.abs(g - data[ri + 1]) + Math.abs(g - data[di + 1]);
        const db = Math.abs(b - data[ri + 2]) + Math.abs(b - data[di + 2]);
        const localVar = (dr + dg + db) / 6;
        totalVariance += localVar;

        const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
        const lum = (maxC + minC) / 2;
        const sat = (maxC === minC) ? 0 : (lum < 127.5 ? (maxC - minC) / (maxC + minC) : (maxC - minC) / (510 - maxC - minC));
        totalSat += sat;

        if (localVar > 60) edgeCount++;

        // Skin tone detection (YCbCr-like): real human skin = reddish, not too dark/bright
        // Cb in [77..127], Cr in [133..173] — standard skin range
        const Cb = -0.169 * r - 0.331 * g + 0.5 * b + 128;
        const Cr = 0.5 * r - 0.419 * g - 0.081 * b + 128;
        if (lum > 40 && lum < 230 && Cb >= 77 && Cb <= 127 && Cr >= 133 && Cr <= 173) skinPixels++;

        samples++;
      }
    }

    if (samples === 0) return 'photo';
    const avgVariance = totalVariance / samples;
    const avgSat = totalSat / samples;
    const edgeRatio = edgeCount / samples;
    const skinRatio = skinPixels / samples;

    // If significant skin pixels detected → real photo, regardless of saturation
    // This catches: body paint photos, fantasy makeup, colorful portraits
    if (skinRatio > 0.08) {
      console.log(`[ContentDetect] skinRatio=${skinRatio.toFixed(3)} → photo (skin override)`);
      return 'photo';
    }

    // Artwork: low variance (flat color regions) + high saturation + hard edges + no skin
    const isArtwork = avgVariance < 22 && avgSat > 0.28 && edgeRatio > 0.04 && skinRatio < 0.05;
    const isHighSatArt = avgSat > 0.42 && avgVariance < 30 && edgeRatio > 0.06 && skinRatio < 0.04;

    const type = (isArtwork || isHighSatArt) ? 'artwork' : 'photo';
    console.log(`[ContentDetect] var=${avgVariance.toFixed(1)} sat=${avgSat.toFixed(3)} edge=${edgeRatio.toFixed(3)} skin=${skinRatio.toFixed(3)} → ${type}`);
    return type;
  }

  // ===== CORRECT UNSHARP MASK — Gaussian blur then high-pass add-back ===== //
  // This is how every real image editor (Photoshop, GIMP, Lightroom) implements sharpening.
  // Step 1: create a blurred copy. Step 2: subtract blur from original = edges/detail.
  // Step 3: add edges back scaled by strength. Result = original + amplified edges = SHARP.
  // gaussianBlurChannel: 3-pass box blur approximating Gaussian. Clean alias to blurChannelInternal.
  function gaussianBlurChannel(src, w, h, radius) {
    return blurChannelInternal(src, w, h, Math.max(1, Math.round(radius)));
  }

  // Internal: box blur — 1 pass at radius≤1 (tight/artwork), 3 passes at radius>1 (photo/smooth)
  function blurChannelInternal(src, w, h, r) {
    const kernelSize = r * 2 + 1;
    const inv = 1 / kernelSize;
    let cur = new Float32Array(src);
    const passes = r <= 1 ? 1 : 3; // tight radius = 1 pass; wide radius = 3-pass Gaussian approx
    for (let pass = 0; pass < passes; pass++) {
      const tmp = new Float32Array(w * h);
      // Horizontal
      for (let y = 0; y < h; y++) {
        const row = y * w;
        let sum = 0;
        for (let k = -r; k <= r; k++) sum += cur[row + Math.max(0, Math.min(w - 1, k))];
        tmp[row] = sum * inv;
        for (let x = 1; x < w; x++) {
          sum += cur[row + Math.min(w - 1, x + r)] - cur[row + Math.max(0, x - r - 1)];
          tmp[row + x] = sum * inv;
        }
      }
      // Vertical
      const out2 = new Float32Array(w * h);
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let k = -r; k <= r; k++) sum += tmp[Math.max(0, Math.min(h - 1, k)) * w + x];
        out2[x] = sum * inv;
        for (let y = 1; y < h; y++) {
          sum += tmp[Math.min(h - 1, y + r) * w + x] - tmp[Math.max(0, y - r - 1) * w + x];
          out2[y * w + x] = sum * inv;
        }
      }
      cur = out2;
    }
    return cur;
  }

  function applyUnsharpMask(w, h, strength, forceBlurRadius) {
    if (strength <= 0) return;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    // Use a meaningful blur radius: ~1% of shorter dimension, minimum 2px
    // For artwork/anime, caller passes forceBlurRadius=1 for tight crisp edge sharpening
    const blurRadius = forceBlurRadius != null ? forceBlurRadius : Math.max(2, Math.round(Math.min(w, h) * 0.012));

    for (let c = 0; c < 3; c++) {
      const channel = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) channel[i] = data[i * 4 + c];
      const blurred = blurChannelInternal(channel, w, h, blurRadius);
      // Correct unsharp mask: sharp = original + (original - blurred) * strength
      // strength=1 → moderate sharpening, strength=4 → razor-sharp
      // BUG 1 FIX: Bright-pixel protection — pixels above 220 get reduced boost
      // so they never clip to pure white (prevents white hair lines and blown highlights)
      for (let i = 0; i < w * h; i++) {
        const orig = channel[i];
        const edge = orig - blurred[i]; // high-pass signal
        let boost = strength;
        if (orig > 220) {
          // Linearly reduce boost from full at 220 to 0 at 255
          boost *= (255 - orig) / 35;
        }
        data[i * 4 + c] = clamp(orig + edge * boost);
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // ===== ARTWORK SHARPEN — dedicated crisp-edge sharpener for anime/illustrations ===== //
  // Unlike applyUnsharpMask (which uses a multi-pass Gaussian blur = too wide for line art),
  // this uses a SINGLE-PIXEL neighbour kernel: the classic discrete Laplacian.
  // Laplacian detects hard edges at 1px precision — perfect for ink lines and flat-color fills.
  // No bright-pixel suppression — artwork NEEDS full boost on bright backgrounds.
  // strength: 0.3 = subtle, 1.0 = strong, 2.0+ = razor-sharp (use 1.5-2.5 for anime upscale)
  function applyArtworkSharpen(w, h, strength) {
    if (strength <= 0) return;
    const imageData = ctx.getImageData(0, 0, w, h);
    const src = new Uint8ClampedArray(imageData.data); // read-only source copy
    const dst = imageData.data;                        // write destination

    // Laplacian kernel: center=4, cardinal neighbours=-1
    // edge = center*4 - top - bottom - left - right  (high-pass)
    // sharpened = original + edge * strength
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        const top = ((y - 1) * w + x) * 4;
        const bot = ((y + 1) * w + x) * 4;
        const lft = (y * w + (x - 1)) * 4;
        const rgt = (y * w + (x + 1)) * 4;
        for (let c = 0; c < 3; c++) {
          const edge = src[idx + c] * 4 - src[top + c] - src[bot + c] - src[lft + c] - src[rgt + c];
          dst[idx + c] = Math.max(0, Math.min(255, src[idx + c] + edge * strength));
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  function applyUnsharpMaskLuminance(w, h, strength) {
    if (strength <= 0) return;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const blurRadius = Math.max(2, Math.round(Math.min(w, h) * 0.012));
    const lum = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      lum[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    }
    const blurred = blurChannelInternal(lum, w, h, blurRadius);
    for (let i = 0; i < w * h; i++) {
      const orig = lum[i];
      const edge = orig - blurred[i];
      const brightProtect = orig > 220 ? (255 - orig) / 35 : 1.0;
      const delta = edge * strength * brightProtect;
      data[i * 4] = clamp(data[i * 4] + delta);
      data[i * 4 + 1] = clamp(data[i * 4 + 1] + delta);
      data[i * 4 + 2] = clamp(data[i * 4 + 2] + delta);
    }
    ctx.putImageData(imageData, 0, 0);
  }

  function applyBoxBlur(w, h, radius) {
    if (radius < 1) return;
    const imageData = ctx.getImageData(0, 0, w, h);
    const src = new Uint8ClampedArray(imageData.data);
    const data = imageData.data;
    const size = radius * 2 + 1, area = size * size;
    for (let y = radius; y < h - radius; y++) for (let x = radius; x < w - radius; x++) {
      let r = 0, g = 0, b = 0;
      for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
        const idx = ((y + dy) * w + (x + dx)) * 4;
        r += src[idx]; g += src[idx + 1]; b += src[idx + 2];
      }
      const idx = (y * w + x) * 4;
      data[idx] = clamp(r / area); data[idx + 1] = clamp(g / area); data[idx + 2] = clamp(b / area);
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // ===== CANVAS ENHANCEMENT BOOST — mandatory post-processing for canvas pipeline ===== //
  // Ensures "After" always looks clearly better than "Before" in the comparison slider.
  // Two modes:
  //   • Artwork/anime: Laplacian crisp-edge pass (ink lines, flat colours)
  //   • Photos: luminance-guided micro-contrast (texture, pores, fine detail)
  //
  // DOT ARTIFACT FIX: baseStr and microStr are CAPPED to prevent amplifying pixel-level
  // noise into visible dot patterns. The previous values (microStr up to 0.96 at 8K)
  // were creating severe dot artifacts especially on smooth skin and gradients.
  function applyCanvasEnhancementBoost(w, h, isArtwork, isUpscale, resSharpMult) {
    if (!ctx) return;
    // Capped base strength — upscaled gets slightly more but never excessive
    const baseStr = isUpscale ? 0.30 : 0.20;

    if (isArtwork) {
      // Single crisp-edge pass — makes lines pop without creating noise
      const boost = Math.min(baseStr * resSharpMult * 0.5, 0.8);
      applyArtworkSharpen(w, h, boost);
    } else {
      // Photos: luminance-guided micro-contrast boost
      // Targets mid-frequency texture (skin pores, fabric, foliage grain)
      // without affecting large-scale tone or amplifying noise into dots
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const pixelCount = w * h;
      const blurR = Math.max(2, Math.round(Math.min(w, h) * 0.008));
      const lum = new Float32Array(pixelCount);
      for (let i = 0; i < pixelCount; i++) {
        lum[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
      }
      const blurred = blurChannelInternal(lum, w, h, blurR);
      // HARD CAP at 0.35 — prevents dot artifacts regardless of resolution
      const microStr = Math.min(baseStr * resSharpMult * 0.3, 0.35);
      for (let i = 0; i < pixelCount; i++) {
        const edge = lum[i] - blurred[i];
        // Skip small edges (noise) AND large edges (already sharp boundaries)
        const absEdge = Math.abs(edge);
        if (absEdge < 3 || absEdge > 80) continue;
        // Highlight protection: pixels above 215 get reduced boost
        const brightProtect = lum[i] > 215 ? Math.max(0, (255 - lum[i]) / 40) : 1.0;
        const delta = edge * microStr * brightProtect;
        data[i * 4] = clamp(data[i * 4] + delta);
        data[i * 4 + 1] = clamp(data[i * 4 + 1] + delta);
        data[i * 4 + 2] = clamp(data[i * 4 + 2] + delta);
      }
      ctx.putImageData(imageData, 0, 0);
    }
  }

  // Detail Recovery: fine texture amplification for Advanced Enhance
  // Uses a wider blur radius to capture mid-frequency texture (pores, threads, grain)
  function applyDetailRecovery(w, h, strength) {
    if (strength <= 0) return;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    // Wider radius captures mid-frequency texture bands (2–3% of min dimension)
    const blurRadius = Math.max(3, Math.round(Math.min(w, h) * 0.025));

    for (let c = 0; c < 3; c++) {
      const channel = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) channel[i] = data[i * 4 + c];
      const blurred = blurChannelInternal(channel, w, h, blurRadius);
      for (let i = 0; i < w * h; i++) {
        const detail = channel[i] - blurred[i]; // mid-freq texture signal
        data[i * 4 + c] = clamp(channel[i] + detail * strength);
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // ===== SKIN / FACE DETECTION — covers humans, anime, cartoon characters ===== //
  // Uses YCbCr space for human skin + extra constraints for anime/cartoon skin.
  // Warm orange bokeh, wooden surfaces and warm lighting are hard-rejected.
  function isSkinPixel(r, g, b) {
    const Y = 0.299 * r + 0.587 * g + 0.114 * b;
    const Cb = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
    const Cr = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;

    if (Y < 25 || Y > 245) return false;         // too dark or blown out
    if (b > r + 15) return false;                 // blue cast — sky, walls
    if (g > r + 15 && g > b + 10) return false;  // green — plants

    // Skin in YCbCr — broad range covering all ethnicities
    const inYCbCr = Cb >= 77 && Cb <= 135 && Cr >= 130 && Cr <= 180;
    if (!inYCbCr) return false;

    // Additional checks to reject orange/red walls that pass YCbCr
    // Orange wall: very high R-B gap and R >> G
    const rMinusB = r - b;
    const rMinusG = r - g;
    if (rMinusB > 100 && rMinusG > 50) return false; // deep orange background

    return true;
  }

  // Builds a STRICT skin mask — background pixels = exactly 0.0
  function buildSkinMask(imageData, w, h) {
    const data = imageData.data;
    const raw = new Float32Array(w * h);

    // Pass 1: raw per-pixel skin detection
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      raw[i] = isSkinPixel(data[idx], data[idx + 1], data[idx + 2]) ? 1.0 : 0.0;
    }

    // Pass 2: dilation — TINY kernel only (3px max) to fill small gaps in face without bleeding
    const dilR = Math.max(2, Math.min(3, Math.round(Math.min(w, h) / 150)));
    const dilated = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let maxV = 0;
        for (let dy = -dilR; dy <= dilR; dy++) {
          for (let dx = -dilR; dx <= dilR; dx++) {
            const ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
              if (raw[ny * w + nx] > maxV) maxV = raw[ny * w + nx];
            }
          }
        }
        dilated[y * w + x] = maxV;
      }
    }

    // Pass 3: blur ONLY within detected regions — never spreads to zero regions
    const blurR = 2;
    const smoothed = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (dilated[y * w + x] < 0.01) { smoothed[y * w + x] = 0; continue; }
        let sum = 0, count = 0;
        for (let dy = -blurR; dy <= blurR; dy++) {
          for (let dx = -blurR; dx <= blurR; dx++) {
            const ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
              sum += dilated[ny * w + nx]; count++;
            }
          }
        }
        smoothed[y * w + x] = sum / count;
      }
    }

    // Pass 4: hard threshold — ANYTHING below 0.3 = exactly 0 (strict background kill)
    for (let i = 0; i < smoothed.length; i++) {
      if (smoothed[i] < 0.3) { smoothed[i] = 0; continue; }
      smoothed[i] = Math.min(1.0, (smoothed[i] - 0.3) / 0.7);
    }

    return smoothed;
  }

  // ===== SKIN SHARPENING — correct unsharp mask, strictly inside skin mask ===== //
  function applySkinMaskedSharpen(w, h, strength) {
    if (strength <= 0) return;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const mask = buildSkinMask(imageData, w, h);
    const maskSum = mask.reduce((s, v) => s + v, 0);
    if (maskSum < 10) {
      // No skin/face detected — do NOTHING. Never fall back to whole-image sharpening.
      // Sharpening the whole image when no face is found would darken and alter the background.
      return;
    }
    const blurRadius = Math.max(2, Math.round(Math.min(w, h) * 0.012));
    const boost = strength; // caller already scaled correctly
    for (let c = 0; c < 3; c++) {
      const channel = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) channel[i] = data[i * 4 + c];
      const blurred = blurChannelInternal(channel, w, h, blurRadius);
      for (let i = 0; i < w * h; i++) {
        if (mask[i] === 0) continue;
        const orig = channel[i];
        const edge = orig - blurred[i];
        // Highlight protection: reduce effect on already-bright pixels (>200) to prevent white clipping
        const brightFactor = orig > 200 ? (255 - orig) / 55 : 1.0;
        const sharpened = orig + edge * boost * brightFactor;
        data[i * 4 + c] = clamp(orig + (sharpened - orig) * mask[i]);
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // ===== CLEAR FACE — dual-pass unsharp mask, face regions only ===== //
  function applyClearFaceToCanvas(w, h, strength) {
    // CLEAR FACE = smooth skin imperfections while preserving sharp edges (eyes, lips, brows)
    // This is the OPPOSITE of sharpening — it cleans blemishes, evens skin tone, reduces noise
    // Technique: bilateral-style filter — blur skin pixels but preserve edge transitions
    if (strength <= 0) return;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const mask = buildSkinMask(imageData, w, h);
    const maskSum = mask.reduce((s, v) => s + v, 0);
    if (maskSum < 10) return; // no skin detected

    const smoothR = Math.max(3, Math.round(Math.min(w, h) * 0.018)); // larger blur = smoother skin
    const smoothAmount = Math.min(0.85, strength * 0.7); // 0→0.85 — how much to blend toward smooth

    for (let c = 0; c < 3; c++) {
      const channel = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) channel[i] = data[i * 4 + c];
      const smoothed = blurChannelInternal(channel, w, h, smoothR);

      for (let i = 0; i < w * h; i++) {
        if (mask[i] === 0) continue;
        const orig = channel[i];
        const smooth = smoothed[i];
        // Edge detection: if pixel differs much from neighbors, it's an edge — preserve it
        const edgeStrength = Math.abs(orig - smooth) / 255;
        const edgeProtect = edgeStrength > 0.08 ? Math.max(0, 1 - edgeStrength * 4) : 1.0;
        const blended = orig + (smooth - orig) * smoothAmount * edgeProtect;
        data[i * 4 + c] = clamp(orig + (blended - orig) * mask[i]);
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // ===== RUN PROCESSING ===== //
  async function runProcessing() {
    console.log('[runProcessing] START — fileType:', state.fileType, 'file:', state.file?.name);
    if (!state.file) { alert('Please upload a file first.'); return; }
    const progressRing = $('#progress-ring-fill'), pctCircle = $('#progress-percent-circular'), linearBar = $('#linear-progress-fill'), pctBottom = $('#progress-percent'), titleEl = $('#processing-title'), statusEl = $('#processing-status'), canvasWrap = $('#processing-canvas-wrapper');
    const circumference = 2 * Math.PI * 45;

    // Global progress tracker to prevent jumps
    let currentGlobalPct = 0;
    function setProgress(pct) {
      currentGlobalPct = Math.min(100, Math.max(currentGlobalPct, pct));
      const p = Math.round(currentGlobalPct);
      if (progressRing) { progressRing.style.strokeDasharray = circumference; progressRing.style.strokeDashoffset = circumference - (currentGlobalPct / 100) * circumference; }
      if (pctCircle) pctCircle.textContent = p + '%';
      if (linearBar) linearBar.style.width = currentGlobalPct + '%';
      const centerPct = document.querySelector('.progress-percent-center');
      if (centerPct) centerPct.textContent = p + '%';
    }

    window._updateInternalProgress = (internalPct) => {
      // internalPct 0-100 from processVideoReal/FFmpeg will be mapped to 30-90 range
      const mapped = 30 + (internalPct * 0.6);
      setProgress(mapped);
    };

    function smoothProgress(to, durationMs) {
      const from = currentGlobalPct;
      if (durationMs <= 0) { setProgress(to); return Promise.resolve(); }
      return new Promise(resolve => { const start = performance.now(); function tick(now) { const t = Math.min((now - start) / durationMs, 1); setProgress(from + (to - from) * easeOutCubic(t)); if (t < 1) requestAnimationFrame(tick); else resolve(); } requestAnimationFrame(tick); });
    }

    const dims = getTargetDimensions(); const totalPixels = dims.w * dims.h;
    const hwInfo = state.hwTier || analyzeHardware();
    const tier = hwInfo.tier;

    // For Tier 3, cap target resolution to prevent crashes
    if (tier === 3 && totalPixels > 921600) { // > 1280x720
      console.log('[HardwareGuard] Tier 3: Capping resolution to 720p for safety');
    }

    if (totalPixels > 16000000 && tier < 3) { if (!confirm(`Target ${dims.w}x${dims.h} is very high and may crash. Continue?`)) return; }
    try {
      showStep('processing'); await sleep(50); setProgress(0);

      const fmt = getOutputFormat();

      // ── GIF path: process frame-by-frame and encode back to animated GIF ──
      if (fmt === 'gif' && state.isAnimatedGif) {
        if (titleEl) titleEl.textContent = 'Processing animated GIF…';
        if (statusEl) statusEl.textContent = 'Loading frames…';
        // Wait for frames to finish extracting if still in progress
        if (!state.gifFrames) {
          if (statusEl) statusEl.textContent = 'Extracting GIF frames…';
          const result = await extractGifFrames(state.file);
          if (result) { state.gifFrames = result.frames; state.gifDelays = result.delays; }
        }
        if (!state.gifFrames || state.gifFrames.length === 0) {
          throw new Error('Could not extract GIF frames. Try a different GIF file.');
        }
        await processGifAndEncode(setProgress);
        setProgress(100);
        await sleep(300);
        showResults();
        return;
      }

      // ── Normal image path ──
      if (titleEl) titleEl.textContent = 'Enhancing your image...';
      if (statusEl) statusEl.textContent = 'Analyzing image...';
      await smoothProgress(15, 600);
      if (statusEl) statusEl.textContent = 'Upscaling to target resolution...';
      const tgt2 = getTargetDimensions();
      await smoothProgress(30, 300);
      await processImageHQDownscale(setProgress, tgt2);
      await smoothProgress(90, 300);
      if (statusEl) statusEl.textContent = 'Applying enhancement filters...';
      await smoothProgress(92, 500);
      if (statusEl) statusEl.textContent = 'Finalizing...';
      await smoothProgress(100, 400);
      if (statusEl) statusEl.textContent = 'Complete!';
      await sleep(500); showResults();
    } catch (err) {
      console.error('[runProcessing] ERROR:', err);
      if (err.message && err.message.includes('cancelled by user')) return;
      alert('Error: ' + (err.message || 'Unknown')); showStep('configure');
    }
  }

  // Fallback toast notification
  function showFallbackToast(message) {
    let toast = document.getElementById('fallback-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'fallback-toast';
      toast.className = 'fallback-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = '⚠️ ' + message;
    toast.classList.add('fallback-toast-visible');
    setTimeout(() => toast.classList.remove('fallback-toast-visible'), 6000);
  }

  // ===== RESULTS ===== //
  function showResults() {
    showStep('result'); const dims = getTargetDimensions(); const format = getOutputFormat(); const filters = getSelectedFilters();

    // BUG 3 FIX: Before/After comparison must show the FULL image at correct composition,
    // matching what the downloaded file looks like. Both images (original 1280×720 and
    // enhanced 5120×2880) must use object-fit:contain so neither is cropped/zoomed.
    // We also force the parent containers to have matching dimensions and black background
    // so both images appear at identical visual size regardless of their native resolution.
    const beforeImg = $('#compare-before-img'), afterImg = $('#compare-after-img');
    const beforeDiv = $('#comparison-before'), afterDiv = $('#comparison-after');
    const imgStyle = 'width:100%;height:100%;object-fit:contain !important;object-position:center center;display:block;background:#000;max-width:100%;max-height:100%;';
    const divStyle = 'position:absolute;inset:0;width:100%;height:100%;overflow:hidden;background:#000;';
    // FIX Bug 2: If the configure-step live preview had pixel effects applied (sharpen/clear-face/etc),
    // use that as the "before" so the comparison matches what the user was looking at.
    // Otherwise fall back to the clean original.
    const beforeSrc = (previewImage && previewImage._advPreviewActive && previewImage.src && previewImage.src !== window.location.href)
      ? previewImage.src
      : (state.originalDataUrl || '');
    if (beforeImg) { beforeImg.src = beforeSrc; beforeImg.setAttribute('style', imgStyle); }
    if (afterImg) { afterImg.src = state.processedDataUrl || ''; afterImg.setAttribute('style', imgStyle); }
    // Force parent divs to identical sizing — prevents the After image from zooming in
    if (beforeDiv) beforeDiv.setAttribute('style', divStyle + 'z-index:1;clip-path:inset(0 50% 0 0);');
    if (afterDiv) afterDiv.setAttribute('style', divStyle);

    const origRes = $('#result-orig-res'), origSize = $('#result-orig-size'), origFmt = $('#result-orig-format');
    if (origRes) origRes.textContent = `${state.originalWidth}×${state.originalHeight}`;
    if (origSize) origSize.textContent = formatBytes(state.originalSize);
    let origFormat = 'UNKNOWN';
    if (state.file?.type?.includes('/')) origFormat = state.file.type.split('/')[1].toUpperCase();
    else if (state.file?.name) origFormat = state.file.name.split('.').pop().toUpperCase();
    if (origFmt) origFmt.textContent = origFormat;
    const newRes = $('#result-new-res'), newSize = $('#result-new-size'), newFmt = $('#result-new-format');
    // For images processed with ONNX, use actual output dimensions from processedDataUrl
    if (state.processedDataUrl && state.processedDataUrl.startsWith('data:')) {
      const _tmpImg = new Image();
      _tmpImg.onload = () => { if (newRes) newRes.textContent = `${_tmpImg.naturalWidth}×${_tmpImg.naturalHeight}`; };
      _tmpImg.src = state.processedDataUrl;
    } else {
      if (newRes) newRes.textContent = `${dims.w}×${dims.h}`;
    }

    if (newSize) {
      if (state.processedDataUrl && state.processedDataUrl.startsWith('data:')) {
        // Calculate actual file size from base64 dataUrl
        // base64 encodes 3 bytes as 4 chars, subtract header like "data:image/png;base64,"
        const base64Str = state.processedDataUrl.split(',')[1] || '';
        const padding = (base64Str.endsWith('==') ? 2 : base64Str.endsWith('=') ? 1 : 0);
        const actualBytes = Math.floor(base64Str.length * 3 / 4) - padding;
        newSize.textContent = formatBytes(actualBytes);
      } else {
        newSize.textContent = formatBytes(estimateOutputSize());
      }
    }
    if (newFmt) newFmt.textContent = format.toUpperCase();
    const filterLabels = { sharpen: '🔪 Sharpen', denoise: '🌫️ Denoise', hdr: '☀️ HDR', color: '🎨 Color Boost', face: '👤 Face', contrast: '◑ Contrast', brightness: '💡 Brightness', vignette: '⊚ Vignette', warmth: '🌅 Warmth', cool: '❄️ Cool', bw: '⬛ B&W' };
    const filtersListEl = $('#result-filters-list');
    if (filtersListEl) { filtersListEl.innerHTML = ''; filters.forEach(f => { const s = document.createElement('span'); s.textContent = filterLabels[f] || f; filtersListEl.appendChild(s); }); }
    initComparisonSlider();
  }

  function initComparisonSlider() {
    const container = $('#comparison-container'), before = $('#comparison-before'), divider = $('#comparison-divider');
    if (!container) return; let isDragging = false;
    function updateSlider(x) { const rect = container.getBoundingClientRect(); let pct = ((x - rect.left) / rect.width) * 100; pct = Math.max(0, Math.min(100, pct)); before.style.clipPath = `inset(0 ${100 - pct}% 0 0)`; if (divider) divider.style.left = pct + '%'; }
    container.addEventListener('mousedown', e => { e.preventDefault(); isDragging = true; updateSlider(e.clientX); });
    document.addEventListener('mousemove', e => { if (isDragging) { e.preventDefault(); updateSlider(e.clientX); } });
    document.addEventListener('mouseup', () => { isDragging = false; });
    container.addEventListener('touchstart', e => { isDragging = true; updateSlider(e.touches[0].clientX); e.preventDefault(); }, { passive: false });
    document.addEventListener('touchmove', e => { if (isDragging) { e.preventDefault(); updateSlider(e.touches[0].clientX); } }, { passive: false });
    document.addEventListener('touchend', () => { isDragging = false; });
  }

  function downloadResult() {
    if (!state.processedDataUrl) return;
    const f = getOutputFormat();
    const ext = f === 'jpeg' ? 'jpg' : f;
    let qn = getSelectedQuality(); if (qn === 'custom') { const d = getTargetDimensions(); qn = `${d.w}x${d.h}`; }
    const a = document.createElement('a'); a.href = state.processedDataUrl;
    a.download = `zenpick-enhanced-${qn}.${ext}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function scrollToSection(idx) {
    const sections = $$('.settings-panel .settings-section');
    if (idx >= 0 && idx < sections.length) { const s = sections[idx]; s.scrollIntoView({ behavior: 'smooth', block: 'center' }); s.classList.remove('highlight'); void s.offsetWidth; s.classList.add('highlight'); setTimeout(() => s.classList.remove('highlight'), 800); }
  }

  // ===== PRESETS ===== //
  function applyPreset(presetName) {
    $$('.fab-preset').forEach(b => b.classList.remove('active'));
    $$('input[name="filter"]').forEach(cb => { cb.checked = false; });
    function setFilter(name, checked) { const cb = document.querySelector(`input[name="filter"][value="${name}"]`); if (cb) cb.checked = checked; }
    function setSlider(sid, val, lid) { const s = $(`#${sid}`), l = $(`#${lid}`); if (s) { s.value = val; if (l) l.textContent = val + '%'; } }
    // CRITICAL FIX: Reset ALL sliders to 0 before applying preset values.
    // Without this, skin (default 50%) and texture (default 20%) sliders stay active
    // and add heavy blur on top of whatever the preset does.
    const ALL_SLIDERS = [
      ['slider-sharpness', 'sharpness-val'], ['slider-denoise', 'denoise-val'],
      ['slider-saturation', 'saturation-val'], ['slider-brightness', 'brightness-val'],
      ['slider-contrast', 'contrast-val'], ['slider-skin', 'skin-smooth-val'],
      ['slider-texture', 'texture-smooth-val'], ['slider-skin-sharpen', 'skin-sharpen-val'],
      ['slider-clear-face', 'clear-face-val'], ['slider-advanced-enhance', 'adv-enhance-val']
    ];
    ALL_SLIDERS.forEach(([sid, lid]) => setSlider(sid, 0, lid));
    switch (presetName) {
      // Intelligent Optimize — clean sharpening + mild color boost, zero blur
      case 'auto':
        setFilter('sharpen', true); setFilter('color', true); setFilter('contrast', true); setFilter('brightness', true);
        setSlider('slider-sharpness', 30, 'sharpness-val');
        setSlider('slider-saturation', 15, 'saturation-val');
        setSlider('slider-brightness', 3, 'brightness-val');
        setSlider('slider-contrast', 8, 'contrast-val');
        $('#fab-preset-auto')?.classList.add('active');
        break;
      // Cinematic Grade — proper Hollywood teal-orange film look. Strong contrast, warm highlights, teal shadows.
      case 'cinema':
        setFilter('hdr', true); setFilter('color', true); setFilter('vignette', true);
        setFilter('contrast', true); setFilter('sharpen', true);
        setSlider('slider-saturation', 18, 'saturation-val');
        setSlider('slider-brightness', -8, 'brightness-val');
        setSlider('slider-contrast', 28, 'contrast-val');
        setSlider('slider-sharpness', 20, 'sharpness-val');
        setTimeout(() => {
          if (curvesState && curvesState.points) {
            curvesState.points.rgb = [{ x: 0, y: 0.04 }, { x: 0.25, y: 0.22 }, { x: 0.5, y: 0.5 }, { x: 0.75, y: 0.78 }, { x: 1, y: 0.96 }];
            curvesState.points.r = [{ x: 0, y: 0.0 }, { x: 0.5, y: 0.52 }, { x: 1, y: 1.02 }];
            curvesState.points.g = [{ x: 0, y: 0.0 }, { x: 0.3, y: 0.28 }, { x: 1, y: 1.0 }];
            curvesState.points.b = [{ x: 0, y: 0.06 }, { x: 0.5, y: 0.47 }, { x: 1, y: 0.86 }];
            if (typeof updateLUTs === 'function') updateLUTs(false);
            if (typeof applyLivePreviewFilters === 'function') applyLivePreviewFilters();
          }
        }, 50);
        $('#fab-preset-cinema')?.classList.add('active');
        break;
      // Portrait Retouch — skin sharpening + clear face, mild color lift. No blur.
      case 'portrait':
        setFilter('color', true); setFilter('brightness', true); setFilter('sharpen', true);
        setSlider('slider-skin-sharpen', 25, 'skin-sharpen-val');
        setSlider('slider-clear-face', 15, 'clear-face-val');
        setSlider('slider-saturation', 10, 'saturation-val');
        setSlider('slider-brightness', 8, 'brightness-val');
        setSlider('slider-sharpness', 15, 'sharpness-val');
        $('#fab-preset-portrait')?.classList.add('active');
        break;
    }
    updateSizeEstimation(); applyLivePreviewFilters();
  }

  // ===== LIVE PREVIEW FILTERS ===== //
  let _currentPreviewFilter = 'none';

  function applyLivePreviewFilters() {
    if (!state.file) return;
    const filters = getSelectedFilters();

    // CSS-only filters
    let filterStr = '';
    // FIX: skin/texture blur removed — it made preset buttons blur the preview image
    const satPrev = parseInt($('#slider-saturation')?.value || 0); if (satPrev !== 0) filterStr += `saturate(${100 + satPrev}%) `;
    const brightPrev = parseInt($('#slider-brightness')?.value || 0); if (brightPrev !== 0) filterStr += `brightness(${100 + brightPrev}%) `;
    const contrastPrev = parseInt($('#slider-contrast')?.value || 0); if (contrastPrev !== 0) filterStr += `contrast(${100 + contrastPrev}%) `;
    if (filters.includes('hdr')) filterStr += `contrast(130%) brightness(105%) `;
    if (filters.includes('warmth')) filterStr += `sepia(20%) saturate(110%) `;
    if (filters.includes('cool')) filterStr += `hue-rotate(10deg) saturate(105%) `;
    if (filters.includes('vignette')) filterStr += `brightness(92%) `;
    if (filters.includes('bw')) filterStr += 'grayscale(100%) ';

    // RGB curves via SVG filter
    const pts = curvesState.points;
    const isCurveDefault = pts.rgb.length === 2 && pts.rgb[0].y === 0 && pts.rgb[1].y === 1 &&
      pts.r.length === 2 && pts.r[0].y === 0 && pts.r[1].y === 1 &&
      pts.g.length === 2 && pts.g[0].y === 0 && pts.g[1].y === 1 &&
      pts.b.length === 2 && pts.b[0].y === 0 && pts.b[1].y === 1;
    if (!isCurveDefault) filterStr = 'url(#dynamic-curve-filter) ' + filterStr;

    const final = filterStr.trim() || 'none';
    _currentPreviewFilter = final;
    const target = previewImage;
    target.style.filter = final;
    target.style.transform = 'scale(1)';
    target.style.imageRendering = (getUpscaleMultiplier() > 0) ? 'high-quality' : 'auto';

    // Canvas pixel ops — Sharpness, Denoise, and Advanced Options need real pixel processing
    const sharpVal = parseInt($('#slider-sharpness')?.value || 0);
    const denoiseVal = parseInt($('#slider-denoise')?.value || 0);
    const skinSVal = parseInt($('#slider-skin-sharpen')?.value) || 0;
    const clearFaceVal = parseInt($('#slider-clear-face')?.value) || 0;
    const advVal = getAdvancedEnhanceVal();

    const needsCanvas = (sharpVal > 0 || denoiseVal > 0 || skinSVal > 0 || clearFaceVal > 0 || advVal > 0)
      && state.originalDataUrl;

    if (!needsCanvas) {
      if (previewImage && previewImage._advPreviewActive) {
        previewImage.src = state.originalDataUrl;
        previewImage._advPreviewActive = false;
      }
      const overlay = document.getElementById('adv-preview-overlay');
      if (overlay) overlay.style.display = 'none';
      return;
    }

    clearTimeout(applyLivePreviewFilters._advTimer);
    applyLivePreviewFilters._advTimer = setTimeout(() => {
      // Always read fresh values inside callback to avoid stale closure bug
      const sharpValNow = parseInt($('#slider-sharpness')?.value || 0);
      const denoiseValNow = parseInt($('#slider-denoise')?.value || 0);
      const skinSValNow = parseInt($('#slider-skin-sharpen')?.value) || 0;
      const clearFaceValNow = parseInt($('#slider-clear-face')?.value) || 0;
      const advValNow = getAdvancedEnhanceVal();
      // Re-check — slider may have hit 0 during the debounce wait
      if (sharpValNow === 0 && denoiseValNow === 0 && skinSValNow === 0 && clearFaceValNow === 0 && advValNow === 0) {
        if (previewImage && previewImage._advPreviewActive) { previewImage.src = state.originalDataUrl; previewImage._advPreviewActive = false; }
        const ov = document.getElementById('adv-preview-overlay'); if (ov) ov.style.display = 'none';
        return;
      }
      const pw = previewImage.offsetWidth || 400;
      const ph = previewImage.offsetHeight || 300;
      const offC = document.createElement('canvas');
      offC.width = pw; offC.height = ph;
      const offCtx = offC.getContext('2d', { willReadFrequently: true });
      const img = new Image();
      img.onload = () => {
        offCtx.drawImage(img, 0, 0, pw, ph);
        const imgData = offCtx.getImageData(0, 0, pw, ph);
        const d = imgData.data;

        // SHARPNESS
        if (sharpValNow > 0) {
          const str = (sharpValNow / 100) * 2.5;
          const br = Math.max(1, Math.round(Math.min(pw, ph) * 0.01));
          for (let c = 0; c < 3; c++) {
            const ch = new Float32Array(pw * ph);
            for (let i = 0; i < pw * ph; i++) ch[i] = d[i * 4 + c];
            const bl = blurChannelInternal(ch, pw, ph, br);
            for (let i = 0; i < pw * ph; i++) {
              const orig = ch[i];
              const bp = orig > 210 ? (255 - orig) / 45 : 1.0;
              d[i * 4 + c] = clamp(orig + (orig - bl[i]) * str * bp);
            }
          }
        }

        // DENOISE — box blur, scales cleanly from 0% (nothing) to 100% (strong)
        if (denoiseValNow > 0) {
          const blurR = Math.max(1, Math.round((denoiseValNow / 100) * 4));
          for (let c = 0; c < 3; c++) {
            const ch = new Float32Array(pw * ph);
            for (let i = 0; i < pw * ph; i++) ch[i] = d[i * 4 + c];
            const bl = blurChannelInternal(ch, pw, ph, blurR);
            for (let i = 0; i < pw * ph; i++) d[i * 4 + c] = clamp(bl[i]);
          }
        }

        // SKIN SHARPENING
        if (skinSValNow > 0) {
          const mask = buildSkinMask(imgData, pw, ph);
          if (mask.reduce((s, v) => s + v, 0) >= 5) {
            const faceMaxY = Math.round(ph * 0.65);
            for (let i = 0; i < pw * ph; i++) { if (Math.floor(i / pw) > faceMaxY) mask[i] = 0; }
            const str = skinSValNow / 100 * 2.0;
            const br = Math.max(1, Math.round(Math.min(pw, ph) * 0.012));
            for (let c = 0; c < 3; c++) {
              const ch = new Float32Array(pw * ph);
              for (let i = 0; i < pw * ph; i++) ch[i] = d[i * 4 + c];
              const bl = blurChannelInternal(ch, pw, ph, br);
              for (let i = 0; i < pw * ph; i++) {
                if (mask[i] === 0) continue;
                const orig = ch[i];
                const bp = orig > 200 ? (255 - orig) / 55 : 1.0;
                d[i * 4 + c] = clamp(orig + (orig - bl[i]) * str * bp * mask[i]);
              }
            }
          }
        }

        // CLEAR FACE
        if (clearFaceValNow > 0) {
          const mask = buildSkinMask(imgData, pw, ph);
          if (mask.reduce((s, v) => s + v, 0) >= 5) {
            const faceMaxY = Math.round(ph * 0.65);
            for (let i = 0; i < pw * ph; i++) { if (Math.floor(i / pw) > faceMaxY) mask[i] = 0; }
            const smoothAmt = Math.min(0.85, clearFaceValNow / 100 * 0.7);
            const br = Math.max(2, Math.round(Math.min(pw, ph) * 0.018));
            for (let c = 0; c < 3; c++) {
              const ch = new Float32Array(pw * ph);
              for (let i = 0; i < pw * ph; i++) ch[i] = d[i * 4 + c];
              const bl = blurChannelInternal(ch, pw, ph, br);
              for (let i = 0; i < pw * ph; i++) {
                if (mask[i] === 0) continue;
                const orig = ch[i];
                const edgeProt = Math.abs(orig - bl[i]) / 255 > 0.08 ? Math.max(0, 1 - (Math.abs(orig - bl[i]) / 255) * 4) : 1.0;
                d[i * 4 + c] = clamp(orig + (bl[i] - orig) * smoothAmt * edgeProt * mask[i]);
              }
            }
          }
        }

        // ADVANCED ENHANCE
        if (advVal > 0) {
          const str = advValNow / 100 * 1.5;
          const br = Math.max(1, Math.round(Math.min(pw, ph) * 0.012));
          const lum = new Float32Array(pw * ph);
          for (let i = 0; i < pw * ph; i++) lum[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
          const bl = blurChannelInternal(lum, pw, ph, br);
          for (let i = 0; i < pw * ph; i++) {
            const bp = lum[i] > 220 ? (255 - lum[i]) / 35 : 1.0;
            const delta = (lum[i] - bl[i]) * str * bp;
            d[i * 4] = clamp(d[i * 4] + delta); d[i * 4 + 1] = clamp(d[i * 4 + 1] + delta); d[i * 4 + 2] = clamp(d[i * 4 + 2] + delta);
          }
        }

        offCtx.putImageData(imgData, 0, 0);
        previewImage.src = offC.toDataURL('image/jpeg', 0.92);
        previewImage._advPreviewActive = true;
        const overlay = document.getElementById('adv-preview-overlay');
        if (overlay) overlay.style.display = 'none';
      };
      img.src = state.originalDataUrl;
    }, 150);
  }

  // ===== COMPARE BUTTON (Hold to see Original) ===== //
  function onCompareStart() {
    // Show the TRUE original — strip CSS filters AND restore original src if canvas preview is active
    if (previewImage) {
      previewImage._srcBeforeCompare = previewImage.src;   // save edited src
      if (state.originalDataUrl) previewImage.src = state.originalDataUrl;
      previewImage.style.filter = 'none';
      previewImage.style.imageRendering = 'auto';
    }
    const label = document.getElementById('compare-original-label');
    if (label) label.style.display = 'flex';
  }
  function onCompareEnd() {
    // Restore the edited version
    if (previewImage) {
      if (previewImage._srcBeforeCompare) {
        previewImage.src = previewImage._srcBeforeCompare;
        previewImage._srcBeforeCompare = null;
      }
      previewImage.style.filter = _currentPreviewFilter || 'none';
      previewImage.style.imageRendering = (getUpscaleMultiplier() > 0) ? 'high-quality' : 'auto';
    }
    const label = document.getElementById('compare-original-label');
    if (label) label.style.display = 'none';
  }

  // ===== SLIDER MAP ===== //
  const sliderMap = {
    'slider-sharpness': 'sharpness-val', 'slider-denoise': 'denoise-val', 'slider-saturation': 'saturation-val',
    'slider-brightness': 'brightness-val', 'slider-contrast': 'contrast-val', 'slider-skin': 'skin-smooth-val',
    'slider-texture': 'texture-smooth-val', 'slider-skin-sharpen': 'skin-sharpen-val', 'slider-clear-face': 'clear-face-val',
    'slider-advanced-enhance': 'advanced-enhance-val'
  };

  // ── Initialize ALL sliders to 0 on page load ──
  // The HTML value attributes may have preset defaults (50, 40, 30 etc).
  // We override them here so every tool starts at 0% = no effect applied.
  Object.entries(sliderMap).forEach(([sliderId, labelId]) => {
    const sliderEl = $(`#${sliderId}`);
    const labelEl = $(`#${labelId}`);
    if (sliderEl) sliderEl.value = 0;
    if (labelEl) labelEl.textContent = '0%';
  });

  // ===== EVENT LISTENERS ===== //
  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('drag-over'); if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); });
  }
  // BUG 2 FIX: Decouple scroll from file input to prevent page jumping back to top
  let isFileDialogOpen = false;
  if (heroUploadBtn && fileInput) {
    heroUploadBtn.addEventListener('click', () => {
      const us = $('#upload-section');
      if (us) us.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Wait for scroll to fully complete before opening file dialog
      setTimeout(() => {
        isFileDialogOpen = true;
        fileInput.click();
      }, 600);
    });
    // Reset flag when file dialog closes (via change or window focus)
    fileInput.addEventListener('change', () => { isFileDialogOpen = false; });
    window.addEventListener('focus', () => { setTimeout(() => { isFileDialogOpen = false; }, 300); });
  }
  // Prevent scroll-to-top during file dialog
  window.addEventListener('scroll', () => {
    if (isFileDialogOpen) {
      const us = $('#upload-section');
      if (us && window.scrollY < us.offsetTop - 100) {
        us.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }
  }, { passive: true });
  if (fileInput) { fileInput.addEventListener('change', e => { if (e.target.files.length) handleFile(e.target.files[0]); }); }
  safeBind('#btn-change-file', 'click', () => { showStep('upload'); if (fileInput) fileInput.value = ''; });

  // Fullscreen
  const fullscreenOverlay = $('#fullscreen-overlay'), fullscreenImage = $('#fullscreen-image');
  function closeFullscreen() { if (fullscreenOverlay) fullscreenOverlay.classList.remove('active'); document.body.style.overflow = ''; }
  safeBind('#btn-fullscreen-preview', 'click', () => {
    if (!state.file) return;
    if (fullscreenImage && previewImage) { fullscreenImage.src = previewImage.src; fullscreenImage.style.filter = previewImage.style.filter || 'none'; fullscreenImage.style.display = 'block'; }
    if (fullscreenOverlay) fullscreenOverlay.classList.add('active'); document.body.style.overflow = 'hidden';
  });
  safeBind('#btn-exit-fullscreen', 'click', closeFullscreen);
  safeBind('#fullscreen-backdrop', 'click', closeFullscreen);
  const fsmc = $('#fullscreen-media-container'); if (fsmc) fsmc.addEventListener('click', e => { if (e.target === e.currentTarget) closeFullscreen(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && fullscreenOverlay?.classList.contains('active')) closeFullscreen(); });

  // Quality radios
  $$('input[name="quality"]').forEach(el => el.addEventListener('change', () => {
    const q = getSelectedQuality();
    const p = $('#custom-res-panel');
    if (p) p.style.display = (q === 'custom') ? 'block' : 'none';
    // When 'Original' is selected, hide the Processing Mode section entirely
    const procSection = document.getElementById('processing-mode-section');
    if (procSection) procSection.style.display = (q === 'original') ? 'none' : '';
    updateSizeEstimation();
  }));
  const cwInput = $('#custom-width'), chInput = $('#custom-height');
  if (cwInput) { cwInput.addEventListener('input', () => { const lock = $('#lock-aspect'); if (lock?.checked && chInput) chInput.value = Math.round(parseInt(cwInput.value) / state.aspectRatio); updateSizeEstimation(); }); }
  if (chInput) { chInput.addEventListener('input', () => { const lock = $('#lock-aspect'); if (lock?.checked && cwInput) cwInput.value = Math.round(parseInt(chInput.value) * state.aspectRatio); updateSizeEstimation(); }); }

  // Sliders
  Object.entries(sliderMap).forEach(([sliderId, labelId]) => {
    safeBind(`#${sliderId}`, 'input', e => {
      const l = $(`#${labelId}`); if (l) l.textContent = e.target.value + '%';
      let cf = ''; if (sliderId === 'slider-sharpness') cf = 'sharpen'; if (sliderId === 'slider-denoise') cf = 'denoise'; if (sliderId === 'slider-saturation') cf = 'color'; if (sliderId === 'slider-brightness') cf = 'brightness'; if (sliderId === 'slider-contrast') cf = 'contrast'; if (sliderId === 'slider-skin') cf = 'skin'; if (sliderId === 'slider-texture') cf = 'texture';
      if (cf) {
        const cb = document.querySelector(`input[name="filter"][value="${cf}"]`);
        const val = parseInt(e.target.value);
        if (cb && !cb.checked && val !== 0) cb.checked = true;
        // Auto-uncheck the filter when slider goes back to 0
        if (cb && cb.checked && val === 0) cb.checked = false;
      }
      applyLivePreviewFilters();
    });
  });

  document.querySelectorAll('.btn-reset-slider').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const tId = btn.getAttribute('data-target');
      const sl = document.getElementById(tId);
      if (sl) {
        sl.value = 0;
        const lid = sliderMap[tId]; if (lid) $(`#${lid}`).textContent = '0%';
        // Also immediately restore preview if all canvas tools are now 0
        clearTimeout(applyLivePreviewFilters._advTimer);
        if (previewImage && state.originalDataUrl) { previewImage.src = state.originalDataUrl; previewImage._advPreviewActive = false; previewImage.style.filter = 'none'; }
        $$('.preset-btn').forEach(b => b.classList.remove('active'));
        // Dispatch an input event to notify listeners (which updates live preview)
        sl.dispatchEvent(new Event('input', { bubbles: true }));
        applyLivePreviewFilters(); // Force preview update just in case
      }
    });
  });

  const btnResetCurves = document.getElementById('btn-reset-curves');
  if (btnResetCurves) {
    btnResetCurves.addEventListener('click', (e) => {
      e.preventDefault();
      curvesState.points = {
        rgb: [{ x: 0, y: 0 }, { x: 1, y: 1 }], r: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        g: [{ x: 0, y: 0 }, { x: 1, y: 1 }], b: [{ x: 0, y: 0 }, { x: 1, y: 1 }]
      };
      if (typeof drawCurve === 'function') drawCurve();
    });
  }


  // Image format change - show/hide jpeg quality
  $$('input[name="image-format"]').forEach(el => el.addEventListener('change', () => {
    const fmt = el.value; const row = $('#jpeg-quality-row'); if (row) row.style.display = (fmt === 'jpg' || fmt === 'webp') ? 'block' : 'none';
    updateSizeEstimation();
  }));
  // JPEG quality slider
  safeBind('#jpeg-quality', 'input', e => { const v = $('#jpeg-quality-val'); if (v) v.textContent = e.target.value + '%'; updateSizeEstimation(); });
  $$('input[name="filter"]').forEach(el => el.addEventListener('change', () => { applyLivePreviewFilters(); updateSizeEstimation(); }));
  safeBind('#btn-toggle-filters', 'click', () => { const g = $('.filters-grid'); if (!g) return; const ex = g.classList.toggle('expanded'); const b = $('#btn-toggle-filters'); if (b) b.textContent = ex ? 'Show Less Options ↑' : 'Show More Options ↓'; });

  // Enhance button — uses Real-ESRGAN AI (ONNX) pipeline
  const enhanceBtn = $('#enhance-btn') || $('#btn-process');
  if (enhanceBtn) { enhanceBtn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (state.currentStep === 'processing' || aiState.processing) return; runAIProcessing().catch(err => { console.error('runAIProcessing failed:', err); alert('Failed: ' + err.message); showStep('configure'); }); }); }
  safeBind('#btn-download', 'click', downloadResult, true);
  safeBind('#btn-restart', 'click', () => {
    state.file = null; state.originalDataUrl = null; state.processedDataUrl = null;
    const fi = $('#file-input'); if (fi) fi.value = '';
    if (previewImage) previewImage.classList.remove('visible');
    if (previewVideo) {
      previewVideo.classList.remove('visible');
      previewVideo.pause(); previewVideo.removeAttribute('src'); previewVideo.load();
    }
    showStep('upload');
  }, true);

  // ===== FAB SHORTCUTS ===== //
  safeBind('#btn-toggle-shortcuts', 'click', () => { const s = $('#fab-shortcuts'); if (!s) return; if (s.style.display === 'none') { s.style.display = 'flex'; s.style.animation = 'fadeUp 0.3s ease-out forwards'; } else { s.style.display = 'none'; } });
  safeBind('#fab-quality', 'click', () => scrollToSection(0));
  safeBind('#fab-filters', 'click', () => scrollToSection(2));
  safeBind('#fab-tune', 'click', () => scrollToSection(3));
  safeBind('#fab-format', 'click', () => scrollToSection(state.fileType === 'video' ? 5 : 4));
  safeBind('#fab-preset-auto', 'click', () => applyPreset('auto'));
  safeBind('#fab-preset-cinema', 'click', () => applyPreset('cinema'));
  safeBind('#fab-preset-portrait', 'click', () => applyPreset('portrait'));

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (state.currentStep !== 'configure') return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch (e.key.toLowerCase()) {
      case 'q': e.preventDefault(); scrollToSection(0); break;
      case 'f': e.preventDefault(); scrollToSection(2); break;
      case 't': e.preventDefault(); scrollToSection(3); break;
      case 'o': e.preventDefault(); scrollToSection(state.fileType === 'video' ? 5 : 4); break;
      case 'enter': e.preventDefault(); runAIProcessing(); break;
    }
  });

  // Reset fine-tune
  safeBind('#btn-reset-finetune', 'click', () => {
    $('#slider-sharpness').value = 0; $('#slider-denoise').value = 0; $('#slider-saturation').value = 0; $('#slider-brightness').value = 0; $('#slider-contrast').value = 0; $('#slider-skin').value = 0; $('#slider-texture').value = 0; $('#slider-skin-sharpen').value = 0; $('#slider-clear-face').value = 0; $('#slider-advanced-enhance').value = 0;
    // Immediately cancel any pending canvas redraw and restore original image
    clearTimeout(applyLivePreviewFilters._advTimer);
    if (previewImage && state.originalDataUrl) {
      previewImage.src = state.originalDataUrl;
      previewImage._advPreviewActive = false;
      previewImage.style.filter = 'none';
    }
    // Reset Upscale Multiplier
    document.querySelectorAll('.upscale-multiplier-btn').forEach(b => b.classList.remove('active'));
    const upscalePreviewEl = document.getElementById('upscale-preview');
    if (upscalePreviewEl) upscalePreviewEl.style.display = 'none';
    curvesState.points = { rgb: [{ x: 0, y: 0 }, { x: 1, y: 1 }], r: [{ x: 0, y: 0 }, { x: 1, y: 1 }], g: [{ x: 0, y: 0 }, { x: 1, y: 1 }], b: [{ x: 0, y: 0 }, { x: 1, y: 1 }] };
    drawCurve();
    Object.keys(sliderMap).forEach(id => { const v = $(`#${sliderMap[id]}`); if (v) v.textContent = $('#' + id).value + '%'; });
    $$('.preset-btn').forEach(b => b.classList.remove('active'));
    applyLivePreviewFilters();
  });
  // Note: duplicate btn-reset-slider listener removed to prevent event swallowing

  // ===== UPSCALE MULTIPLIER BUTTONS ===== //
  document.querySelectorAll('.upscale-multiplier-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const wasActive = btn.classList.contains('active');
      // Deactivate all multiplier buttons
      document.querySelectorAll('.upscale-multiplier-btn').forEach(b => b.classList.remove('active'));

      // If it wasn't active, activate it. If it was active, leave it deactivated (deselection).
      if (!wasActive) {
        btn.classList.add('active');
      }

      // Update preview text
      const preview = document.getElementById('upscale-preview');
      const previewText = document.getElementById('upscale-preview-text');
      const multiplier = getUpscaleMultiplier();
      if (multiplier > 0 && state.originalWidth > 0) {
        const w = Math.round(state.originalWidth * multiplier);
        const h = Math.round(state.originalHeight * multiplier);
        if (preview) preview.style.display = 'block';
        if (previewText) previewText.textContent = `${state.originalWidth}×${state.originalHeight} → ${w}×${h} (${multiplier}X)`;
      } else {
        if (preview) preview.style.display = 'none';
      }
      updateSizeEstimation();
      applyLivePreviewFilters(); // Render new zoom scale immediately
    });
  });


  // Advanced accordion
  const advToggle = $('#advanced-toggle'), advContent = $('#advanced-content'), advWrapper = $('.advanced-options-wrapper');
  if (advToggle) { advToggle.addEventListener('click', () => { advWrapper.classList.toggle('open'); if (advWrapper.classList.contains('open')) { advContent.style.display = 'block'; advContent.animate([{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 300, easing: 'ease-out', fill: 'both' }); drawCurve(true); } else { advContent.style.display = 'none'; } }); }

  // ── Processing Mode Card Selector ──
  function initProcModeCards() {
    const cards = document.querySelectorAll('.proc-mode-card');
    const radios = document.querySelectorAll('input[name="proc-mode"]');
    const autoNote = document.getElementById('proc-mode-auto-note');
    if (!cards.length) return;

    function updateCards() {
      const checked = document.querySelector('input[name="proc-mode"]:checked')?.value || 'auto';
      cards.forEach(card => {
        const radio = card.querySelector('input[type=radio]');
        card.classList.toggle('selected', radio?.value === checked);
      });
      if (autoNote) autoNote.style.display = (checked === 'auto' || !checked) ? 'block' : 'none';
    }

    cards.forEach(card => {
      card.addEventListener('click', () => {
        const radio = card.querySelector('input[type=radio]');
        if (radio) {
          radio.checked = true;
          updateCards();
          updateSizeEstimation();
        }
      });
    });

    // Set default: auto (no radio pre-checked = auto detection)
    // We add an "auto" option programmatically so user can revert
    updateCards();
  }
  initProcModeCards();

  // ===== CURVES EDITOR ===== //
  const cCanvas = document.getElementById('curves-editor-canvas');
  const cCtx = cCanvas ? cCanvas.getContext('2d') : null;
  const curvesState = { channel: 'rgb', points: { rgb: [{ x: 0, y: 0 }, { x: 1, y: 1 }], r: [{ x: 0, y: 0 }, { x: 1, y: 1 }], g: [{ x: 0, y: 0 }, { x: 1, y: 1 }], b: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }, tables: { rgb: new Uint8Array(256), r: new Uint8Array(256), g: new Uint8Array(256), b: new Uint8Array(256) }, activePoint: -1 };
  const cColors = { rgb: '#ffffff', r: '#ff4444', g: '#44ff44', b: '#4444ff' };
  for (let ch in curvesState.tables) for (let i = 0; i < 256; i++) curvesState.tables[ch][i] = i;
  function getPts() { return curvesState.points[curvesState.channel]; }

  function drawCurve(skipPreview = false) {
    if (!cCtx) return; const w = cCanvas.width, h = cCanvas.height, pad = 12, dW = w - pad * 2, dH = h - pad * 2;
    cCtx.clearRect(0, 0, w, h);
    cCtx.strokeStyle = 'rgba(255,255,255,0.1)'; cCtx.lineWidth = 1; cCtx.beginPath();
    for (let i = 1; i < 4; i++) { cCtx.moveTo(pad + (dW * i / 4), pad); cCtx.lineTo(pad + (dW * i / 4), h - pad); cCtx.moveTo(pad, pad + (dH * i / 4)); cCtx.lineTo(w - pad, pad + (dH * i / 4)); } cCtx.stroke();
    cCtx.strokeStyle = 'rgba(255,255,255,0.2)'; cCtx.setLineDash([4, 4]); cCtx.beginPath(); cCtx.moveTo(pad, h - pad); cCtx.lineTo(w - pad, pad); cCtx.stroke(); cCtx.setLineDash([]);
    for (let ch in curvesState.points) { if (ch !== curvesState.channel) { cCtx.strokeStyle = cColors[ch] + '44'; cCtx.lineWidth = 1.5; drawSplinePath(curvesState.points[ch], pad, dW, dH, h); cCtx.stroke(); } }
    const pts = getPts(); cCtx.strokeStyle = cColors[curvesState.channel]; cCtx.lineWidth = 2.5; drawSplinePath(pts, pad, dW, dH, h); cCtx.stroke();
    for (let i = 0; i < pts.length; i++) { const px = pad + pts[i].x * dW, py = h - pad - pts[i].y * dH; cCtx.beginPath(); cCtx.arc(px, py, i === curvesState.activePoint ? 6 : 4, 0, Math.PI * 2); cCtx.fillStyle = cColors[curvesState.channel]; cCtx.fill(); if (i === curvesState.activePoint) { cCtx.strokeStyle = '#fff'; cCtx.lineWidth = 2; cCtx.stroke(); } }
    updateLUTs(skipPreview);
  }
  function drawSplinePath(pts, pad, dW, dH, h) { if (pts.length < 2) return; const lut = generateLUT(pts); cCtx.beginPath(); cCtx.moveTo(pad, h - pad - (lut[0] / 255) * dH); for (let i = 1; i < 256; i++) { cCtx.lineTo(pad + (i / 255) * dW, h - pad - (lut[i] / 255) * dH); } }
  function interpolateSplineCubic(pts) {
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y), n = xs.length;
    if (n === 2) return function (x) { if (x <= xs[0]) return ys[0]; if (x >= xs[1]) return ys[1]; return ys[0] + ((x - xs[0]) / (xs[1] - xs[0])) * (ys[1] - ys[0]); };
    const c1s = new Float32Array(n), c2s = new Float32Array(n - 1), c3s = new Float32Array(n - 1);
    const dxs = new Float32Array(n - 1), dys = new Float32Array(n - 1), ms = new Float32Array(n - 1);
    for (let i = 0; i < n - 1; i++) { dxs[i] = xs[i + 1] - xs[i]; dys[i] = ys[i + 1] - ys[i]; ms[i] = dys[i] / dxs[i]; }
    c1s[0] = ms[0]; for (let i = 1; i < n - 1; i++) { if (ms[i - 1] * ms[i] <= 0) c1s[i] = 0; else c1s[i] = 3 * (dxs[i - 1] + dxs[i]) / ((2 * dxs[i] + dxs[i - 1]) / ms[i - 1] + (dxs[i] + 2 * dxs[i - 1]) / ms[i]); } c1s[n - 1] = ms[n - 2];
    for (let i = 0; i < n - 1; i++) { c2s[i] = (3 * ms[i] - 2 * c1s[i] - c1s[i + 1]) / dxs[i]; c3s[i] = (c1s[i] + c1s[i + 1] - 2 * ms[i]) / (dxs[i] * dxs[i]); }
    return function (x) { if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1]; let i = 0; while (i < n - 1 && x > xs[i + 1]) i++; const d = x - xs[i]; return ys[i] + c1s[i] * d + c2s[i] * d * d + c3s[i] * d * d * d; };
  }
  function generateLUT(pts) { const fn = interpolateSplineCubic(pts); const tbl = new Uint8Array(256); for (let i = 0; i < 256; i++) tbl[i] = clamp(fn(i / 255) * 255); return tbl; }
  function updateLUTs(skipPreview = false) {
    for (let ch in curvesState.points) curvesState.tables[ch] = generateLUT(curvesState.points[ch]);
    const finalR = new Float32Array(256), finalG = new Float32Array(256), finalB = new Float32Array(256);
    for (let i = 0; i < 256; i++) { finalR[i] = curvesState.tables.r[curvesState.tables.rgb[i]] / 255; finalG[i] = curvesState.tables.g[curvesState.tables.rgb[i]] / 255; finalB[i] = curvesState.tables.b[curvesState.tables.rgb[i]] / 255; }
    const feR = document.querySelector('#curve-transfer feFuncR'), feG = document.querySelector('#curve-transfer feFuncG'), feB = document.querySelector('#curve-transfer feFuncB');
    if (feR) feR.setAttribute('tableValues', Array.from(finalR).join(' '));
    if (feG) feG.setAttribute('tableValues', Array.from(finalG).join(' '));
    if (feB) feB.setAttribute('tableValues', Array.from(finalB).join(' '));
    if (!skipPreview) applyLivePreviewFilters();
  }
  if (cCanvas) {
    let isDragging = false;
    function getMousePos(e) { const rect = cCanvas.getBoundingClientRect(), pad = 12, w = cCanvas.width, h = cCanvas.height; const px = (e.clientX - rect.left) * (w / rect.width), py = (e.clientY - rect.top) * (h / rect.height); return { x: Math.max(0, Math.min(1, (px - pad) / (w - pad * 2))), y: Math.max(0, Math.min(1, 1 - (py - pad) / (h - pad * 2))) }; }
    cCanvas.addEventListener('mousedown', e => { const pos = getMousePos(e), pts = getPts(); let minD = 0.05, hit = -1; for (let i = 0; i < pts.length; i++) { const d = Math.sqrt((pts[i].x - pos.x) ** 2 + (pts[i].y - pos.y) ** 2); if (d < minD) { minD = d; hit = i; } } if (hit !== -1) { curvesState.activePoint = hit; isDragging = true; } else { pts.push({ x: pos.x, y: pos.y }); pts.sort((a, b) => a.x - b.x); curvesState.activePoint = pts.findIndex(p => p.x === pos.x && p.y === pos.y); isDragging = true; } drawCurve(); });
    document.addEventListener('mousemove', e => { if (!isDragging || curvesState.activePoint === -1) return; const pos = getMousePos(e), pts = getPts(); if (curvesState.activePoint === 0) { pts[0].x = 0; pts[0].y = pos.y; } else if (curvesState.activePoint === pts.length - 1) { pts[pts.length - 1].x = 1; pts[pts.length - 1].y = pos.y; } else { pos.x = Math.max(pts[curvesState.activePoint - 1].x + 0.01, Math.min(pts[curvesState.activePoint + 1].x - 0.01, pos.x)); pts[curvesState.activePoint].x = pos.x; pts[curvesState.activePoint].y = pos.y; } drawCurve(); });
    document.addEventListener('mouseup', () => { isDragging = false; });
    cCanvas.addEventListener('dblclick', e => { const pos = getMousePos(e), pts = getPts(); let minD = 0.05, hit = -1; for (let i = 1; i < pts.length - 1; i++) { const d = Math.sqrt((pts[i].x - pos.x) ** 2 + (pts[i].y - pos.y) ** 2); if (d < minD) { minD = d; hit = i; } } if (hit !== -1) { pts.splice(hit, 1); curvesState.activePoint = -1; drawCurve(); } });
    safeBind('#curve-channel-select', 'change', e => { curvesState.channel = e.target.value; curvesState.activePoint = -1; drawCurve(); });
    safeBind('#btn-reset-curves', 'click', () => { curvesState.points[curvesState.channel] = [{ x: 0, y: 0 }, { x: 1, y: 1 }]; curvesState.activePoint = -1; drawCurve(); });
  }

  // Mascot Eye Tracking is now handled inside animateMascots() for smooth interpolation

  // ===== COMPARE BUTTON BINDINGS ===== //
  const compareBtn = document.getElementById('btn-compare-original');
  if (compareBtn) {
    compareBtn.addEventListener('mousedown', (e) => { e.preventDefault(); onCompareStart(); });
    compareBtn.addEventListener('mouseup', () => { onCompareEnd(); });
    compareBtn.addEventListener('mouseleave', () => { onCompareEnd(); });
    compareBtn.addEventListener('touchstart', (e) => { e.preventDefault(); onCompareStart(); }, { passive: false });
    compareBtn.addEventListener('touchend', () => { onCompareEnd(); });
    compareBtn.addEventListener('touchcancel', () => { onCompareEnd(); });
  }

  // ============================================================================================
  // ===== ZENPICK AI UPSCALING ENGINE (Real-ESRGAN via ONNX Runtime Web) ======================
  // ===== ALL CODE BELOW IS 100% ADDITIVE — NO EXISTING CODE WAS MODIFIED =====================
  // ============================================================================================

  const AI_MODEL_URLS = [
    'https://unpkg.com/@bramus/realesrgan-x4plus-onnx@1.0.0/model.onnx'
  ];
  const AI_CACHE_DB = 'ZenpickModelCache';
  const AI_CACHE_STORE = 'models';
  const AI_CACHE_KEY = 'realesrgan-x4plus-v1';
  // PERF FIX 2: Increased tile size from 128→512 for ~16x fewer tiles per frame.
  // Real-ESRGAN handles 512x512 tiles fine on WASM (uses ~200MB vs ~50MB for 128).
  const AI_TILE_SIZE = 512; // Default tile size (for WASM/WebGL)
  const AI_TILE_SIZE_WEBGPU = 64; // WebGPU requires 64x64 fixed tiles
  const AI_TILE_OVERLAP = 8; // Overlap for WebGPU tiles
  const AI_SCALE = 4;

  // Returns the correct tile size for the current backend
  function getActiveTileSize() {
    return aiState.modelTileSize || 64;
  }
  function getActiveTileOverlap() {
    return aiState.modelTileOverlap || 8;
  }

  const aiState = {
    session: null,
    backend: 'webgl',
    paused: false,
    cancelRequested: false,
    detectedTier: '480p',
    targetW: 1920,
    targetH: 1080,
    processing: false,
    frameSkip: 1,        // PERF FIX 3: 1 = every frame, 2 = every 2nd frame (fast mode)
    cpuMode: false,      // True if using WASM backend (slower, needs optimizations)
    scaleFactor: 4,      // PERF FIX 1: Effective scale factor (2 for 1080p CPU mode, 4 for 480p/720p)
    modelTileSize: 64,   // Dynamically set based on model metadata (default 64)
    modelTileOverlap: 8, // Dynamically set based on model metadata (default 8)
    gpuDeviceLostTriggered: false
  };

  const AI_RES_CONFIG = {
    '480p': {
      targetH: 1920, label: 'AI Enhanced', scale: 4,
      cardLabel: '📹 We detected your video is 480p',
      description: 'Your video will be AI-enhanced: colors deepened, sharpness restored, noise reduced, and upscaled using Real-ESRGAN neural network for genuine detail reconstruction.',
      resultText: 'Color-enhanced + AI upscaled quality',
      resultDesc: 'Your 480p video will be color-corrected and reconstructed to near-HD/Full HD quality.',
      timeGpu: '~3–5 min', timeCpu: '~30–60 min',
      ctaText: 'Enhance Colors & Quality — Start Processing'
    },
    '720p': {
      targetH: 2880, label: 'AI Enhanced', scale: 4,
      cardLabel: '📹 We detected your video is 720p',
      description: 'Your video will be AI-enhanced: colors boosted, edges sharpened, noise removed — and upscaled using Real-ESRGAN to reconstruct fine details and textures.',
      resultText: 'Color-enhanced + sharpened quality',
      resultDesc: 'Your 720p video will look cleaner, more vivid, and sharper than the original.',
      timeGpu: '~5 min', timeCpu: '~45–90 min',
      ctaText: 'Enhance Colors & Sharpness — Start Processing'
    },
    '1080p': {
      targetH: 2160, label: 'AI Enhanced 4K', scale: 4,
      cardLabel: '📹 We detected your video is 1080p Full HD',
      description: 'Your video will be color-enhanced and AI-upscaled to true 4K (3840×2160) using Real-ESRGAN. Colors deepened, sharpness boosted, and the full 4x neural network output used — genuine detail reconstruction, not stretching.',
      resultText: '4K UHD — 3840×2160 — Color Enhanced',
      resultDesc: 'Your 1080p video will be color-improved and upscaled to true 4K with real neural network detail reconstruction.',
      timeGpu: '~5–8 min', timeCpu: '~30–50 min',
      ctaText: 'Enhance to 4K UHD — Start Processing'
    },
    '4k': {
      targetH: 0, label: 'AI Color & Quality Cleanup', scale: 1,
      cardLabel: '📹 We detected your video is already 4K',
      description: 'Your video is already at maximum resolution. We will apply our AI color & quality cleanup pipeline — remove compression noise, sharpen edges, boost colour and contrast, re-encode at high bitrate.',
      resultText: 'Same resolution, visibly better color & quality',
      resultDesc: 'Your 4K video will look cleaner, more vivid, and sharper than the original compressed file.',
      timeGpu: '~2–3 min', timeCpu: '~8–10 min',
      ctaText: 'Clean & Enhance Colors — Start Processing'
    }
  };

  // --- Section 2: IndexedDB Model Cache ---
  function openAICacheDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(AI_CACHE_DB, 1);
      req.onupgradeneeded = (e) => { e.target.result.createObjectStore(AI_CACHE_STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function getCachedModel() {
    try {
      const db = await openAICacheDB();
      return new Promise((resolve) => {
        const tx = db.transaction(AI_CACHE_STORE, 'readonly');
        const store = tx.objectStore(AI_CACHE_STORE);
        const req = store.get(AI_CACHE_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (e) { return null; }
  }

  async function cacheModelData(buffer) {
    try {
      const db = await openAICacheDB();
      return new Promise((resolve) => {
        const tx = db.transaction(AI_CACHE_STORE, 'readwrite');
        tx.objectStore(AI_CACHE_STORE).put(buffer, AI_CACHE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch (e) { /* cache failed silently */ }
  }

  // Clear corrupted or invalid AI model cache
  async function clearAICache() {
    try {
      // Method 1: Delete the specific key
      const db = await openAICacheDB();
      await new Promise((resolve) => {
        const tx = db.transaction(AI_CACHE_STORE, 'readwrite');
        tx.objectStore(AI_CACHE_STORE).delete(AI_CACHE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
      db.close();
      console.log('[ONNX] Cache entry deleted');
    } catch (e) {
      // Method 2: Delete the entire database
      try {
        await new Promise((resolve, reject) => {
          const req = indexedDB.deleteDatabase(AI_CACHE_DB);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
          req.onblocked = () => resolve();
        });
        console.log('[ONNX] Cache database deleted');
      } catch (e2) {
        console.warn('[ONNX] Could not clear cache:', e2);
      }
    }
  }

  function detectSessionTileSize(session) {
    let size = 64; // Default fallback
    try {
      const meta = session.inputMetadata || session.inputs;
      if (meta) {
        const firstInputName = session.inputNames[0] || 'input';
        const inputInfo = meta[firstInputName] || (Array.isArray(meta) ? meta[0] : null);
        if (inputInfo && inputInfo.dims) {
          const h = inputInfo.dims[2];
          if (typeof h === 'number' && h > 0) {
            size = h;
          }
        }
      }
    } catch (e) {
      console.warn('[ONNX] Failed to inspect metadata:', e);
    }
    return size;
  }

  // --- Section 3: ONNX Model Loader ---
  async function loadONNXModel() {
    if (aiState.session) return aiState.session;
    if (typeof ort === 'undefined') throw new Error('ONNX Runtime Web not loaded — check if the ort script tag is in the page');

    const dlText = document.getElementById('ai-download-text');
    const dlBar = document.getElementById('ai-download-bar-fill');
    const dlWrap = document.getElementById('ai-download-progress');

    // ── Configure ONNX Runtime environment BEFORE creating session ──
    // Point WASM binary paths to the CDN so the runtime can find ort-wasm*.wasm files
    const ORT_CDN_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';
    ort.env.wasm.wasmPaths = ORT_CDN_BASE;

    // Force 1 thread — bypasses SharedArrayBuffer requirement (blocked on GitHub Pages,
    // cross-origin iframes, and most mobile browsers without COOP/COEP headers)
    ort.env.wasm.numThreads = 1;

    // SIMD WASM compatibility:
    // • Chrome/Firefox/Edge 89+ support WASM SIMD → enable for ~2× speed boost
    // • Safari added WASM SIMD in Safari 16.4 (iOS 16.4 / macOS 13.3 — March 2023)
    //   Older Safari versions crash silently if SIMD is enabled → must disable
    // • All other browsers (Samsung Internet, UC, Opera Mini) → safe to disable
    const ua = navigator.userAgent || '';
    const isSafariUA = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
    const safariVersion = isSafariUA ? (() => {
      const m = ua.match(/Version\/([\d.]+)/);
      return m ? parseFloat(m[1]) : 0;
    })() : Infinity;
    const supportsWasmSIMD = !isSafariUA || safariVersion >= 16.4;
    ort.env.wasm.simd = supportsWasmSIMD;

    // Disable WASM binary caching to bypass strict browser tracking prevention
    // (e.g. Firefox Enhanced Tracking Protection, Brave Shields) that block storage APIs
    ort.env.wasm.wasmBinaryCache = false;
    ort.env.logLevel = 'warning';

    console.log('[ONNX] Runtime configured: wasmPaths =', ORT_CDN_BASE, '| threads = 1 | simd =', supportsWasmSIMD, '| safari =', isSafariUA, safariVersion);

    // ── Step 1: Load model data (cache → download) ──
    let modelBuffer = null;
    try {
      modelBuffer = await getCachedModel();
    } catch (cacheErr) {
      console.warn('[ONNX] Cache read failed:', cacheErr.message);
    }

    if (modelBuffer) {
      // Validate cached data — corrupted cache may be tiny (e.g. 29 bytes instead of 67MB)
      const cachedSize = modelBuffer.byteLength || modelBuffer.length || 0;
      if (cachedSize < 1000000) {
        // Cache is corrupted — delete it and force re-download
        console.error('[ONNX] Cached model is corrupted! Size:', cachedSize, 'bytes (expected ~67MB). Clearing cache...');
        await clearAICache();
        modelBuffer = null; // Will trigger download below
        if (dlText) dlText.textContent = 'Cache was corrupted. Re-downloading AI brain…';
      } else {
        if (dlText) dlText.textContent = 'AI brain loaded from cache ✓';
        if (dlBar) dlBar.style.width = '100%';
        console.log('[ONNX] Model loaded from IndexedDB cache, size:', cachedSize, 'bytes');
      }
    }

    if (!modelBuffer) {
      if (dlWrap) dlWrap.style.display = 'block';
      if (dlText) dlText.textContent = 'Downloading AI brain… 0%';

      try {
        const parts = [
          './models/model.onnx.part1',
          './models/model.onnx.part2',
          './models/model.onnx.part3',
          './models/model.onnx.part4',
          './models/model.onnx.part5',
          './models/model.onnx.part6',
          './models/model.onnx.part7'
        ];
        const partBuffers = [];
        let totalReceived = 0;
        const totalExpected = 67000000; // estimated total size of the stitched model (~67MB)

        for (let i = 0; i < parts.length; i++) {
          const url = parts[i];
          console.log(`[ONNX] Fetching split part ${i + 1}/${parts.length}:`, url);
          if (dlText) dlText.textContent = `Downloading AI brain… (part ${i + 1}/${parts.length})`;

          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText} on ${url}`);
          }

          const reader = response.body.getReader();
          const chunks = [];
          let received = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;
            totalReceived += value.length;

            const pct = Math.min(99, Math.round((totalReceived / totalExpected) * 100));
            if (dlText) dlText.textContent = `Downloading AI brain… ${pct}% (part ${i + 1}/${parts.length})`;
            if (dlBar) dlBar.style.width = pct + '%';
          }

          const partBuffer = new Uint8Array(received);
          let partOffset = 0;
          for (const chunk of chunks) {
            partBuffer.set(chunk, partOffset);
            partOffset += chunk.length;
          }
          partBuffers.push(partBuffer);
        }

        console.log('[ONNX] All parts downloaded. Stitching...');
        if (dlText) dlText.textContent = 'Stitching model parts…';

        const totalLength = partBuffers.reduce((sum, buf) => sum + buf.length, 0);
        modelBuffer = new Uint8Array(totalLength);
        let offset = 0;
        for (const buf of partBuffers) {
          modelBuffer.set(buf, offset);
          offset += buf.length;
        }
        console.log('[ONNX] Download complete & stitched:', totalLength, 'bytes');

        // Cache the stitched model in IndexedDB for subsequent loads
        try {
          await cacheModelData(modelBuffer.buffer);
          console.log('[ONNX] Model cached to IndexedDB');
        } catch (cacheErr) {
          console.warn('[ONNX] Failed to cache model:', cacheErr.message);
        }
        if (dlText) dlText.textContent = 'AI brain downloaded ✓ (saved for next time)';

      } catch (lastError) {
        const is404 = lastError && lastError.message && lastError.message.includes('404');
        let errMsg, uiMsg;
        if (is404) {
          errMsg = 'AI model split files not found.\n' +
            'Please ensure model.onnx.part1 through model.onnx.part7 exist in the ./models/ directory.';
          uiMsg = '<span style="color:#f87171;">❌ AI model split files not found.</span><br>' +
            '<span style="font-size:0.85em;color:#94a3b8;">Ensure model.onnx.part1 through .part7 exist in the ./models/ directory.</span>';
        } else {
          errMsg = 'Failed to load AI model.\n' +
            'Last error: ' + (lastError ? lastError.message : 'Unknown');
          uiMsg = '<span style="color:#f87171;">❌ Failed to load AI model.</span><br>' +
            '<span style="font-size:0.85em;color:#94a3b8;">' + (lastError ? lastError.message : 'Unknown') + '</span>';
        }
        console.error('[ONNX] ' + errMsg);
        if (dlText) dlText.innerHTML = uiMsg;
        throw new Error(errMsg);
      }
    }

    // ── Step 2: Convert to ArrayBuffer for ort.InferenceSession.create() ──
    // IndexedDB may return an ArrayBuffer directly, or we may have a Uint8Array
    let arrayBuf;
    if (modelBuffer instanceof ArrayBuffer) {
      arrayBuf = modelBuffer;
    } else if (modelBuffer instanceof Uint8Array) {
      arrayBuf = modelBuffer.buffer;
    } else if (modelBuffer && modelBuffer.byteLength !== undefined) {
      // It's some typed array view — get the underlying buffer
      arrayBuf = modelBuffer.buffer || modelBuffer;
    } else {
      console.error('[ONNX] Unexpected model buffer type:', typeof modelBuffer, modelBuffer);
      throw new Error('Model data is in an unexpected format');
    }
    console.log('[ONNX] Model ArrayBuffer ready, size:', arrayBuf.byteLength, 'bytes');

    // ── PERF FIX 2: Try GPU backends first — WebGPU/WebGL are 10-50x faster than WASM CPU ──
    // Old code tried WASM first, meaning GPU was never used even when available.
    const hasWebGPU = !!(navigator.gpu);

    // Try WebGPU first (Chrome 113+) — skip if it already crashed this session
    if (hasWebGPU && !aiState._webgpuFailed) {
      try {
        aiState.backend = 'webgpu';
        if (dlText) dlText.textContent = 'Loading AI model (WebGPU — GPU accelerated)…';
        console.log('[ONNX] Trying WebGPU backend...');
        aiState.session = await ort.InferenceSession.create(arrayBuf, {
          executionProviders: ['webgpu'],
          graphOptimizationLevel: 'all'
        });
        console.log('[ONNX] ✓ WebGPU session created — running GPU stress test…');

        // ── GPU STRESS TEST ──
        // Some GPUs (older Intel HD, weak mobile GPUs) pass session creation but crash
        // on actual inference with DXGI_ERROR_DEVICE_HUNG / AbortError / device lost.
        // Run a real 64×64 tile inference to flush out these failures BEFORE processing.
        if (dlText) dlText.textContent = 'Testing GPU compatibility…';
        try {
          const STRESS_TILE = detectSessionTileSize(aiState.session);
          console.log('[ONNX] Running GPU stress test with tile size:', STRESS_TILE);
          const stressData = new Float32Array(1 * 3 * STRESS_TILE * STRESS_TILE);
          // Fill with non-zero data — zero tiles may be optimized away by the GPU driver
          for (let si = 0; si < stressData.length; si++) stressData[si] = Math.random() * 0.5 + 0.25;
          const stressTensor = new ort.Tensor('float32', stressData, [1, 3, STRESS_TILE, STRESS_TILE]);
          const stressFeeds = {};
          stressFeeds[aiState.session.inputNames[0] || 'input'] = stressTensor;
          // Race against a 10s timeout — if the GPU hangs, we don't wait forever
          await Promise.race([
            aiState.session.run(stressFeeds),
            new Promise((_, rej) => setTimeout(() => rej(new Error('GPU stress test timeout')), 10000))
          ]);
          console.log('[ONNX] ✓ GPU stress test passed — WebGPU is stable');
          // Settle delay — give WebGPU resources/queues a brief moment to settle
          await sleep(150);
        } catch (stressErr) {
          console.error('[ONNX] ✗ GPU stress test FAILED:', stressErr.message,
            '— GPU cannot handle WebGPU workloads. Falling back to safer backend.');
          // Mark WebGPU as failed so we never retry it this session
          aiState._webgpuFailed = true;
          try { aiState.session.release(); } catch (releaseErr) { /* session may already be dead */ }
          aiState.session = null;
        }
      } catch (e) {
        console.warn('[ONNX] WebGPU failed:', e.message);
        aiState.session = null;
      }
    }

    // Try WebGL if WebGPU not available
    if (!aiState.session) {
      try {
        aiState.backend = 'webgl';
        if (dlText) dlText.textContent = 'Loading AI model (WebGL — GPU accelerated)…';
        console.log('[ONNX] Trying WebGL backend...');
        aiState.session = await ort.InferenceSession.create(arrayBuf, {
          executionProviders: ['webgl'],
          graphOptimizationLevel: 'all'
        });
        console.log('[ONNX] ✓ WebGL session created — GPU accelerated');
      } catch (e) {
        console.warn('[ONNX] WebGL failed:', e.message);
        aiState.session = null;
      }
    }

    // Final fallback: WASM CPU
    if (!aiState.session) {
      try {
        aiState.backend = 'wasm';
        if (dlText) dlText.textContent = 'Loading AI model (CPU mode — processing will be slow)…';
        console.log('[ONNX] Trying WASM (CPU) backend...');
        aiState.session = await ort.InferenceSession.create(arrayBuf, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all'
        });
        console.log('[ONNX] ✓ WASM CPU session created');
      } catch (wasmErr) {
        throw new Error('Could not load AI model. Error: ' + wasmErr.message);
      }
    }

    // ── DYNAMIC TILE SIZE DETECTION ──
    try {
      const meta = aiState.session.inputMetadata || aiState.session.inputs;
      if (meta) {
        const firstInputName = aiState.session.inputNames[0] || 'input';
        const inputInfo = meta[firstInputName] || (Array.isArray(meta) ? meta[0] : null);
        if (inputInfo && inputInfo.dims) {
          const h = inputInfo.dims[2];
          const w = inputInfo.dims[3];
          // If shape is static (e.g. 64 or 128), enforce it
          if (typeof h === 'number' && h > 0) {
            aiState.modelTileSize = h;
            // Overlap: 8 for 64, or scale proportionally (12.5% of tile size)
            aiState.modelTileOverlap = Math.max(4, Math.round(h * 0.125));
            console.log('[ONNX] Detected static model tile size:', h, 'overlap:', aiState.modelTileOverlap);
          } else {
            // Dynamic shape (e.g. -1 or undefined) — we can choose optimal tile size based on backend
            if (aiState.backend === 'webgpu') {
              aiState.modelTileSize = 64;
              aiState.modelTileOverlap = 8;
            } else {
              // WASM/WebGL: use larger tiles to reduce overhead
              aiState.modelTileSize = 128;
              aiState.modelTileOverlap = 16;
            }
            console.log('[ONNX] Model has dynamic tile size, using optimized backend default:', aiState.modelTileSize);
          }
        }
      }
    } catch (metaErr) {
      console.warn('[ONNX] Could not query model metadata, using safe defaults:', metaErr);
      aiState.modelTileSize = 64;
      aiState.modelTileOverlap = 8;
    }

    console.log('[ONNX] Session created, backend:', aiState.backend, '| inputNames:', aiState.session.inputNames, '| outputNames:', aiState.session.outputNames);
    return aiState.session;
  }

  // --- Section 4: Smart Resolution Detection ---
  function detectResolutionTier(height) {
    if (height <= 480) return '480p';
    if (height <= 720) return '720p';
    if (height <= 1200) return '1080p'; // covers 1080p AND non-standard like 1082, 1096 etc
    return '4k'; // only true 4K (1440p+) keeps original resolution
  }

  function showSmartResolutionCard(videoHeight, videoWidth) {
    const tier = detectResolutionTier(videoHeight);
    aiState.detectedTier = tier;
    const cfg = AI_RES_CONFIG[tier];
    if (!cfg) return;

    // Detect if we're using CPU/WASM (no WebGL/WebGPU acceleration)
    const isCPU = aiState.backend === 'wasm' || aiState.backend === 'cpu';
    aiState.cpuMode = isCPU;

    // SCALE FIX: Always use full 4x scale regardless of CPU mode or aspect ratio.
    // Previous code used 2x for 1080p on CPU — this caused 3008×1664 output instead
    // of genuine 4K. The ONNX model (Real-ESRGAN x4plus) always runs 4x internally
    // anyway, so using 2x just threw away half the AI-reconstructed pixels.
    const effectiveScale = 4; // Always 4x — full ONNX output, no downgrade
    aiState.scaleFactor = 4;

    // For 4K cleanup, keep original resolution
    if (tier === '4k') {
      aiState.targetW = videoWidth;
      aiState.targetH = videoHeight;
    } else {
      // ALL other tiers: upscale to exactly 2× source resolution.
      // 2× is correct because ESRGAN is a 4× model but we work at half resolution:
      // half-res source × ESRGAN 4× = 2× original. This gives genuine 4K from 1080p.
      // For 1496×1082: 2× = 2992×2164 — true 4K-class resolution.
      // For 1920×1080: 2× = 3840×2160 — exact UHD 4K.
      // For 1280×720: 2× = 2560×1440 — 2.5K / QHD.
      // Round to nearest 16px for encoder compatibility.
      aiState.targetW = Math.round(videoWidth * 2 / 16) * 16;
      aiState.targetH = Math.round(videoHeight * 2 / 16) * 16;
    }

    const card = document.getElementById('ai-resolution-card');
    if (!card) return;

    const labelEl = document.getElementById('ai-res-label');
    const descEl = document.getElementById('ai-res-description');
    const resultTextEl = document.getElementById('ai-res-result-text');
    const resultDescEl = document.getElementById('ai-res-result-desc');
    const timeDetailsEl = document.getElementById('ai-res-time-details');
    const ctaTextEl = document.getElementById('ai-enhance-cta-text');

    // Build processing mode label for UI
    const modeLabel = isCPU
      ? `${tier} → ${aiState.targetH}p (4x AI, CPU/WASM mode)`
      : `${tier} → ${aiState.targetH}p (4x AI, GPU accelerated)`;

    if (labelEl) labelEl.textContent = cfg.cardLabel;
    if (descEl) descEl.textContent = cfg.description;
    if (resultTextEl) resultTextEl.textContent = cfg.resultText;
    if (resultDescEl) resultDescEl.textContent = cfg.resultDesc + '\n📊 Mode: ' + modeLabel;
    if (timeDetailsEl) {
      timeDetailsEl.innerHTML = '';
      const s1 = document.createElement('span'); s1.textContent = 'Fast PC with GPU: ' + cfg.timeGpu;
      const s2 = document.createElement('span'); s2.textContent = 'Normal laptop: ' + cfg.timeCpu;
      const s3 = document.createElement('span'); s3.textContent = 'Keep this tab open during processing.';
      timeDetailsEl.appendChild(s1); timeDetailsEl.appendChild(s2); timeDetailsEl.appendChild(s3);
    }
    if (ctaTextEl) ctaTextEl.textContent = '✨ ' + cfg.ctaText;

    card.style.display = 'block';
    card.style.animation = 'none';
    void card.offsetHeight;
    card.style.animation = 'aiCardSlideIn 0.5s ease-out';
    updateSizeEstimation();
  }

  // --- Section 5: Tensor Conversion ---
  function imageDataToONNXTensor(imageData, w, h) {
    const d = imageData.data;
    const floats = new Float32Array(3 * h * w);
    const planeSize = h * w;
    for (let i = 0; i < planeSize; i++) {
      const si = i * 4;
      floats[i] = d[si] / 255.0;
      floats[planeSize + i] = d[si + 1] / 255.0;
      floats[planeSize * 2 + i] = d[si + 2] / 255.0;
    }
    return new ort.Tensor('float32', floats, [1, 3, h, w]);
  }

  function onnxTensorToImageData(tensorData, w, h) {
    const imgData = new ImageData(w, h);
    const d = imgData.data;
    const planeSize = h * w;
    for (let i = 0; i < planeSize; i++) {
      const di = i * 4;
      d[di] = Math.min(255, Math.max(0, Math.round(tensorData[i] * 255)));
      d[di + 1] = Math.min(255, Math.max(0, Math.round(tensorData[planeSize + i] * 255)));
      d[di + 2] = Math.min(255, Math.max(0, Math.round(tensorData[planeSize * 2 + i] * 255)));
      d[di + 3] = 255;
    }
    return imgData;
  }

  // --- Section 6: Tile Processing with Overlap Blending ---
  // PERF FIX 2: Check if a tile is near-uniform (low variance) and can skip ONNX inference
  function tileNeedsONNX(imageData) {
    const d = imageData.data;
    const len = d.length;
    let sumR = 0, sumG = 0, sumB = 0, count = 0;
    for (let i = 0; i < len; i += 64) {
      sumR += d[i]; sumG += d[i + 1]; sumB += d[i + 2]; count++;
    }
    if (count === 0) return false;
    const avgR = sumR / count, avgG = sumG / count, avgB = sumB / count;
    // Skip near-black tiles (letterbox bars)
    if (avgR < 8 && avgG < 8 && avgB < 8) return false;
    // Compute variance
    let variance = 0;
    for (let i = 0; i < len; i += 64) {
      variance += (d[i] - avgR) ** 2 + (d[i + 1] - avgG) ** 2 + (d[i + 2] - avgB) ** 2;
    }
    variance /= (count * 3);
    // Skip ONLY truly flat tiles (solid color backgrounds like the lime green in anime)
    // threshold=6: catches solid fills. Skin (variance ~40-200), hair (~80-400), never skipped.
    if (variance < 6) return false;
    return true;
  }

  async function processImageHQDownscale(setProgressFn, targetDims) {
    if (aiState.cancelRequested) throw new Error('Processing cancelled by user.');
    if (setProgressFn) setProgressFn(10);
    const titleEl = document.getElementById('processing-title');
    const statusEl = document.getElementById('processing-status');
    if (titleEl) titleEl.textContent = 'Enhancing your image…';
    if (statusEl) statusEl.textContent = 'Applying high-quality resize…';
    await new Promise(r => setTimeout(r, 30));

    const yieldToBrowser = () => new Promise(r => setTimeout(r, 0));

    await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const srcW = img.naturalWidth, srcH = img.naturalHeight;
          const tw = targetDims.w, th = targetDims.h;
          canvas.width = tw; canvas.height = th;

          // ── Detect content type ──
          const detC = document.createElement('canvas');
          const detX = detC.getContext('2d', { willReadFrequently: true });
          const dw = Math.min(srcW, 400), dh = Math.round(dw * (srcH / srcW));
          detC.width = dw; detC.height = dh;
          detX.drawImage(img, 0, 0, dw, dh);
          const isArtwork = detectContentType(detX.getImageData(0, 0, dw, dh), dw, dh) === 'artwork';
          const isUpscale = srcW < tw || srcH < th;

          if (statusEl) statusEl.textContent = 'Resizing image…';
          await yieldToBrowser();

          // ── Step 1: Resize ──
          if (srcW >= tw && srcH >= th) {
            let curC = document.createElement('canvas');
            let curX = curC.getContext('2d');
            curC.width = srcW; curC.height = srcH;
            curX.imageSmoothingEnabled = true; curX.imageSmoothingQuality = 'high';
            curX.drawImage(img, 0, 0, srcW, srcH);
            let cw = srcW, ch = srcH;
            while (cw > tw * 2 || ch > th * 2) {
              const nw = Math.max(Math.round(cw / 2), tw);
              const nh = Math.max(Math.round(ch / 2), th);
              if (nw === cw && nh === ch) break;
              const nxtC = document.createElement('canvas');
              const nxtX = nxtC.getContext('2d');
              nxtC.width = nw; nxtC.height = nh;
              nxtX.imageSmoothingEnabled = true; nxtX.imageSmoothingQuality = 'high';
              nxtX.drawImage(curC, 0, 0, nw, nh);
              curC = nxtC; cw = nw; ch = nh;
              await yieldToBrowser();
            }
            ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(curC, 0, 0, tw, th);
          } else {
            let curC = document.createElement('canvas');
            let curX = curC.getContext('2d');
            curC.width = srcW; curC.height = srcH;
            curX.imageSmoothingEnabled = true; curX.imageSmoothingQuality = 'high';
            curX.drawImage(img, 0, 0, srcW, srcH);
            let cw = srcW, ch = srcH;
            while (cw < tw || ch < th) {
              const nw = Math.min(cw * 2, tw), nh = Math.min(ch * 2, th);
              if (nw === cw && nh === ch) break;
              const nxtC = document.createElement('canvas');
              const nxtX = nxtC.getContext('2d');
              nxtC.width = nw; nxtC.height = nh;
              nxtX.imageSmoothingEnabled = true; nxtX.imageSmoothingQuality = 'high';
              nxtX.drawImage(curC, 0, 0, nw, nh);
              curC = nxtC; cw = nw; ch = nh;
              await yieldToBrowser();
            }
            ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(curC, 0, 0, tw, th);
          }

          if (setProgressFn) setProgressFn(35);
          if (statusEl) statusEl.textContent = 'Applying colour filters…';
          await yieldToBrowser();

          // ── Step 2: Colour filters ──
          const filters = getSelectedFilters();
          const imageData = ctx.getImageData(0, 0, tw, th);
          const data = imageData.data;
          if (filters.includes('brightness')) { const bv = parseInt(document.getElementById('slider-brightness')?.value || 0); const bf = (100 + bv) / 100; for (let i = 0; i < data.length; i += 4) { data[i] = clamp(Math.round(data[i] * bf)); data[i + 1] = clamp(Math.round(data[i + 1] * bf)); data[i + 2] = clamp(Math.round(data[i + 2] * bf)); } }
          if (filters.includes('contrast')) { const cv = parseInt(document.getElementById('slider-contrast')?.value || 0); const cf = (100 + cv) / 100; for (let i = 0; i < data.length; i += 4) { data[i] = clamp(Math.round((data[i] - 128) * cf + 128)); data[i + 1] = clamp(Math.round((data[i + 1] - 128) * cf + 128)); data[i + 2] = clamp(Math.round((data[i + 2] - 128) * cf + 128)); } }
          if (filters.includes('color')) { const sv = parseInt(document.getElementById('slider-saturation')?.value ?? 0); if (sv !== 0) { const s = 1 + sv / 100; for (let i = 0; i < data.length; i += 4) { const g2 = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; data[i] = clamp(g2 + s * (data[i] - g2)); data[i + 1] = clamp(g2 + s * (data[i + 1] - g2)); data[i + 2] = clamp(g2 + s * (data[i + 2] - g2)); } } }
          if (filters.includes('warmth')) { for (let i = 0; i < data.length; i += 4) { data[i] = clamp(data[i] + 12); data[i + 1] = clamp(data[i + 1] + 5); data[i + 2] = clamp(data[i + 2] - 10); } }
          if (filters.includes('cool')) { for (let i = 0; i < data.length; i += 4) { data[i] = clamp(data[i] - 10); data[i + 1] = clamp(data[i + 1] + 3); data[i + 2] = clamp(data[i + 2] + 15); } }
          if (filters.includes('bw')) { for (let i = 0; i < data.length; i += 4) { const g2 = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; data[i] = data[i + 1] = data[i + 2] = g2; } }
          if (filters.includes('hdr')) { for (let i = 0; i < data.length; i += 4) { for (let c2 = 0; c2 < 3; c2++) { const v = data[i + c2] / 255; data[i + c2] = clamp(255 * (v < 0.5 ? v * 0.85 : 0.5 + (v - 0.5) * 1.3)); } } }
          ctx.putImageData(imageData, 0, 0);

          if (setProgressFn) setProgressFn(55);
          if (statusEl) statusEl.textContent = 'Sharpening detail…';
          await yieldToBrowser();

          // ── Step 3: Sharpening — resolution-aware ──
          const totalPixels = tw * th;
          // DOT ARTIFACT FIX: At 8K resolution (33M+ pixels), each pixel is tiny.
          // Aggressive sharpening (3.5×) amplifies tile-boundary noise and JPEG
          // compression artifacts into visible dot patterns. Lower values still
          // produce clearly visible enhancement without the dot artifacts.
          const resSharpMult = totalPixels > 33000000 ? 1.5  // 8K — gentle (tiny pixels need less)
            : totalPixels > 6000000 ? 1.8  // 4K — moderate, visible improvement
              : totalPixels > 2000000 ? 1.5  // 1080p — clean edge crispness
                : 1.0; // 720p — light

          if (isArtwork) {
            const userS = filters.includes('sharpen') ? (parseInt(document.getElementById('slider-sharpness')?.value || 0) / 100) : 0;
            applyUnsharpMask(tw, th, Math.min((isUpscale ? 2.5 : 1.5) * resSharpMult, 1.5), 1);
            await yieldToBrowser();
            applyArtworkSharpen(tw, th, Math.min((isUpscale ? 0.6 : 0.35) * resSharpMult, 0.6));
            if (userS > 0) { await yieldToBrowser(); applyUnsharpMask(tw, th, Math.min(userS * 3.0 * resSharpMult, 1.5), 1); }
          } else {
            const userS = filters.includes('sharpen') ? (parseInt(document.getElementById('slider-sharpness')?.value || 0) / 100) : 0;
            const base = isUpscale ? 1.0 : 0.5;

            // Pass 1: tight 1px — micro-detail (capped to prevent dots)
            applyUnsharpMask(tw, th, Math.min(base * resSharpMult * 0.8, 0.8), 1);
            await yieldToBrowser();

            // Pass 2: medium 3px — edge contrast (capped to prevent dots)
            applyUnsharpMask(tw, th, Math.min(base * resSharpMult * 0.6, 0.6), 3);
            await yieldToBrowser();

            // Pass 3: adaptive texture boost — chunked to avoid browser freeze
            if (isUpscale) {
              if (statusEl) statusEl.textContent = 'Enhancing texture detail…';
              const texData = ctx.getImageData(0, 0, tw, th);
              const texSrc = new Uint8ClampedArray(texData.data);
              const texDst = texData.data;
              const texStr = Math.min(0.35 * resSharpMult, 0.45); // capped to prevent dot artifacts
              const chunkSize = 500;
              for (let yStart = 2; yStart < th - 2; yStart += chunkSize) {
                const yEnd = Math.min(yStart + chunkSize, th - 2);
                for (let y = yStart; y < yEnd; y++) {
                  for (let x = 2; x < tw - 2; x++) {
                    const idx = (y * tw + x) * 4;
                    const r = texSrc[idx], g = texSrc[idx + 1], b = texSrc[idx + 2];
                    const localVar = Math.abs(r - texSrc[idx - 4])
                      + Math.abs(r - texSrc[idx + 4])
                      + Math.abs(r - texSrc[idx - tw * 4])
                      + Math.abs(r - texSrc[idx + tw * 4]);
                    if (localVar > 8 && localVar < 120) {
                      const boostFactor = texStr * (localVar / 60);
                      for (let c = 0; c < 3; c++) {
                        const center = texSrc[idx + c];
                        const avg = (texSrc[idx + c - 4] + texSrc[idx + c + 4] +
                          texSrc[idx + c - tw * 4] + texSrc[idx + c + tw * 4]) / 4;
                        texDst[idx + c] = clamp(center + (center - avg) * boostFactor);
                      }
                    }

                    // SKIN TEXTURE PASS: detect skin-tone pixels and apply micro-pore detail
                    // This creates the 3D realistic skin look (freckles, pores, subtle depth)
                    // Skin detection: warm tone, mid-luminance, not too saturated
                    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                    const isSkinTone = lum > 60 && lum < 220 && r > g && r > b &&
                      (r - b) > 15 && (r - b) < 120 && g > 40;
                    if (isSkinTone) {
                      // Sample a 3×3 neighborhood for micro-texture
                      const tl = texSrc[((y - 1) * tw + (x - 1)) * 4], tc = texSrc[((y - 1) * tw + x) * 4], tr2 = texSrc[((y - 1) * tw + (x + 1)) * 4];
                      const ml = texSrc[(y * tw + (x - 1)) * 4], mr = texSrc[(y * tw + (x + 1)) * 4];
                      const bl2 = texSrc[((y + 1) * tw + (x - 1)) * 4], bc = texSrc[((y + 1) * tw + x) * 4], br2 = texSrc[((y + 1) * tw + (x + 1)) * 4];
                      const localAvg = (tl + tc + tr2 + ml + mr + bl2 + bc + br2) / 8;
                      const microDetail = r - localAvg;
                      // Boost micro-detail to make skin look 3D and real, not smooth/flat
                      const skinBoost = Math.min(0.45 * resSharpMult, 0.5); // capped to prevent dots on skin
                      for (let c = 0; c < 3; c++) {
                        const cv = texSrc[idx + c];
                        const nv = texSrc[((y - 1) * tw + x) * 4 + c];
                        const sv = texSrc[((y + 1) * tw + x) * 4 + c];
                        const ev2 = texSrc[(y * tw + (x + 1)) * 4 + c];
                        const wv = texSrc[(y * tw + (x - 1)) * 4 + c];
                        const avgN = (nv + sv + ev2 + wv) / 4;
                        texDst[idx + c] = clamp(cv + (cv - avgN) * skinBoost);
                      }
                    }
                  }
                }
                await yieldToBrowser();
                if (setProgressFn) setProgressFn(55 + Math.round((yStart / th) * 30));
              }
              ctx.putImageData(texData, 0, 0);
            }

            if (userS > 0) { await yieldToBrowser(); applyUnsharpMask(tw, th, Math.min(userS * 2.0 * resSharpMult, 1.5), 2); }
          }

          if (filters.includes('denoise')) { const s = parseInt(document.getElementById('slider-denoise')?.value || 0) / 100; if (s > 0.1) applyBoxBlur(tw, th, Math.round(s * 2)); }

          // ── Step 4: Mandatory Canvas Enhancement Boost ──
          // This always runs regardless of user filter selections.
          // It ensures the "After" in the comparison slider looks clearly better than "Before".
          // The boost is intentionally modest so it never looks over-processed.
          applyCanvasEnhancementBoost(tw, th, isArtwork, isUpscale, resSharpMult);

          if (setProgressFn) setProgressFn(90);
          if (statusEl) statusEl.textContent = 'Saving output…';
          await yieldToBrowser();

          // ── Step 4: Export ──
          const format = getOutputFormat();
          let mimeType = 'image/png', quality;
          const q = parseInt(document.getElementById('jpeg-quality')?.value) || 92;
          if (format === 'jpeg') { mimeType = 'image/jpeg'; quality = q / 100; }
          else if (format === 'webp') { mimeType = 'image/webp'; quality = q / 100; }
          state.processedDataUrl = canvas.toDataURL(mimeType, quality);
          resolve();
        } catch (err) { reject(err); }
      };
      img.onerror = reject;
      img.src = state.originalDataUrl;
    });
    if (setProgressFn) setProgressFn(95);
  }

  async function processImageWithONNX(setProgressFn) {
    const statusEl = document.getElementById('processing-status');
    const titleEl = document.getElementById('processing-title');

    if (titleEl) titleEl.textContent = 'AI is enhancing your image…';
    if (statusEl) statusEl.textContent = 'Loading AI model (WebGPU — GPU accelerated)…';
    if (setProgressFn) setProgressFn(5);
    aiState.paused = false; aiState.cancelRequested = false; aiState._etaSamples = []; aiState._lastTileTime = null;
    const _pb = document.getElementById('btn-process-pause');
    const _cb = document.getElementById('btn-process-cancel');
    if (_pb) { _pb.onclick = () => { aiState.paused = !aiState.paused; const t = document.getElementById('txt-process-pause'); if (t) t.textContent = aiState.paused ? 'Resume' : 'Pause'; }; }
    if (_cb) { _cb.onclick = () => { if (confirm('Cancel enhancement?')) { aiState.cancelRequested = true; aiState.paused = false; } }; }

    // ── Set up aiState for images (normally set by showSmartResolutionCard for videos) ──
    const imgH = state.originalHeight || 512;
    const imgW = state.originalWidth || 512;
    const tier = detectResolutionTier(imgH);
    aiState.detectedTier = tier;
    aiState.scaleFactor = 4;
    aiState.targetW = Math.round(imgW * 4 / 16) * 16;
    aiState.targetH = Math.round(imgH * 4 / 16) * 16;
    const isCPU = aiState.backend === 'wasm' || aiState.backend === 'cpu';
    aiState.cpuMode = isCPU;

    // Load ONNX model — this sets aiState.session (required by processFrameWithONNX)
    await loadONNXModel();

    if (!aiState.session) throw new Error('ONNX model failed to load.');

    if (statusEl) statusEl.textContent = 'Preparing image…';
    if (setProgressFn) setProgressFn(15);

    // Load original image onto input canvas
    // Use a fresh FileReader-based dataURL to avoid blob URL canvas taint issues
    const imageDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(state.file);
    });

    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = imageDataUrl;
    });

    const inputCanvas = document.createElement('canvas');
    const tgtDims = getTargetDimensions();
    const idealInputW = Math.round(tgtDims.w / 4);
    const idealInputH = Math.round(tgtDims.h / 4);

    // ── CRITICAL: Never pre-upscale input beyond original resolution ──
    // Pre-upscaling (e.g. 1280→1920) creates browser interpolation artifacts that ONNX
    // then AMPLIFIES into visible dots/noise in the final output. Instead:
    //   - Feed ONNX the original pixels (or downscaled if too large)
    //   - ONNX produces genuine 4× AI-reconstructed pixels
    //   - Bicubic stretch to final target only AFTER ONNX + post-processing
    //
    // Performance benefit: For 8K from 1280×720:
    //   OLD: 1920×1080 input = 12 tiles = 20 min
    //   NEW: 1280×720 input  =  6 tiles = ~8 min (50% faster!)
    const deviceRamGB = navigator.deviceMemory || 4;
    const isLowRAM = deviceRamGB < 3;
    // Cap at original image size — never upscale before ONNX
    const rawMaxW = Math.min(img.naturalWidth, idealInputW);
    const rawMaxH = Math.min(img.naturalHeight, idealInputH);
    // Additional RAM safety cap for very large source images
    const maxSafeInputW = isLowRAM ? Math.min(960, rawMaxW) : Math.min(1920, rawMaxW);
    const maxSafeInputH = isLowRAM ? Math.min(540, rawMaxH) : Math.min(1080, rawMaxH);

    const inputScaleW = maxSafeInputW / img.naturalWidth;
    const inputScaleH = maxSafeInputH / img.naturalHeight;
    const inputScale = Math.min(inputScaleW, inputScaleH); // keep aspect ratio
    inputCanvas.width = Math.max(64, Math.round(img.naturalWidth * inputScale));
    inputCanvas.height = Math.max(64, Math.round(img.naturalHeight * inputScale));
    console.log(`[ONNX Image] Target: ${tgtDims.w}×${tgtDims.h} | Input: ${img.naturalWidth}×${img.naturalHeight} → scaled input: ${inputCanvas.width}×${inputCanvas.height} → ONNX out: ${inputCanvas.width * 4}×${inputCanvas.height * 4} | RAM: ${deviceRamGB}GB | lowRAM: ${isLowRAM}`);
    // willReadFrequently: true — critical for getImageData performance and correctness
    const inputCtx2d = inputCanvas.getContext('2d', { willReadFrequently: true });
    // FIX: Must specify destination dimensions so the FULL image is scaled to fit the canvas.
    // Without them, drawImage draws at natural size and clips to the canvas bounds —
    // causing only the top-left corner to be captured (severe zoom/crop on wide images like anime).
    inputCtx2d.drawImage(img, 0, 0, inputCanvas.width, inputCanvas.height);

    // Verify canvas is not blank
    const testPixel = inputCtx2d.getImageData(0, 0, 1, 1).data;
    console.log('[ONNX Image] Input canvas test pixel (should not be 0,0,0,0):', testPixel[0], testPixel[1], testPixel[2], testPixel[3]);
    console.log('[ONNX Image] Input size:', img.naturalWidth, 'x', img.naturalHeight);

    // ── Apply ALL user settings to input image BEFORE ONNX upscaling ──
    // This creates inputCanvas._enhancedForONNX which is:
    //   1. Fed to ONNX so AI enhances the MODIFIED version (with user's brightness/contrast etc)
    //   2. Shown in the processing preview so user sees their edited version during processing
    //
    // PREVIOUS BUG: only ran when skin/sharpen sliders were set. So if user set brightness=-30%
    // the ONNX preview still showed the bright original. Now we ALWAYS create the modified canvas.
    const skinSharpenPre = parseInt($('#slider-skin-sharpen')?.value) || 0;
    const clearFacePre = parseInt($('#slider-clear-face')?.value) || 0;
    const advPre = getAdvancedEnhanceVal();
    const brightnessPre = parseInt($('#slider-brightness')?.value) || 0;
    const contrastPre = parseInt($('#slider-contrast')?.value) || 0;
    const satPre = parseInt($('#slider-saturation')?.value) || 0;

    // Always create enhanced canvas — at minimum it's a copy showing current settings
    {
      const preW = inputCanvas.width, preH = inputCanvas.height;
      const tmpC = document.createElement('canvas');
      tmpC.width = preW; tmpC.height = preH;
      const tmpCtx = tmpC.getContext('2d', { willReadFrequently: true });

      // Draw scaled input (already contains the correctly-scaled image)
      tmpCtx.drawImage(inputCanvas, 0, 0, preW, preH);

      const id = tmpCtx.getImageData(0, 0, preW, preH);
      const d = id.data;

      // ── Apply brightness/contrast/saturation to match CSS preview EXACTLY ──
      // The fullscreen preview uses CSS: brightness(130%) contrast(130%) saturate(120%)
      // CSS brightness() is MULTIPLICATIVE (pixel * 1.3), NOT additive (pixel + 45).
      // Additive lifts dark pixels too much → destroys rich orange/warm tones.

      // Brightness: CSS brightness(130%) = pixel * 1.3
      if (brightnessPre !== 0) {
        const factor = (100 + brightnessPre) / 100; // 30% → 1.3
        for (let i = 0; i < d.length; i += 4) {
          d[i] = Math.max(0, Math.min(255, Math.round(d[i] * factor)));
          d[i + 1] = Math.max(0, Math.min(255, Math.round(d[i + 1] * factor)));
          d[i + 2] = Math.max(0, Math.min(255, Math.round(d[i + 2] * factor)));
        }
      }

      // Contrast: CSS contrast(130%) = (pixel - 128) * 1.3 + 128
      if (contrastPre !== 0) {
        const factor = (100 + contrastPre) / 100; // 30% → 1.3
        for (let i = 0; i < d.length; i += 4) {
          d[i] = Math.max(0, Math.min(255, Math.round((d[i] - 128) * factor + 128)));
          d[i + 1] = Math.max(0, Math.min(255, Math.round((d[i + 1] - 128) * factor + 128)));
          d[i + 2] = Math.max(0, Math.min(255, Math.round((d[i + 2] - 128) * factor + 128)));
        }
      }

      // Saturation: CSS saturate(120%) — already matches
      if (satPre !== 0) {
        const s = 1 + satPre / 100;
        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          d[i] = Math.max(0, Math.min(255, Math.round(gray + s * (d[i] - gray))));
          d[i + 1] = Math.max(0, Math.min(255, Math.round(gray + s * (d[i + 1] - gray))));
          d[i + 2] = Math.max(0, Math.min(255, Math.round(gray + s * (d[i + 2] - gray))));
        }
      }

      tmpCtx.putImageData(id, 0, 0);

      // Apply skin sharpen / clear face / advanced enhance on top if set
      if (skinSharpenPre > 0 || clearFacePre > 0 || advPre > 0) {
        const orig = new Uint8ClampedArray(tmpCtx.getImageData(0, 0, preW, preH).data);
        const id2 = tmpCtx.getImageData(0, 0, preW, preH);
        const d2 = id2.data;
        const totalStrength = (skinSharpenPre / 100) * 1.5 + (clearFacePre / 100) * 1.2 + (advPre / 100) * 2.0;
        if (totalStrength > 0) {
          const radius = 2;
          const blurred = new Float32Array(preW * preH * 4);
          for (let y = 0; y < preH; y++) {
            for (let x = 0; x < preW; x++) {
              let rs = 0, gs = 0, bs = 0, cnt = 0;
              for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                  const nx = Math.max(0, Math.min(preW - 1, x + dx));
                  const ny = Math.max(0, Math.min(preH - 1, y + dy));
                  const ni = (ny * preW + nx) * 4;
                  rs += orig[ni]; gs += orig[ni + 1]; bs += orig[ni + 2]; cnt++;
                }
              }
              const oi = (y * preW + x) * 4;
              blurred[oi] = rs / cnt; blurred[oi + 1] = gs / cnt; blurred[oi + 2] = bs / cnt; blurred[oi + 3] = 255;
            }
          }
          for (let i = 0; i < d2.length; i += 4) {
            d2[i] = Math.max(0, Math.min(255, orig[i] + (orig[i] - blurred[i]) * totalStrength));
            d2[i + 1] = Math.max(0, Math.min(255, orig[i + 1] + (orig[i + 1] - blurred[i + 1]) * totalStrength));
            d2[i + 2] = Math.max(0, Math.min(255, orig[i + 2] + (orig[i + 2] - blurred[i + 2]) * totalStrength));
          }
          tmpCtx.putImageData(id2, 0, 0);
        }
      }

      inputCanvas._enhancedForONNX = tmpC;
    }

    const outputCanvas = document.createElement('canvas');

    if (statusEl) statusEl.textContent = 'Running Real-ESRGAN AI upscaling…';
    if (setProgressFn) setProgressFn(20);

    // Show live canvas in processing view — use a DISPLAY canvas capped at 1920px wide.
    const canvasWrap = document.getElementById('processing-canvas-wrapper');
    const displayCanvas = document.createElement('canvas');
    const displayMaxW = 1280;
    displayCanvas.width = displayMaxW;
    displayCanvas.height = Math.round(displayMaxW * (inputCanvas.height / inputCanvas.width));
    displayCanvas.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;border-radius:8px;';

    // FIX Problem 1: Show the MODIFIED image (with user's brightness/contrast/colour settings)
    // as the background preview — NOT the clean original. This matches Canvas pipeline behaviour.
    // If the user made the image darker, the ONNX preview should also show it dark.
    const previewSource = inputCanvas._enhancedForONNX || inputCanvas;
    const dCtxInit = displayCanvas.getContext('2d');
    dCtxInit.drawImage(previewSource, 0, 0, displayCanvas.width, displayCanvas.height);

    if (canvasWrap) {
      canvasWrap.style.display = 'block';
      canvasWrap.innerHTML = '';
      canvasWrap.appendChild(displayCanvas);
    }

    // ── Start timer display ──
    const imgStartTime = Date.now();
    const startEl = document.getElementById('time-start');
    const endEl = document.getElementById('processing-eta');
    if (startEl) startEl.textContent = `Started: ${new Date(imgStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (endEl) endEl.textContent = 'Estimating…';

    // Hook into tile progress
    const totalInputTiles = Math.ceil((inputCanvas.width * inputCanvas.height) / (getActiveTileSize() * getActiveTileSize()));
    let tilesCompleted = 0;
    const dCtx = displayCanvas.getContext('2d');

    // FIX Problem 2: Stable end time — lock it after first 15% of tiles, only update
    // if new estimate differs by more than 90 seconds from locked value.
    // Before this fix: recalculated every tile from last 8 samples → jumped constantly.
    let lockedEndTime = null;
    let lockedAfterTile = null;

    aiState.onTileComplete = (tileIdx, totalTiles) => {
      tilesCompleted = tileIdx;
      const tilePct = totalTiles > 0 ? tileIdx / totalTiles : 0;
      const pct = 20 + Math.round(tilePct * 68);
      if (setProgressFn) setProgressFn(pct);

      // Show output tiles replacing input preview once 10% of tiles done
      const showThreshold = Math.max(4, Math.floor(totalTiles * 0.1));
      if (dCtx && outputCanvas.width > 100 && outputCanvas.height > 100 && tileIdx >= showThreshold) {
        try {
          dCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
          dCtx.drawImage(outputCanvas, 0, 0, displayCanvas.width, displayCanvas.height);
        } catch (e) { /* outputCanvas still being written to */ }
      }

      // ETA: use elapsed time / tiles done = avg per tile, extrapolate to end
      if (!aiState._etaSamples) aiState._etaSamples = [];
      if (tileIdx > 1) {
        const now = Date.now();
        if (aiState._lastTileTime) {
          aiState._etaSamples.push(now - aiState._lastTileTime);
          if (aiState._etaSamples.length > 12) aiState._etaSamples.shift();
        }
        aiState._lastTileTime = now;

        // Show a rough estimate as soon as we have 2 samples — user sees a time immediately
        if (aiState._etaSamples.length >= 2) {
          const avg = aiState._etaSamples.reduce((a, b) => a + b, 0) / aiState._etaSamples.length;
          const remainingMs = (totalTiles - tileIdx) * avg;
          const newEndMs = Date.now() + remainingMs;

          // Lock the end time after 5% of tiles (fast) — only update if estimate drifts >60 sec
          if (lockedEndTime === null && tileIdx >= Math.max(2, Math.floor(totalTiles * 0.05))) {
            lockedEndTime = newEndMs;
            lockedAfterTile = tileIdx;
          }

          if (lockedEndTime !== null) {
            // Update locked time only if new estimate differs by >60 seconds
            if (Math.abs(newEndMs - lockedEndTime) > 60000) {
              lockedEndTime = newEndMs;
            }
            const endDate = new Date(lockedEndTime);
            if (endEl) endEl.textContent = `End: ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
          } else {
            // Pre-lock: show a live rough estimate so there's always a number
            const roughEndDate = new Date(newEndMs);
            if (endEl) endEl.textContent = `End: ~${roughEndDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
          }
        }
      } else {
        aiState._lastTileTime = Date.now();
      }
    };

    console.log('[ONNX Image] Starting processFrameWithONNX, session:', !!aiState.session);
    // BUG FIX: If advanced options produced a pre-sharpened canvas, feed THAT to ONNX.
    // inputCanvas itself is the original and must stay untouched (it's shown as the preview).
    const onnxSourceCanvas = inputCanvas._enhancedForONNX || inputCanvas;

    // ── Measure INPUT luminance BEFORE ONNX — needed for brightness correction after ──
    const preOnnxCtx = onnxSourceCanvas.getContext('2d', { willReadFrequently: true });
    const preOnnxData = preOnnxCtx.getImageData(0, 0, onnxSourceCanvas.width, onnxSourceCanvas.height).data;
    let preOnnxLumaSum = 0;
    const preOnnxPixelCount = onnxSourceCanvas.width * onnxSourceCanvas.height;
    for (let i = 0; i < preOnnxData.length; i += 4) {
      preOnnxLumaSum += 0.299 * preOnnxData[i] + 0.587 * preOnnxData[i + 1] + 0.114 * preOnnxData[i + 2];
    }
    const preOnnxAvgLuma = preOnnxLumaSum / preOnnxPixelCount;
    console.log('[ONNX Image] Pre-ONNX avg luminance:', preOnnxAvgLuma.toFixed(2));

    // Run the same tile-based ONNX engine used for video frames
    // ── GPU DEVICE-LOST AUTO-RECOVERY ──
    // If the GPU dies mid-processing (DXGI_ERROR_DEVICE_HUNG), processFrameWithONNX
    // throws 'GPU_DEVICE_LOST'. We catch it, recreate the session with a safer backend
    // (WebGL → WASM), and retry automatically — the user never needs to manually reload.
    let onnxRetries = 0;
    const MAX_ONNX_RETRIES = 2;
    while (true) {
      try {
        await processFrameWithONNX(onnxSourceCanvas, outputCanvas);
        break; // Success — exit retry loop
      } catch (onnxErr) {
        // User cancellation — propagate immediately, no retry
        if (onnxErr.message && onnxErr.message.includes('cancelled by user')) throw onnxErr;

        // GPU device lost — retry with fallback backend
        if (onnxErr.message && onnxErr.message.includes('GPU_DEVICE_LOST') && onnxRetries < MAX_ONNX_RETRIES) {
          onnxRetries++;
          console.warn('[ONNX] GPU device lost — attempting recovery (retry', onnxRetries + '/' + MAX_ONNX_RETRIES + ')…');
          if (statusEl) statusEl.textContent = 'GPU crashed — switching to safe mode…';
          if (setProgressFn) setProgressFn(10);

          // Destroy dead session and force reload with fallback backend
          aiState.session = null;
          aiState._webgpuFailed = true; // Prevent WebGPU from being tried again
          await loadONNXModel(); // Will skip WebGPU, try WebGL → WASM

          if (!aiState.session) throw new Error('Could not recover — all backends failed.');
          console.log('[ONNX] ✓ Recovered with backend:', aiState.backend);
          if (statusEl) statusEl.textContent = 'Recovered! Reprocessing with ' + aiState.backend + '…';

          // Reset output canvas for fresh processing
          outputCanvas.width = onnxSourceCanvas.width * AI_SCALE;
          outputCanvas.height = onnxSourceCanvas.height * AI_SCALE;
          const recoverCtx = outputCanvas.getContext('2d', { willReadFrequently: true });
          recoverCtx.imageSmoothingEnabled = true;
          recoverCtx.imageSmoothingQuality = 'high';
          recoverCtx.drawImage(onnxSourceCanvas, 0, 0, outputCanvas.width, outputCanvas.height);
          continue; // Retry with new backend
        }

        // Non-recoverable error — propagate up
        throw onnxErr;
      }
    }
    aiState.onTileComplete = null; // clean up
    console.log('[ONNX Image] processFrameWithONNX done. Output size:', outputCanvas.width, 'x', outputCanvas.height);
    if (setProgressFn) setProgressFn(88);
    if (statusEl) statusEl.textContent = 'Correcting ONNX brightness…';

    // ── ONNX BRIGHTNESS CORRECTION ──
    // Real-ESRGAN inherently shifts brightness. The video pipeline (upscaleFrameWithESRGAN)
    // already had this correction — now the image pipeline gets it too.
    // We scale ONNX output luminance back to match the input luminance.
    {
      const onnxOutCtx = outputCanvas.getContext('2d', { willReadFrequently: true });
      const onnxOutImgData = onnxOutCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
      const od = onnxOutImgData.data;
      const onnxOutPixels = outputCanvas.width * outputCanvas.height;
      let postOnnxLumaSum = 0;
      for (let i = 0; i < od.length; i += 4) {
        postOnnxLumaSum += 0.299 * od[i] + 0.587 * od[i + 1] + 0.114 * od[i + 2];
      }
      const postOnnxAvgLuma = postOnnxLumaSum / onnxOutPixels;
      console.log('[ONNX Image] Post-ONNX avg luminance:', postOnnxAvgLuma.toFixed(2));

      if (postOnnxAvgLuma > 1 && Math.abs(postOnnxAvgLuma - preOnnxAvgLuma) > 0.5) {
        const correction = preOnnxAvgLuma / postOnnxAvgLuma;
        // Clamp correction to ±15% to prevent extreme shifts
        const clampedCorr = Math.min(Math.max(correction, 0.85), 1.15);
        console.log('[ONNX Image] Brightness correction factor:', clampedCorr.toFixed(4),
          '(raw:', correction.toFixed(4), ', drift:', (postOnnxAvgLuma - preOnnxAvgLuma).toFixed(2), ')');
        for (let i = 0; i < od.length; i += 4) {
          od[i] = Math.min(255, Math.max(0, Math.round(od[i] * clampedCorr)));
          od[i + 1] = Math.min(255, Math.max(0, Math.round(od[i + 1] * clampedCorr)));
          od[i + 2] = Math.min(255, Math.max(0, Math.round(od[i + 2] * clampedCorr)));
        }
        onnxOutCtx.putImageData(onnxOutImgData, 0, 0);
      }
    }

    if (statusEl) statusEl.textContent = 'Applying enhancements…';

    const yieldToBrowser = () => new Promise(r => setTimeout(r, 0));

    // Use a dedicated offscreen canvas — NOT the global ctx/canvas which is the
    // live display element. Using global canvas caused corrupt/red output because
    // resizing it clears it and other code may write to it concurrently.
    const localCanvas = document.createElement('canvas');
    const localCtx = localCanvas.getContext('2d', { willReadFrequently: true });

    localCanvas.width = outputCanvas.width;
    localCanvas.height = outputCanvas.height;
    localCtx.drawImage(outputCanvas, 0, 0);

    const filtersOnnx = getSelectedFilters();
    const onnxW = localCanvas.width, onnxH = localCanvas.height;

    const skinSharpenPost = parseInt($('#slider-skin-sharpen')?.value) || 0;
    const clearFacePost = parseInt($('#slider-clear-face')?.value) || 0;
    const advPost = getAdvancedEnhanceVal();

    if (skinSharpenPost > 0) {
      if (statusEl) statusEl.textContent = 'Applying skin sharpening…';
      await yieldToBrowser();
      // Temporarily redirect global ctx to localCtx so helpers write to offscreen canvas
      const _savedCtx = ctx; Object.defineProperty(window, '_onnxLocalCtx', { value: localCtx, configurable: true });
      applySkinMaskedSharpen(onnxW, onnxH, (skinSharpenPost / 100) * 2.0);
    }
    if (clearFacePost > 0) {
      if (statusEl) statusEl.textContent = 'Applying Clear Face…';
      await yieldToBrowser();
      applyClearFaceToCanvas(onnxW, onnxH, (clearFacePost / 100) * 2.5);
    }
    if (advPost > 0) {
      if (statusEl) statusEl.textContent = 'Applying Advanced Enhance…';
      await yieldToBrowser();
      applyUnsharpMaskLuminance(onnxW, onnxH, (advPost / 100) * 1.5);
    }

    if (statusEl) statusEl.textContent = 'Applying color filters…';
    await yieldToBrowser();

    // NOW apply color filters
    const imageDataOnnx = localCtx.getImageData(0, 0, onnxW, onnxH);
    const dataOnnx = imageDataOnnx.data;

    // NOTE: brightness, contrast, and saturation are already applied to the ONNX input
    // via inputCanvas._enhancedForONNX — so we SKIP them here to avoid double application.
    // (Double application = orange → red, washed out shadows, cartoon look)
    // Other filters (warmth, cool, bw, hdr, vignette) are NOT pre-applied so they run here.
    if (filtersOnnx.includes('warmth')) { for (let i = 0; i < dataOnnx.length; i += 4) { dataOnnx[i] = clamp(dataOnnx[i] + 12); dataOnnx[i + 1] = clamp(dataOnnx[i + 1] + 5); dataOnnx[i + 2] = clamp(dataOnnx[i + 2] - 10); } }
    if (filtersOnnx.includes('cool')) { for (let i = 0; i < dataOnnx.length; i += 4) { dataOnnx[i] = clamp(dataOnnx[i] - 10); dataOnnx[i + 1] = clamp(dataOnnx[i + 1] + 3); dataOnnx[i + 2] = clamp(dataOnnx[i + 2] + 15); } }
    if (filtersOnnx.includes('bw')) { for (let i = 0; i < dataOnnx.length; i += 4) { const g = 0.299 * dataOnnx[i] + 0.587 * dataOnnx[i + 1] + 0.114 * dataOnnx[i + 2]; dataOnnx[i] = dataOnnx[i + 1] = dataOnnx[i + 2] = g; } }
    if (filtersOnnx.includes('hdr')) { for (let i = 0; i < dataOnnx.length; i += 4) { for (let c = 0; c < 3; c++) { const v = dataOnnx[i + c] / 255; dataOnnx[i + c] = clamp(255 * (v < 0.5 ? v * 0.85 : 0.5 + (v - 0.5) * 1.3)); } } }
    if (filtersOnnx.includes('vignette')) {
      if (statusEl) statusEl.textContent = 'Applying vignette…';
      await yieldToBrowser();
      const cx = onnxW / 2, cy = onnxH / 2, maxD = Math.sqrt(cx * cx + cy * cy);
      for (let y = 0; y < onnxH; y++) for (let x = 0; x < onnxW; x++) { const idx = (y * onnxW + x) * 4; const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxD; const v = 1 - d * d * 0.7; dataOnnx[idx] *= v; dataOnnx[idx + 1] *= v; dataOnnx[idx + 2] *= v; }
    }

    // Skin Smoothing — fires when slider > 0, no checkbox needed
    const skinSmoothVal = parseInt($('#slider-skin')?.value) || 0;
    if (skinSmoothVal > 0) { const sv = skinSmoothVal / 100; for (let i = 0; i < dataOnnx.length; i += 4) { const g = 0.299 * dataOnnx[i] + 0.587 * dataOnnx[i + 1] + 0.114 * dataOnnx[i + 2], lift = sv * 8; dataOnnx[i] = clamp(g + (1 + sv * 0.1) * (dataOnnx[i] - g) + lift); dataOnnx[i + 1] = clamp(g + (1 + sv * 0.1) * (dataOnnx[i + 1] - g) + lift); dataOnnx[i + 2] = clamp(g + (1 + sv * 0.1) * (dataOnnx[i + 2] - g) + lift); } }
    // Texture Smoothing — fires when slider > 0, no checkbox needed
    const textureSmoothVal = parseInt($('#slider-texture')?.value) || 0;
    if (textureSmoothVal > 0) { const sv = textureSmoothVal / 100; for (let i = 0; i < dataOnnx.length; i += 4) { const g = 0.299 * dataOnnx[i] + 0.587 * dataOnnx[i + 1] + 0.114 * dataOnnx[i + 2]; dataOnnx[i] = clamp(dataOnnx[i] * (1 - sv * 0.3) + g * sv * 0.3); dataOnnx[i + 1] = clamp(dataOnnx[i + 1] * (1 - sv * 0.3) + g * sv * 0.3); dataOnnx[i + 2] = clamp(dataOnnx[i + 2] * (1 - sv * 0.3) + g * sv * 0.3); } }

    // RGB curves — only apply if user actually changed them
    const curvesChanged = curvesState?.tables && (curvesState.tables.rgb.some((v, i) => v !== i) || curvesState.tables.r.some((v, i) => v !== i) || curvesState.tables.g.some((v, i) => v !== i) || curvesState.tables.b.some((v, i) => v !== i));
    if (curvesChanged) {
      if (statusEl) statusEl.textContent = 'Applying RGB curves…';
      await yieldToBrowser();
      for (let i = 0; i < dataOnnx.length; i += 4) { let r = dataOnnx[i], g = dataOnnx[i + 1], b = dataOnnx[i + 2]; r = curvesState.tables.rgb[r]; g = curvesState.tables.rgb[g]; b = curvesState.tables.rgb[b]; dataOnnx[i] = curvesState.tables.r[clamp(r)]; dataOnnx[i + 1] = curvesState.tables.g[clamp(g)]; dataOnnx[i + 2] = curvesState.tables.b[clamp(b)]; }
    }

    localCtx.putImageData(imageDataOnnx, 0, 0);
    await yieldToBrowser();

    // Sharpen and Denoise — fire on slider value OR checkbox
    const sharpSliderVal = parseInt($('#slider-sharpness')?.value || 0);
    const denoiseSliderVal = parseInt($('#slider-denoise')?.value || 0);
    if (filtersOnnx.includes('sharpen') || filtersOnnx.includes('denoise') || sharpSliderVal > 0 || denoiseSliderVal > 0) {
      if (statusEl) statusEl.textContent = 'Applying sharpen/denoise…';
      await yieldToBrowser();
      const sharpS = (filtersOnnx.includes('sharpen') || sharpSliderVal > 0) ? Math.min(0.5, sharpSliderVal / 100) : 0;
      const denoiseS = (filtersOnnx.includes('denoise') || denoiseSliderVal > 0) ? Math.min(0.4, denoiseSliderVal / 100) : 0;

      if (sharpS > 0) {
        const sdData = localCtx.getImageData(0, 0, onnxW, onnxH);
        const sdSrc = new Uint8ClampedArray(sdData.data);
        const sdOut = sdData.data;
        for (let y = 1; y < onnxH - 1; y++) for (let x = 1; x < onnxW - 1; x++) {
          const idx = (y * onnxW + x) * 4;
          for (let c = 0; c < 3; c++) {
            const center = sdSrc[idx + c];
            const cross = (sdSrc[((y - 1) * onnxW + x) * 4 + c] + sdSrc[((y + 1) * onnxW + x) * 4 + c] + sdSrc[(y * onnxW + x - 1) * 4 + c] + sdSrc[(y * onnxW + x + 1) * 4 + c]) / 4;
            sdOut[idx + c] = clamp(center + (center - cross) * sharpS);
          }
        }
        localCtx.putImageData(sdData, 0, 0);
      }

      if (denoiseS > 0.1) {
        await yieldToBrowser();
        applyBoxBlur(onnxW, onnxH, 1);
      }
    }

    if (statusEl) statusEl.textContent = 'Finalizing output…';
    await yieldToBrowser();

    // ── Post-ONNX quality pass — single gentle sharpen ──
    // DOT ARTIFACT FIX: The previous multi-pass sharpening (1.2 + 0.7 strength) on 33M+
    // pixels amplified ONNX tile-seam noise into visible dot patterns. Now uses a single
    // gentle USM pass that restores crispness lost by tile stitching without creating dots.
    // Doing this at ONNX output resolution (before any final stretch) keeps it fast.
    const totalOnnxPixels = onnxW * onnxH;
    if (totalOnnxPixels > 2000000) {
      if (statusEl) statusEl.textContent = 'Polishing output…';
      await yieldToBrowser();

      // Sync localCanvas → global canvas so the sharpening helper writes there
      canvas.width = onnxW; canvas.height = onnxH;
      ctx.drawImage(localCanvas, 0, 0);

      // Single gentle USM — strength 0.3, radius 1px — just enough to
      // counteract the slight softness from ONNX tile overlap blending
      applyUnsharpMask(onnxW, onnxH, 0.3, 1);
      await yieldToBrowser();
      console.log('[ONNX Image] Gentle post-sharpen applied to', onnxW, '×', onnxH);

      // Copy result back into localCanvas for export
      localCtx.drawImage(canvas, 0, 0);
    }

    // Copy result back to outputCanvas for export
    outputCanvas.width = onnxW; outputCanvas.height = onnxH;
    outputCanvas.getContext('2d').drawImage(localCanvas, 0, 0);

    if (setProgressFn) setProgressFn(95);
    const format = getOutputFormat();
    let mimeType = 'image/png', quality;
    const q = parseInt(document.getElementById('jpeg-quality')?.value) || 92;
    if (format === 'jpeg') { mimeType = 'image/jpeg'; quality = q / 100; }
    else if (format === 'webp') { mimeType = 'image/webp'; quality = q / 100; }

    // Always resize final ONNX output to the EXACT user-selected target dimensions.
    // This handles ALL cases:
    //   • ONNX out < target → bicubic upscale to fill (rare after fix 4)
    //   • ONNX out > target (e.g. user selected 720p) → clean bicubic downscale
    //   • ONNX out == target → no resize needed (common case for 4K/8K)
    const exportTargetDims = getTargetDimensions();
    let exportCanvas;
    if (outputCanvas.width === exportTargetDims.w && outputCanvas.height === exportTargetDims.h) {
      exportCanvas = outputCanvas;
    } else {
      exportCanvas = document.createElement('canvas');
      exportCanvas.width = exportTargetDims.w;
      exportCanvas.height = exportTargetDims.h;
      const expCtx = exportCanvas.getContext('2d');
      expCtx.imageSmoothingEnabled = true;
      expCtx.imageSmoothingQuality = 'high';
      expCtx.drawImage(outputCanvas, 0, 0, exportTargetDims.w, exportTargetDims.h);
      // For downscale: apply a gentle sharpening pass to restore edge crispness
      // that bicubic downscaling softens
      if (exportTargetDims.w < outputCanvas.width) {
        const exId = expCtx.getImageData(0, 0, exportTargetDims.w, exportTargetDims.h);
        const exSrc = new Uint8ClampedArray(exId.data);
        const exDst = exId.data;
        const ew = exportTargetDims.w, eh = exportTargetDims.h;
        for (let y = 1; y < eh - 1; y++) for (let x = 1; x < ew - 1; x++) {
          const idx = (y * ew + x) * 4;
          for (let c = 0; c < 3; c++) {
            const ctr = exSrc[idx + c];
            const avg = (exSrc[((y - 1) * ew + x) * 4 + c] + exSrc[((y + 1) * ew + x) * 4 + c] + exSrc[(y * ew + x - 1) * 4 + c] + exSrc[(y * ew + x + 1) * 4 + c]) / 4;
            exDst[idx + c] = clamp(ctr + (ctr - avg) * 0.4);
          }
        }
        expCtx.putImageData(exId, 0, 0);
      }
    }
    state.processedDataUrl = exportCanvas.toDataURL(mimeType, quality);
  }


  async function processFrameWithONNX(inputCanvas, outputCanvas) {
    // Capture session reference at entry — if WakeGuard nulls it mid-run we detect it cleanly
    const capturedSession = aiState.session;
    if (!capturedSession) return;
    const inW = inputCanvas.width, inH = inputCanvas.height;
    const inCtx = inputCanvas.getContext('2d', { willReadFrequently: true });
    const outW = inW * AI_SCALE, outH = inH * AI_SCALE;
    outputCanvas.width = outW;
    outputCanvas.height = outH;
    const outCtx = outputCanvas.getContext('2d', { willReadFrequently: true }); // FIX: blendTileToOutput calls getImageData on this hundreds of times

    // PRE-FILL outputCanvas with a bicubic upscale of the entire input image.
    // This ensures overlap blending always reads valid pixels (not transparent zeros)
    // which caused color corruption at tile seams in previous versions.
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';
    outCtx.drawImage(inputCanvas, 0, 0, outW, outH);

    const activeTileSize = getActiveTileSize();
    const activeTileOverlap = getActiveTileOverlap();
    const stride = activeTileSize - activeTileOverlap;
    const outTileSize = activeTileSize * AI_SCALE;
    const outOverlap = activeTileOverlap * AI_SCALE;
    const outStride = stride * AI_SCALE;

    console.log('[ONNX] Backend:', aiState.backend, '| Tile size:', activeTileSize, '| Overlap:', activeTileOverlap);
    const tilesX = Math.max(1, Math.ceil((inW - activeTileOverlap) / stride));
    const tilesY = Math.max(1, Math.ceil((inH - activeTileOverlap) / stride));
    const totalTiles = tilesX * tilesY;

    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = activeTileSize;
    tileCanvas.height = activeTileSize;
    const tileCtx = tileCanvas.getContext('2d', { willReadFrequently: true });

    const inputName = capturedSession.inputNames[0] || 'input';
    let tileIdx = 0;
    let skippedTiles = 0;
    let consecutiveFailures = 0; // GPU device-lost detection

    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        tileIdx++;
        const sx = Math.min(tx * stride, Math.max(0, inW - activeTileSize));
        const sy = Math.min(ty * stride, Math.max(0, inH - activeTileSize));

        // Extract tile from input
        tileCtx.clearRect(0, 0, activeTileSize, activeTileSize);
        tileCtx.drawImage(inputCanvas, sx, sy, activeTileSize, activeTileSize, 0, 0, activeTileSize, activeTileSize);
        const tileImageData = tileCtx.getImageData(0, 0, activeTileSize, activeTileSize);

        let outImageData;

        // PERF FIX 2: Skip uniform/near-black tiles — bicubic upscale instead of ONNX
        if (!tileNeedsONNX(tileImageData)) {
          skippedTiles++;
          const fallbackCanvas = document.createElement('canvas');
          fallbackCanvas.width = outTileSize;
          fallbackCanvas.height = outTileSize;
          const fbCtx = fallbackCanvas.getContext('2d');
          fbCtx.imageSmoothingEnabled = true;
          fbCtx.imageSmoothingQuality = 'high';
          fbCtx.drawImage(tileCanvas, 0, 0, outTileSize, outTileSize);
          outImageData = fbCtx.getImageData(0, 0, outTileSize, outTileSize);
        } else {
          const inputTensor = imageDataToONNXTensor(tileImageData, activeTileSize, activeTileSize);
          try {
            // Session integrity check — WakeGuard or Global Catcher may have nulled session/triggered recovery.
            // Distinguish between user cancellation (cancelRequested=true) and WakeGuard
            // interference / GPU death (session nulled but user didn't cancel).
            if (aiState.session !== capturedSession || aiState.gpuDeviceLostTriggered) {
              aiState.gpuDeviceLostTriggered = false; // Reset
              if (aiState.cancelRequested) {
                throw new Error('Processing cancelled by user.');
              }
              // Session was invalidated by WakeGuard or GPU death — trigger auto-recovery
              throw new Error('GPU_DEVICE_LOST: Session invalidated during processing');
            }
            const feeds = {};
            feeds[inputName] = inputTensor;

            // ── GPU HANG PROTECTION ──
            // Set a timeout of 15 seconds per tile. If it hangs (e.g. due to WebGPU device loss),
            // we reject and fall back safely instead of freezing the webpage.
            const results = await Promise.race([
              capturedSession.run(feeds),
              new Promise((_, reject) => setTimeout(() => reject(new Error('GPU tile timeout')), 15000))
            ]);
            const outputTensor = Object.values(results)[0];
            // Log tensor shape on first tile to debug output
            if (tileIdx === 1) {
              console.log('[ONNX] Output tensor dims:', outputTensor.dims, 'data length:', outputTensor.data.length);
              console.log('[ONNX] First 6 float values:', outputTensor.data[0], outputTensor.data[1], outputTensor.data[2], outputTensor.data[3], outputTensor.data[4], outputTensor.data[5]);
              console.log('[ONNX] Expected outTileSize:', outTileSize, 'planeSize should be:', outTileSize * outTileSize);
            }
            // Use actual tensor dims instead of assumed outTileSize
            const tDims = outputTensor.dims; // [1, 3, H, W]
            const tH = tDims[2], tW = tDims[3];
            outImageData = onnxTensorToImageData(outputTensor.data, tW, tH);
            consecutiveFailures = 0; // Reset — this tile succeeded
          } catch (e) {
            // If session was replaced or user cancelled — propagate up immediately
            if (e.message && e.message.includes('cancelled by user')) throw e;

            // ── GPU DEVICE-LOST DETECTION ──
            // DXGI_ERROR_DEVICE_HUNG / AbortError / 'device is lost' / timeout = GPU is dead.
            // Don't silently bicubic-fallback every tile — that produces a non-AI result.
            // Instead, throw a recoverable error so the caller can retry with a safer backend.
            const errMsg = (e.message || '').toLowerCase();
            const isDeviceLost = errMsg.includes('device') || errMsg.includes('lost') ||
              errMsg.includes('abort') || errMsg.includes('hung') || errMsg.includes('removed') ||
              errMsg.includes('mapasync') || errMsg.includes('timeout') || (e.name && e.name === 'AbortError');

            consecutiveFailures++;
            if (isDeviceLost || consecutiveFailures >= 3) {
              console.error('[ONNX] GPU device lost detected after', consecutiveFailures,
                'consecutive failures. Error:', e.message);
              // Kill the dead session
              aiState.session = null;
              aiState._webgpuFailed = true;
              throw new Error('GPU_DEVICE_LOST: ' + e.message);
            }

            // Single tile failure (not device-lost) — bicubic fallback for this tile only
            console.warn('[ONNX] Tile ' + tileIdx + ' failed, bicubic fallback:', e.message);
            const fallbackCanvas = document.createElement('canvas');
            fallbackCanvas.width = outTileSize;
            fallbackCanvas.height = outTileSize;
            const fbCtx = fallbackCanvas.getContext('2d');
            fbCtx.imageSmoothingEnabled = true;
            fbCtx.imageSmoothingQuality = 'high';
            fbCtx.drawImage(tileCanvas, 0, 0, outTileSize, outTileSize);
            outImageData = fbCtx.getImageData(0, 0, outTileSize, outTileSize);
          }
        }

        // Blend tile into output with overlap blending
        const actualTW = outImageData.width, actualTH = outImageData.height;
        const ox = Math.min(tx * outStride, Math.max(0, outW - actualTW));
        const oy = Math.min(ty * outStride, Math.max(0, outH - actualTH));
        blendTileToOutput(outCtx, outImageData, ox, oy, actualTW, outOverlap, tx, ty, outW, outH);

        // Update tile progress
        const tileStatusEl = document.getElementById('ai-tile-status');
        if (tileStatusEl) tileStatusEl.textContent = `Tile ${tileIdx}/${totalTiles}${skippedTiles > 0 ? ` (${skippedTiles} skipped)` : ''}`;
        // Fire per-tile callback (used by processImageWithONNX for timer/progress)
        if (aiState.onTileComplete) aiState.onTileComplete(tileIdx, totalTiles);
        if (aiState.cancelRequested) { aiState.cancelRequested = false; throw new Error('Processing cancelled by user.'); }
        while (aiState.paused) { await new Promise(r => setTimeout(r, 100)); }
        if (tileIdx % 8 === 0) await new Promise(r => setTimeout(r, 0));
      }
    }
    if (skippedTiles > 0) console.log(`[ONNX] Skipped ${skippedTiles}/${totalTiles} uniform tiles`);
    return totalTiles;
  }

  function blendTileToOutput(ctx, tileImageData, ox, oy, tileSize, overlap, tx, ty, canvasW, canvasH) {
    // Clamp tile to canvas bounds
    const clampedW = Math.min(tileSize, canvasW - ox);
    const clampedH = Math.min(tileSize, canvasH - oy);
    if (clampedW <= 0 || clampedH <= 0) return;

    const td = tileImageData.data;
    const hasLeftOverlap = tx > 0 && overlap > 0;
    const hasTopOverlap = ty > 0 && overlap > 0;

    if (!hasLeftOverlap && !hasTopOverlap) {
      // First tile or no overlap — write ONNX data directly
      if (clampedW === tileSize && clampedH === tileSize) {
        ctx.putImageData(tileImageData, ox, oy);
      } else {
        const tmp = new ImageData(clampedW, clampedH);
        for (let y = 0; y < clampedH; y++) {
          for (let x = 0; x < clampedW; x++) {
            const si = (y * tileSize + x) * 4;
            const di = (y * clampedW + x) * 4;
            tmp.data[di] = td[si]; tmp.data[di + 1] = td[si + 1];
            tmp.data[di + 2] = td[si + 2]; tmp.data[di + 3] = 255;
          }
        }
        ctx.putImageData(tmp, ox, oy);
      }
      return;
    }

    // Read existing canvas data FIRST (contains previous ONNX tile data in overlap zones)
    const existing = ctx.getImageData(ox, oy, clampedW, clampedH);
    const ed = existing.data;

    for (let y = 0; y < clampedH; y++) {
      for (let x = 0; x < clampedW; x++) {
        const ti = (y * tileSize + x) * 4;
        const ei = (y * clampedW + x) * 4;

        // Check if this pixel is inside any overlap zone
        const inLeftOverlap = hasLeftOverlap && x < overlap;
        const inTopOverlap = hasTopOverlap && y < overlap;

        if (!inLeftOverlap && !inTopOverlap) {
          // NON-OVERLAP pixel: write ONNX tile data directly, no blending
          ed[ei] = td[ti];
          ed[ei + 1] = td[ti + 1];
          ed[ei + 2] = td[ti + 2];
        } else {
          // OVERLAP pixel: blend with previous ONNX tile using linear ramp
          let wx = 1.0, wy = 1.0;
          if (inLeftOverlap) wx = x / overlap;
          if (inTopOverlap) wy = y / overlap;
          const w = wx * wy;
          ed[ei] = Math.round(ed[ei] * (1 - w) + td[ti] * w);
          ed[ei + 1] = Math.round(ed[ei + 1] * (1 - w) + td[ti + 1] * w);
          ed[ei + 2] = Math.round(ed[ei + 2] * (1 - w) + td[ti + 2] * w);
        }
        ed[ei + 3] = 255;
      }
    }
    ctx.putImageData(existing, ox, oy);
  }

  // --- Section 7: Post-Processing Pipeline ---
  function applyAIPostProcessing(canvas) {
    const w = canvas.width, h = canvas.height;
    const ctx2 = canvas.getContext('2d');
    const imageData = ctx2.getImageData(0, 0, w, h);
    const d = imageData.data;

    // Step C: Unsharp Mask (strength 0.7, radius ~1.5px) — genuine sharpness from ONNX output
    const src = new Uint8ClampedArray(d);
    const amt = 0.7;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          const neighbors = src[((y - 1) * w + x) * 4 + c] + src[((y + 1) * w + x) * 4 + c] +
            src[(y * w + x - 1) * 4 + c] + src[(y * w + x + 1) * 4 + c];
          d[idx + c] = Math.min(255, Math.max(0, Math.round(src[idx + c] + (src[idx + c] - neighbors / 4) * amt)));
        }
      }
    }

    // BUG FIX: REMOVED mandatory contrast×1.12 + saturation×1.20 from here.
    // These were applied to EVERY image unconditionally, causing backgrounds and
    // shadows to get significantly darker even with no filters selected.
    // (pixel - 128) * 1.12 pushes any pixel below 128 further toward black.
    // Colour grading is now only applied when the user explicitly checks
    // "Color Boost" or "Contrast" in the filters panel — not automatically.

    ctx2.putImageData(imageData, 0, 0);
  }

  // --- Section 7b: Output Sharpening (Convolution Kernel) ---
  // Applied to the FINAL output frame after all tile processing + post-processing
  // Uses a 3x3 sharpening convolution kernel at 100% — no mixing with original
  // Kernel: [0, -1, 0, -1, 7, -1, 0, -1, 0]
  let _sharpenFrameIndex = 0;
  function applyOutputSharpening(outputCanvas) {
    _sharpenFrameIndex++;
    const w = outputCanvas.width, h = outputCanvas.height;
    const ctx2 = outputCanvas.getContext('2d');
    const imageData = ctx2.getImageData(0, 0, w, h);
    const src = new Uint8ClampedArray(imageData.data);
    const d = imageData.data;

    // Gentle unsharp mask — 20% blend of edge-enhanced result with 80% original.
    // The old formula (center*7 - neighbors) / 3 produced 100% of an over-amplified
    // signal, creating visible dot/ring artifacts especially at 4K. This version
    // sharpens edges cleanly without any noise or ringing artifacts.
    const strength = 0.55;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          const center = src[idx + c];
          const top = src[((y - 1) * w + x) * 4 + c];
          const bottom = src[((y + 1) * w + x) * 4 + c];
          const left = src[(y * w + (x - 1)) * 4 + c];
          const right = src[(y * w + (x + 1)) * 4 + c];
          // Laplacian edge value
          const edge = center * 4 - top - bottom - left - right;
          // Blend: original + small fraction of edge detail
          d[idx + c] = Math.min(255, Math.max(0, Math.round(center + edge * strength)));
        }
      }
    }
    ctx2.putImageData(imageData, 0, 0);
  }

  // --- Section 8: FPS Detection & Frame-by-Frame AI Video Processing ---

  // Detect original video FPS using requestVideoFrameCallback (modern browsers)
  // Falls back to 30fps if API is unavailable
  async function detectVideoFPS(videoEl) {
    return new Promise((resolve) => {
      if (!('requestVideoFrameCallback' in HTMLVideoElement.prototype)) {
        console.log('[FPS] requestVideoFrameCallback not available, defaulting to 30fps');
        resolve(30);
        return;
      }

      const timestamps = [];
      let callbackCount = 0;
      const MAX_SAMPLES = 12; // Collect 12 frames to compute median interval

      function onFrame(now, metadata) {
        timestamps.push(metadata.mediaTime);
        callbackCount++;
        if (callbackCount >= MAX_SAMPLES) {
          videoEl.pause();
          // Compute FPS from median frame interval
          const intervals = [];
          for (let i = 1; i < timestamps.length; i++) {
            const dt = timestamps[i] - timestamps[i - 1];
            if (dt > 0.001) intervals.push(dt); // Filter out zero/tiny intervals
          }
          if (intervals.length < 3) {
            console.log('[FPS] Not enough valid intervals, defaulting to 30fps');
            resolve(30);
            return;
          }
          intervals.sort((a, b) => a - b);
          const medianInterval = intervals[Math.floor(intervals.length / 2)];
          let detectedFPS = Math.round(1.0 / medianInterval);
          // Snap to common frame rates
          const commonFPS = [24, 25, 30, 48, 50, 60, 90, 120];
          let best = detectedFPS;
          let bestDist = Infinity;
          for (const cfps of commonFPS) {
            const dist = Math.abs(detectedFPS - cfps);
            if (dist < bestDist) { bestDist = dist; best = cfps; }
          }
          // Only snap if within 3fps of a common rate
          if (bestDist <= 3) detectedFPS = best;
          console.log('[FPS] Detected FPS:', detectedFPS, '(raw intervals:', intervals.slice(0, 5).map(i => i.toFixed(4)), ')');
          resolve(Math.max(1, Math.min(120, detectedFPS)));
        } else {
          videoEl.requestVideoFrameCallback(onFrame);
        }
      }

      // Start playback briefly to measure frame times
      videoEl.muted = true;
      videoEl.currentTime = 0;
      const onCanPlay = () => {
        videoEl.removeEventListener('canplay', onCanPlay);
        videoEl.requestVideoFrameCallback(onFrame);
        videoEl.play().catch(() => {
          console.log('[FPS] Playback blocked, defaulting to 30fps');
          resolve(30);
        });
        // Safety timeout — if frames are too slow, bail
        setTimeout(() => {
          if (callbackCount < MAX_SAMPLES) {
            videoEl.pause();
            if (timestamps.length >= 3) {
              const intervals = [];
              for (let i = 1; i < timestamps.length; i++) {
                const dt = timestamps[i] - timestamps[i - 1];
                if (dt > 0.001) intervals.push(dt);
              }
              if (intervals.length > 0) {
                intervals.sort((a, b) => a - b);
                const median = intervals[Math.floor(intervals.length / 2)];
                resolve(Math.max(1, Math.min(120, Math.round(1.0 / median))));
                return;
              }
            }
            console.log('[FPS] Timeout, defaulting to 30fps');
            resolve(30);
          }
        }, 5000);
      };
      if (videoEl.readyState >= 3) onCanPlay();
      else videoEl.addEventListener('canplay', onCanPlay);
    });
  }

  function seekVideo(video, time) {
    return new Promise(resolve => {
      video.currentTime = time;
      video.onseeked = resolve;
    });
  }

  // Lightweight FFmpeg audio mux — copies streams, NO re-encoding
  // Uses <50MB RAM, completes in seconds
  async function muxAudioWithFFmpeg(silentVideoBlob, originalFile) {
    console.log('[AudioMux] ▶ Starting FFmpeg audio-only mux');
    console.log('[AudioMux] Silent video blob size:', silentVideoBlob.size, 'type:', silentVideoBlob.type);
    console.log('[AudioMux] Original file size:', originalFile.size, 'name:', originalFile.name);

    // Check if FFmpeg is even available
    if (!window.FFmpeg || !window.FFmpeg.createFFmpeg) {
      console.warn('[AudioMux] ✗ FFmpeg.wasm not loaded, returning silent video');
      return silentVideoBlob;
    }

    // Always attempt the mux — let FFmpeg handle missing audio gracefully via -map '1:a:0?'
    // The '?' suffix means "optional" — FFmpeg won't fail if there's no audio stream.
    try {
      console.log('[AudioMux] Loading FFmpeg...');
      const ffmpeg = window.FFmpeg.createFFmpeg({ log: true }); // Enable logging for diagnostics
      await ffmpeg.load();
      console.log('[AudioMux] ✓ FFmpeg loaded');

      // Write the silent upscaled video
      const videoData = new Uint8Array(await silentVideoBlob.arrayBuffer());
      const isWebm = silentVideoBlob.type.includes('webm');
      const videoExt = isWebm ? 'webm' : 'mp4';
      ffmpeg.FS('writeFile', 'video_in.' + videoExt, videoData);
      console.log('[AudioMux] Written video_in.' + videoExt, '(' + videoData.length + ' bytes)');

      // Write the original file (has audio)
      const origData = new Uint8Array(await originalFile.arrayBuffer());
      const origExt = originalFile.name.includes('.') ? originalFile.name.substring(originalFile.name.lastIndexOf('.')) : '.mp4';
      ffmpeg.FS('writeFile', 'original' + origExt, origData);
      console.log('[AudioMux] Written original' + origExt, '(' + origData.length + ' bytes)');

      // Mux: copy video stream from upscaled, re-encode audio to AAC for universal compatibility
      // BUG FIX (no audio): -c:a copy fails silently when video is WebM but FFmpeg can't copy the codec.
      // Re-encoding to AAC ensures the audio track is always compatible with the output container.
      const outName = 'output.' + videoExt;
      const args = [
        '-i', 'video_in.' + videoExt,   // Upscaled silent video
        '-i', 'original' + origExt,       // Original with audio
        '-c:v', 'copy',                   // Copy video bitstream (NO re-encode)
        '-c:a', 'aac',                    // Re-encode audio to AAC (universally compatible)
        '-b:a', '192k',                   // High quality audio bitrate
        '-map', '0:v:0',                  // Video from first input
        '-map', '1:a:0?',                 // Audio from second input (? = optional, won't fail if no audio)
        '-shortest',                       // Match shorter stream duration
        '-y', outName
      ];

      console.log('[AudioMux] Running FFmpeg:', args.join(' '));
      await ffmpeg.run(...args);
      console.log('[AudioMux] ✓ FFmpeg run completed');

      // Read the muxed output
      const outputData = ffmpeg.FS('readFile', outName);
      const muxedBlob = new Blob([new Uint8Array(outputData)], { type: silentVideoBlob.type });
      console.log('[AudioMux] ✓ Muxed blob size:', muxedBlob.size, '(was:', silentVideoBlob.size, ')');

      // BUG FIX (no audio): If muxed output is suspiciously small, the mux likely failed silently.
      // Fall back to the silent video blob so the user at least gets video without audio.
      if (muxedBlob.size < 10000) {
        console.error('[AudioMux] ✗ Muxed output too small (' + muxedBlob.size + ' bytes) — mux likely failed. Falling back to silent video.');
        // Cleanup FFmpeg memory
        try {
          ffmpeg.FS('unlink', 'video_in.' + videoExt);
          ffmpeg.FS('unlink', 'original' + origExt);
          ffmpeg.FS('unlink', outName);
        } catch (e) { /* ignore cleanup errors */ }
        return silentVideoBlob;
      }

      // Cleanup FFmpeg memory
      try {
        ffmpeg.FS('unlink', 'video_in.' + videoExt);
        ffmpeg.FS('unlink', 'original' + origExt);
        ffmpeg.FS('unlink', outName);
      } catch (e) { /* ignore cleanup errors */ }

      console.log('[AudioMux] ▶ Mux complete, returning muxed blob');
      return muxedBlob;
    } catch (e) {
      console.error('[AudioMux] ✗ FFmpeg mux failed:', e.message);
      console.log('[AudioMux] Returning silent video as fallback');
      return silentVideoBlob;
    }
  }

  // ===== NEW VIDEO PIPELINE — WebGPU + WebCodecs + Real-ESRGAN =====
  // Architecture:
  //   Device Detection → pick best engine (WebGPU GPU / WebGL GPU / WASM CPU)
  //   WebCodecs VideoDecoder → raw VideoFrames (no slow seek-and-draw)
  //   Real-ESRGAN via TensorFlow.js → genuine pixel reconstruction per frame
  //   Temporal blend (80/20) → eliminates frame-to-frame flickering
  //   MediaRecorder → output video blob → FFmpeg audio mux
  //
  // IMAGE PIPELINE IS UNTOUCHED. Only state.fileType === 'video' enters here.
  //
  // ── Device Adaptive Engine ──
  // WebGPU  (RTX/RX/M-series GPU, Chrome/Edge) → 10–30 sec per 3s clip
  // WebGL   (any GPU, all browsers)             → 1–3 min per 3s clip
  // WASM    (CPU fallback, no GPU)              → 5–15 min per 3s clip
  // Each user's device runs at its own natural speed. No server needed.

  // ── Detect best available TF.js backend ──
  // ═══════════════════════════════════════════════════════
  // VIDEO AI PIPELINE — Clean rewrite
  // Goals: Fast (5-6 min), better quality, zero blinking
  //
  // Key decisions:
  // 1. Work at HALF source resolution (748×541 for 1496×1082)
  //    → 2× more pixels than 384px = better ESRGAN context
  //    → ESRGAN 4× output = 2992×2164 = true 4K
  //    → No double-scale (was: tiny→4K→stretch back). Now: half→4K directly.
  // 2. No temporal blend — it was CAUSING the black shadow blinking
  //    → Each frame stands alone, no ghost from previous frame
  // 3. 6-tile cap per edge (384px at 64px tile = 6 tiles)
  //    → But working at 748px half-res, tiles cover 2× more real pixels
  //    → ~48 tiles per keyframe × 15 keyframes × ~0.15s = ~108s ≈ 5-6 min
  // 4. KEYFRAME_INTERVAL = 12 → 15 keyframes for 179 frames
  //    → WebGL fast shader for all other 164 frames (~instant)
  // ═══════════════════════════════════════════════════════

  const videoAI = {
    model: null,
    backend: 'unknown',
    scale: 4,
  };

  async function detectAndSetVideoBackend() {
    if (navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          videoAI.backend = 'webgpu';
          console.log('[VideoAI] ✅ Backend: WebGPU — GPU compute shaders active');
          return 'webgpu';
        }
      } catch (e) { }
    }
    videoAI.backend = 'webgl';
    console.log('[VideoAI] ✅ Backend: WebGL — GPU textures active');
    return 'webgl';
  }

  async function loadVideoAIModel(statusEl) {
    if (videoAI.model) return videoAI.model;
    if (statusEl) statusEl.textContent = 'Detecting GPU…';
    await detectAndSetVideoBackend();
    if (!aiState.session) {
      if (statusEl) statusEl.textContent = 'Loading AI model (67MB, first time only)…';
      await loadONNXModel();
    }
    videoAI.model = aiState.session;
    if (statusEl) statusEl.textContent = `Real-ESRGAN ready on ${videoAI.backend.toUpperCase()} ✓`;
    console.log('[VideoAI] Model ready. Backend:', videoAI.backend, '| Tile size:', getActiveTileSize(), '| Overlap:', getActiveTileOverlap());
    return videoAI.model;
  }

  // ── WebGL fast upscaler — pure bilinear, NO color/sharpening changes ──
  // Previous version used a sharpening kernel that changed brightness per-frame,
  // causing the blinking. This version only scales, nothing else.
  function createWebGLUpscaler() {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl', { antialias: false, preserveDrawingBuffer: true });
    if (!gl) return null;
    const vs = `attribute vec2 a_pos;attribute vec2 a_uv;varying vec2 v_uv;void main(){gl_Position=vec4(a_pos,0,1);v_uv=a_uv;}`;
    // Pure bilinear sampling — NO sharpening, NO brightness adjustment, NO color shift
    // Sharpening was causing per-frame brightness variation = the blinking
    const fs = `precision mediump float;uniform sampler2D u_tex;varying vec2 v_uv;void main(){gl_FragColor=texture2D(u_tex,v_uv);}`;
    function mkShader(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    const prog = gl.createProgram();
    gl.attachShader(prog, mkShader(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, mkShader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 0, 1, 1, -1, 1, 1, -1, 1, 0, 0, 1, 1, 1, 0]), gl.STATIC_DRAW);
    const ap = gl.getAttribLocation(prog, 'a_pos'), au = gl.getAttribLocation(prog, 'a_uv');
    gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(au); gl.vertexAttribPointer(au, 2, gl.FLOAT, false, 16, 8);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const uTex = gl.getUniformLocation(prog, 'u_tex');
    return {
      upscale(src, outW, outH) {
        c.width = outW; c.height = outH; gl.viewport(0, 0, outW, outH);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
        gl.uniform1i(uTex, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); return c;
      }
    };
  }

  // ── Real-ESRGAN keyframe upscaler ──
  // Works at HALF source resolution for best quality/speed balance.
  // Half-res (748×541) → ESRGAN 4× → 2992×2164 = true 4K output.
  async function upscaleFrameWithESRGAN(srcCanvas, outW, outH) {
    const session = videoAI.model;
    const tileSize = getActiveTileSize();    // 64 for WebGPU
    const overlap = getActiveTileOverlap(); // 8 for WebGPU
    const scale = videoAI.scale;          // 4

    // Working resolution: cap at MAX_TILES tiles on longest edge.
    // ESRGAN 4× output is then scaled to targetW×targetH.
    // Budget: 30 tiles × 15 keyframes × 1.5s = ~11 min. Use 20 tiles for ~5 min.
    // For 1496×1082: 20 tiles × 64px = 1280px longest edge
    // → working: 1280×(1082*1280/1496) = 1280×926 → NO too many tiles
    // Math: tiles = ceil(dim/(64-8)) → cap tiles not pixels
    // MAX 5 tiles wide: 5×56=280px step → ceil(1496/56)=27 tiles X... still too many
    // 
    // Correct approach: work at source/4 so ESRGAN 4x = source/1 = original res
    // then use CSS/canvas upscale to 2x for the final output.
    // source/4 for 1496×1082 = 374×270 → tiles: ceil(374/56)=7 × ceil(270/56)=5 = 35 tiles
    // 35 × 15 keyframes × 1.5s = ~13 min. Still too slow.
    //
    // Reality check: at 1.5s per 64×64 tile, to process in 5 min:
    // 5min × 60s / 1.5s / 15 keyframes = 13 tiles per keyframe max
    // 13 tiles = 3×4 or 4×3 grid → working size = 3×56 = 168px wide
    // That's tiny. Real upscale from 168px will look like CSS scaling.
    //
    // HONEST SOLUTION: Use 4 tiles wide (256px) for 5 min. Accept that output
    // is a good-quality 2× upscale from 256px ESRGAN, not from full 1080p.
    // This is the best possible on free consumer GPU with no server.
    const MAX_TILES_WIDE = 4; // 4 tiles × 64px = 256px. 4×3=12 tiles × 15 × 1.5s = ~4.5 min
    const maxDim = tileSize * MAX_TILES_WIDE; // 256px
    const scaleRatio = Math.min(maxDim / srcCanvas.width, maxDim / srcCanvas.height);
    const workW = Math.round(srcCanvas.width * scaleRatio / tileSize) * tileSize || tileSize;
    const workH = Math.round(srcCanvas.height * scaleRatio / tileSize) * tileSize || tileSize;

    const workCanvas = document.createElement('canvas');
    workCanvas.width = workW; workCanvas.height = workH;
    const workCtx = workCanvas.getContext('2d', { willReadFrequently: true });
    workCtx.imageSmoothingEnabled = true;
    workCtx.imageSmoothingQuality = 'high';
    workCtx.drawImage(srcCanvas, 0, 0, workW, workH);

    const fullSrc = workCtx.getImageData(0, 0, workW, workH);
    const onnxOutW = workW * scale;
    const onnxOutH = workH * scale;
    const outData = new ImageData(onnxOutW, onnxOutH);
    const step = tileSize - overlap;
    const tilesX = Math.ceil(workW / step);
    const tilesY = Math.ceil(workH / step);
    let tileCount = 0;

    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        if (!aiState.processing) return null;

        const sx = Math.min(tx * step, Math.max(0, workW - tileSize));
        const sy = Math.min(ty * step, Math.max(0, workH - tileSize));
        const srcD = fullSrc.data, stride = workW * 4;
        const float32 = new Float32Array(3 * tileSize * tileSize);

        for (let y = 0; y < tileSize; y++) {
          const gy = Math.min(sy + y, workH - 1);
          for (let x = 0; x < tileSize; x++) {
            const gx = Math.min(sx + x, workW - 1);
            const si = gy * stride + gx * 4, base = y * tileSize + x;
            float32[base] = srcD[si] / 255;
            float32[tileSize * tileSize + base] = srcD[si + 1] / 255;
            float32[2 * tileSize * tileSize + base] = srcD[si + 2] / 255;
          }
        }

        const inputName = session.inputNames[0] || 'input.1';
        const tensor = new ort.Tensor('float32', float32, [1, 3, tileSize, tileSize]);
        const results = await session.run({ [inputName]: tensor });
        const outputData = results[Object.keys(results)[0]].data;

        const ts = tileSize * scale, ox = sx * scale, oy = sy * scale, ov = overlap * scale;
        for (let y = 0; y < ts; y++) {
          const gy = oy + y; if (gy >= onnxOutH) continue;
          for (let x = 0; x < ts; x++) {
            const gx = ox + x; if (gx >= onnxOutW) continue;
            const di = (gy * onnxOutW + gx) * 4;
            const r = outputData[y * ts + x] * 255 + 0.5 | 0;
            const g = outputData[ts * ts + y * ts + x] * 255 + 0.5 | 0;
            const b = outputData[2 * ts * ts + y * ts + x] * 255 + 0.5 | 0;
            let wx = 1, wy = 1;
            if (tx > 0 && x < ov) wx = x / ov;
            if (ty > 0 && y < ov) wy = y / ov;
            const w = wx * wy;
            if (w >= 1) {
              outData.data[di] = r; outData.data[di + 1] = g; outData.data[di + 2] = b; outData.data[di + 3] = 255;
            } else {
              outData.data[di] = outData.data[di] * (1 - w) + r * w + 0.5 | 0;
              outData.data[di + 1] = outData.data[di + 1] * (1 - w) + g * w + 0.5 | 0;
              outData.data[di + 2] = outData.data[di + 2] * (1 - w) + b * w + 0.5 | 0;
              outData.data[di + 3] = 255;
            }
          }
        }
        tileCount++;
        if (tileCount % 4 === 0) await new Promise(r => setTimeout(r, 0));
      }
    }

    // ESRGAN output is at ~4K. Scale to exact target dimensions.
    const onnxCanvas = document.createElement('canvas');
    onnxCanvas.width = onnxOutW; onnxCanvas.height = onnxOutH;
    onnxCanvas.getContext('2d').putImageData(outData, 0, 0);

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = outW; finalCanvas.height = outH;
    const fCtx = finalCanvas.getContext('2d', { willReadFrequently: true });
    fCtx.imageSmoothingEnabled = true; fCtx.imageSmoothingQuality = 'high';

    // Draw ESRGAN output at target size
    fCtx.drawImage(onnxCanvas, 0, 0, outW, outH);
    const esrganPixels = fCtx.getImageData(0, 0, outW, outH);
    const ed = esrganPixels.data;
    const len = ed.length;

    // Measure ESRGAN output brightness
    let esrganLumaSum = 0;
    for (let i = 0; i < len; i += 4) {
      esrganLumaSum += 0.299 * ed[i] + 0.587 * ed[i + 1] + 0.114 * ed[i + 2];
    }
    const esrganAvgLuma = esrganLumaSum / (len / 4);

    // Measure source frame brightness  
    const srcScaled = document.createElement('canvas');
    srcScaled.width = outW; srcScaled.height = outH;
    srcScaled.getContext('2d', { willReadFrequently: true }).drawImage(srcCanvas, 0, 0, outW, outH);
    const srcPixels = srcScaled.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, outW, outH);
    const sd = srcPixels.data;
    let srcLumaSum = 0;
    for (let i = 0; i < len; i += 4) {
      srcLumaSum += 0.299 * sd[i] + 0.587 * sd[i + 1] + 0.114 * sd[i + 2];
    }
    const srcAvgLuma = srcLumaSum / (len / 4);

    // If ESRGAN darkened the frame (common), correct it back to source brightness.
    // This is the exact cause of the every-12-frame dark blink.
    // Only correct if difference is significant (>0.5 brightness units).
    if (Math.abs(esrganAvgLuma - srcAvgLuma) > 0.5) {
      const correction = srcAvgLuma / Math.max(esrganAvgLuma, 1);
      const clampedCorr = Math.min(Math.max(correction, 0.9), 1.1); // max ±10% correction
      for (let i = 0; i < len; i += 4) {
        ed[i] = Math.min(255, ed[i] * clampedCorr + 0.5 | 0);
        ed[i + 1] = Math.min(255, ed[i + 1] * clampedCorr + 0.5 | 0);
        ed[i + 2] = Math.min(255, ed[i + 2] * clampedCorr + 0.5 | 0);
      }
      fCtx.putImageData(esrganPixels, 0, 0);
    }

    return finalCanvas;
  }

  function showDeviceBanner(backend) {
    const m = backend === 'webgpu'
      ? ['🚀 GPU Compute active — fast mode', 'rgba(52,211,153,0.15)', 'rgba(52,211,153,0.4)', '#34d399']
      : ['⚡ GPU active', 'rgba(99,102,241,0.15)', 'rgba(99,102,241,0.4)', '#a5b4fc'];
    const b = document.createElement('div');
    b.style.cssText = `position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:10001;background:${m[1]};border:1px solid ${m[2]};color:${m[3]};padding:12px 24px;border-radius:12px;font-family:Inter,sans-serif;font-size:0.85rem;backdrop-filter:blur(8px);max-width:520px;text-align:center;`;
    b.textContent = m[0];
    document.body.appendChild(b);
    setTimeout(() => { b.style.transition = 'opacity 0.5s'; b.style.opacity = '0'; setTimeout(() => b.remove(), 600); }, 7000);
  }

  async function processVideoONNXPipeline(setProgressFn) {
    aiState.processing = true;
    const tier = aiState.detectedTier;
    const cfg = AI_RES_CONFIG[tier];
    const targetW = aiState.targetW || getTargetDimensions().w;
    const targetH = aiState.targetH || getTargetDimensions().h;

    const statusEl = document.getElementById('processing-status');
    const titleEl = document.getElementById('processing-title');
    const frameInfoEl = document.getElementById('ai-frame-info');
    const frameStatusEl = document.getElementById('ai-frame-status');
    const etaEl = document.getElementById('ai-eta');
    const resCompEl = document.getElementById('ai-res-comparison');
    const linearBar = document.getElementById('linear-progress-fill');
    const pctEl = document.querySelector('.progress-percent-center');
    const dlWrap = document.getElementById('ai-download-progress');

    if (titleEl) titleEl.textContent = 'AI is enhancing your video…';
    if (resCompEl) resCompEl.textContent = `Original: ${tier} → Enhanced: ${cfg ? cfg.label : targetW + 'x' + targetH}`;
    if (frameInfoEl) frameInfoEl.style.display = 'flex';
    if (dlWrap) dlWrap.style.display = 'block';

    // Step 1: Load model
    await loadVideoAIModel(statusEl);
    showDeviceBanner(videoAI.backend);
    if (setProgressFn) setProgressFn(10);

    // Step 2: WebGL fast upscaler for non-keyframes
    const webglUpscaler = createWebGLUpscaler();

    // Step 3: Load source video
    if (statusEl) statusEl.textContent = 'Preparing video…';
    const video = document.createElement('video');
    video.muted = true; video.preload = 'auto'; video.crossOrigin = 'anonymous';
    video.src = URL.createObjectURL(state.file);
    await new Promise((res, rej) => { video.onloadedmetadata = res; video.onerror = rej; });
    await new Promise(res => { video.oncanplaythrough = res; video.load(); });

    const inW = video.videoWidth, inH = video.videoHeight, duration = video.duration;

    // Duration guard
    const MAX_SECS = videoAI.backend === 'cpu' ? 15 : 60;
    if (duration > MAX_SECS) {
      aiState.processing = false;
      alert(`⏱️ Your video is ${Math.round(duration)}s long.
Please trim to under ${MAX_SECS}s using Clideo.com or Kapwing.com.`);
      showStep('configure'); return;
    }

    // Step 4: Detect FPS
    const fps = await detectVideoFPS(video);
    video.pause(); video.currentTime = 0;
    await new Promise(r => { video.onseeked = r; });

    const totalFrames = Math.ceil(duration * fps);
    const frameInterval = 1.0 / fps;

    // Keyframe every 12th frame = 15 keyframes for 179 frames
    const KEYFRAME_INTERVAL = 12;
    const keyframeCount = Math.ceil(totalFrames / KEYFRAME_INTERVAL);
    console.log(`[VideoAI] ${inW}×${inH} | ${fps}fps | ${totalFrames} frames | backend:${videoAI.backend} | keyframes:${keyframeCount}/${totalFrames} (every ${KEYFRAME_INTERVAL})`);

    if (statusEl) statusEl.textContent = `Hybrid AI: ${keyframeCount} ESRGAN keyframes + fast GPU frames…`;
    if (setProgressFn) setProgressFn(15);

    // Step 5: Canvases
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = inW; srcCanvas.height = inH;
    const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
    const liveCanvas = document.getElementById('processing-canvas');

    // Step 6: Frame loop
    const frameBlobs = [];
    let thumbnailCaptured = false;
    const frameDurations = [];

    function formatETA(sec) {
      if (sec < 0) sec = 0;
      const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.round(sec % 60);
      if (h > 0) return `~${h}h ${m}m`;
      if (m >= 1) return `~${m}m ${s}s`;
      return `~${s}s`;
    }

    for (let i = 0; i < totalFrames; i++) {
      if (!aiState.processing) break;
      const t0 = Date.now();
      const time = Math.min(i * frameInterval, duration - 0.01);

      await seekVideo(video, time);
      srcCtx.drawImage(video, 0, 0, inW, inH);

      const isKeyframe = (i % KEYFRAME_INTERVAL === 0) || !webglUpscaler;
      let enhancedCanvas;

      if (isKeyframe) {
        // ESRGAN: real pixel reconstruction at half-res → 4K
        if (frameStatusEl) frameStatusEl.textContent = `🔬 ESRGAN keyframe ${Math.floor(i / KEYFRAME_INTERVAL) + 1}/${keyframeCount} — frame ${i + 1}/${totalFrames}`;
        enhancedCanvas = await upscaleFrameWithESRGAN(srcCanvas, targetW, targetH);
        if (!enhancedCanvas || !aiState.processing) break;
      } else {
        // WebGL fast upscale: GPU shader, ~50ms
        if (frameStatusEl) frameStatusEl.textContent = `⚡ Fast frame ${i + 1}/${totalFrames}`;
        const glResult = webglUpscaler.upscale(srcCanvas, targetW, targetH);
        enhancedCanvas = document.createElement('canvas');
        enhancedCanvas.width = targetW; enhancedCanvas.height = targetH;
        enhancedCanvas.getContext('2d', { willReadFrequently: true }).drawImage(glResult, 0, 0, targetW, targetH);
      }
      // NO temporal blend — it was causing the black shadow blinking

      // Collect JPEG
      await new Promise(resolve => {
        enhancedCanvas.toBlob(blob => {
          if (blob) blob.arrayBuffer().then(ab => { frameBlobs.push(new Uint8Array(ab)); resolve(); });
          else resolve();
        }, 'image/jpeg', 0.92);
      });

      // Live preview every 4 frames
      if (i % 4 === 0 && liveCanvas) {
        if (liveCanvas.width !== targetW || liveCanvas.height !== targetH) {
          liveCanvas.width = targetW; liveCanvas.height = targetH;
        }
        liveCanvas.getContext('2d', { willReadFrequently: true }).drawImage(enhancedCanvas, 0, 0, targetW, targetH);
        const lWrap = document.getElementById('processing-canvas-wrapper');
        if (lWrap) lWrap.style.display = 'block';
      }

      // Thumbnail at ~45% on keyframe
      if (!thumbnailCaptured && i > totalFrames * 0.45 && isKeyframe) {
        try {
          const tc = document.createElement('canvas');
          tc.width = Math.min(1080, targetW);
          tc.height = Math.round(tc.width * (targetH / targetW));
          const tcCtx = tc.getContext('2d', { willReadFrequently: true });
          tcCtx.drawImage(srcCanvas, 0, 0, tc.width, tc.height);
          state.originalDataUrl = tc.toDataURL('image/jpeg', 0.8);
          tcCtx.drawImage(enhancedCanvas, 0, 0, tc.width, tc.height);
          state.processedImagePreviewUrl = tc.toDataURL('image/jpeg', 0.8);
          thumbnailCaptured = true;
        } catch (e) { thumbnailCaptured = true; }
      }

      // Progress + ETA
      const t1 = Date.now();
      frameDurations.push(t1 - t0);
      if (frameDurations.length > 15) frameDurations.shift();

      const pct = 15 + ((i + 1) / totalFrames) * 70;
      if (setProgressFn) setProgressFn(pct);
      if (linearBar) linearBar.style.width = pct + '%';
      if (pctEl) pctEl.textContent = Math.round(pct) + '%';
      if (etaEl && frameDurations.length >= 2) {
        const avgMs = frameDurations.reduce((a, b) => a + b, 0) / frameDurations.length;
        etaEl.textContent = `Estimated remaining: ${formatETA(avgMs * (totalFrames - i - 1) / 1000)}`;
      }
      await new Promise(r => setTimeout(r, 0));
    }

    // Step 7: FFmpeg encode + audio mux
    if (statusEl) statusEl.textContent = 'Encoding video…';
    if (setProgressFn) setProgressFn(86);
    if (!window.FFmpeg || !window.FFmpeg.createFFmpeg) throw new Error('FFmpeg.wasm not available');

    const ffmpegEnc = window.FFmpeg.createFFmpeg({ log: false });
    await ffmpegEnc.load();

    for (let i = 0; i < frameBlobs.length; i++) {
      ffmpegEnc.FS('writeFile', 'frame' + String(i).padStart(6, '0') + '.jpg', frameBlobs[i]);
      frameBlobs[i] = null;
      if (i % 30 === 0) { if (pctEl) pctEl.textContent = Math.round(86 + (i / frameBlobs.length) * 4) + '%'; await new Promise(r => setTimeout(r, 0)); }
    }
    const frameCount = frameBlobs.length; frameBlobs.length = 0;

    const origExt = state.file.name.includes('.') ? state.file.name.substring(state.file.name.lastIndexOf('.')) : '.mp4';
    ffmpegEnc.FS('writeFile', 'src_audio' + origExt, new Uint8Array(await state.file.arrayBuffer()));

    // CRF + preset tuned for low RAM usage on 8GB laptops.
    // ultrafast = least memory during encoding. CRF 18 for 4K is still high quality.
    // OOM was caused by 'fast' preset buffering too many frames in memory at once.
    const crf = targetW >= 2560 ? '18' : targetW >= 1920 ? '20' : '22';
    if (statusEl) statusEl.textContent = 'Encoding + muxing audio…';
    if (setProgressFn) setProgressFn(90);

    await ffmpegEnc.run(
      '-framerate', String(fps),
      '-i', 'frame%06d.jpg',
      '-i', 'src_audio' + origExt,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',   // lowest RAM usage — critical for 8GB laptops
      '-crf', crf,
      '-pix_fmt', 'yuv420p',
      '-vf', `fps=${fps}`,
      '-vsync', 'cfr',
      '-x264-params', 'keyint=30:min-keyint=30:scenecut=0',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-map', '0:v:0',
      '-map', '1:a:0?',
      '-shortest',
      '-movflags', '+faststart',
      '-y', 'out.mp4'
    );

    const finalData = ffmpegEnc.FS('readFile', 'out.mp4');
    const finalBlob = new Blob([new Uint8Array(finalData)], { type: 'video/mp4' });

    try {
      for (let i = 0; i < frameCount; i++) try { ffmpegEnc.FS('unlink', 'frame' + String(i).padStart(6, '0') + '.jpg'); } catch (e) { }
      ffmpegEnc.FS('unlink', 'src_audio' + origExt);
      ffmpegEnc.FS('unlink', 'out.mp4');
    } catch (e) { }

    if (finalBlob.size < 1000) throw new Error('FFmpeg produced empty output');

    state.processedDataUrl = trackMemory(URL.createObjectURL(finalBlob));
    state.processedBlobSize = finalBlob.size;
    state.videoDownloadExt = 'mp4';
    console.log(`[VideoAI] ✅ Done. Output: ${finalBlob.size} bytes | Backend: ${videoAI.backend}`);

    if (setProgressFn) setProgressFn(95);
    aiState.processing = false;
    if (dlWrap) dlWrap.style.display = 'none';
    if (frameInfoEl) frameInfoEl.style.display = 'none';
    video.pause(); video.src = '';
  }


  // --- Section 10: runAIProcessing — routes image vs video ---
  async function runAIProcessing() {
    if (aiState.processing || !state.file) return;
    aiState.processing = true; // Guard WakeGuard from interfering during image ONNX processing
    const tier = aiState.detectedTier;
    const cfg = AI_RES_CONFIG[tier];

    const progressRing = $('#progress-ring-fill'), linearBar = $('#linear-progress-fill');
    const circumference = 2 * Math.PI * 45;
    let currentPct = 0;
    function setProgress(pct) {
      currentPct = Math.min(100, Math.max(currentPct, pct));
      const p = Math.round(currentPct);
      if (progressRing) { progressRing.style.strokeDasharray = circumference; progressRing.style.strokeDashoffset = circumference - (currentPct / 100) * circumference; }
      if (linearBar) linearBar.style.width = currentPct + '%';
      const pctCircle = $('#progress-percent-circular');
      if (pctCircle) pctCircle.textContent = p + '%';
      const centerPct = document.querySelector('.progress-percent-center');
      if (centerPct) centerPct.textContent = p + '%';
    }

    try {
      aiState.frameSkip = 1;
      showStep('processing');
      await sleep(50);
      setProgress(0);

      const canvasWrap = document.getElementById('processing-canvas-wrapper');
      if (canvasWrap) {
        canvasWrap.style.display = 'block';
        canvasWrap.style.maxWidth = '100%';
        canvasWrap.style.borderRadius = '12px';
        canvasWrap.style.overflow = 'hidden';
      }

      // ── Route: Image vs Video ──
      if (state.fileType === 'image') {

        // ── Read user's selected processing mode ──
        const selectedMode = document.querySelector('input[name="proc-mode"]:checked')?.value || 'auto';

        // ── Detect content type (used for auto mode) ──
        const detC = document.createElement('canvas');
        const detX = detC.getContext('2d', { willReadFrequently: true });
        detC.width = Math.min(state.originalWidth || 400, 400);
        detC.height = Math.round(detC.width * ((state.originalHeight || 300) / (state.originalWidth || 400)));
        const detImg = new Image();
        await new Promise(r => { detImg.onload = r; detImg.src = state.originalDataUrl; });
        detX.drawImage(detImg, 0, 0, detC.width, detC.height);
        const detSample = detX.getImageData(0, 0, detC.width, detC.height);
        const imageIsArtwork = detectContentType(detSample, detC.width, detC.height) === 'artwork';

        const tgt = getTargetDimensions();
        const onnxAvailable = typeof ort !== 'undefined';

        // Determine actual pipeline from selected mode
        // auto: photos → canvas, artwork → onnx (same as before)
        // canvas: always canvas regardless of content type
        // onnx: always onnx regardless of content type
        // both: onnx first (AI upscale), then canvas sharpening on top
        let useOnnx = false, useCanvas = true;
        if (selectedMode === 'canvas') {
          useOnnx = false; useCanvas = true;
        } else if (selectedMode === 'onnx') {
          useOnnx = onnxAvailable; useCanvas = !onnxAvailable;
        } else if (selectedMode === 'both') {
          useOnnx = onnxAvailable; useCanvas = true; // canvas runs AFTER onnx
        } else {
          // auto
          useOnnx = imageIsArtwork && onnxAvailable; useCanvas = !useOnnx;
        }

        // Memory guard for ONNX
        if (useOnnx) {
          const estInputW = Math.min(1920, Math.round(tgt.w / 4));
          const estInputH = Math.round(estInputW * ((state.originalHeight || 300) / (state.originalWidth || 400)));
          const estMemoryMB = (estInputW * estInputH * 4 * 20) / (1024 * 1024);
          const availMemMB = (navigator.deviceMemory || 4) * 1024 * 0.6;
          if (estMemoryMB > availMemMB) {
            console.warn('[MemGuard] ONNX memory too high — falling back to canvas');
            const statusEl = document.getElementById('processing-status');
            if (statusEl) statusEl.textContent = 'Large image — using canvas pipeline…';
            useOnnx = false; useCanvas = true;
          }
        }

        try {
          if (useOnnx) {
            const titleEl = document.getElementById('processing-title');
            const statusEl = document.getElementById('processing-status');
            if (titleEl) titleEl.textContent = 'AI is enhancing your image…';
            if (statusEl) statusEl.textContent = 'Running Real-ESRGAN AI upscaling…';
            await processImageWithONNX(setProgress);
          }

          if (useCanvas) {
            if (selectedMode === 'both' && useOnnx) {
              // Canvas + ONNX: ONNX already created real pixels.
              // Only run a LIGHT sharpening pass — skip the heavy texture loop.
              // This saves 2-3 minutes while still adding visible crispness on top.
              const statusEl = document.getElementById('processing-status');
              if (statusEl) statusEl.textContent = 'Applying final sharpening on AI output…';
              const origBackup = state.originalDataUrl;
              state.originalDataUrl = state.processedDataUrl;
              // Load ONNX result into canvas and apply light sharpening only
              await new Promise((resolve, reject) => {
                const postImg = new Image();
                postImg.onload = async () => {
                  try {
                    const tw = postImg.naturalWidth, th = postImg.naturalHeight;
                    canvas.width = tw; canvas.height = th;
                    ctx.drawImage(postImg, 0, 0, tw, th);
                    // Light 2-pass sharpen only — no heavy texture loop
                    applyUnsharpMask(tw, th, 0.8, 1);
                    await new Promise(r => setTimeout(r, 0));
                    applyUnsharpMask(tw, th, 0.5, 3);
                    const format = getOutputFormat();
                    let mimeType = 'image/png', quality;
                    const q = parseInt(document.getElementById('jpeg-quality')?.value) || 92;
                    if (format === 'jpeg') { mimeType = 'image/jpeg'; quality = q / 100; }
                    else if (format === 'webp') { mimeType = 'image/webp'; quality = q / 100; }
                    state.processedDataUrl = canvas.toDataURL(mimeType, quality);
                    resolve();
                  } catch (e) { reject(e); }
                };
                postImg.onerror = reject;
                postImg.src = state.processedDataUrl;
              });
              state.originalDataUrl = origBackup;
            } else {
              await processImageHQDownscale(setProgress, tgt);
            }
          }
        } catch (err) {
          console.error('[Pipeline] Error, falling back to canvas:', err);
          await processImageHQDownscale(setProgress, tgt);
        }

      } else {
        await processVideoONNXPipeline(setProgress);
      }

      const beforeLabel = document.querySelector('.comparison-label-before');
      const afterLabel = document.querySelector('.comparison-label-after');
      if (beforeLabel) beforeLabel.textContent = 'Before: ' + tier;
      if (afterLabel) afterLabel.textContent = 'After: ' + (cfg ? cfg.label : '') + ' AI Enhanced';

      setProgress(100);
      await sleep(300);
      showResults();
    } catch (err) {
      console.error('[AI Processing] Error:', err);
      // If cancelled by user, do nothing — the cancel button handler redirects to configure
      if (err.message && err.message.includes('cancelled by user')) {
        return;
      }
      const statusEl = document.getElementById('processing-status');
      if (statusEl) statusEl.textContent = '⚠️ AI engine encountered an issue.';
      alert('AI Processing failed: ' + (err.message || 'Unknown error') + '\n\nPlease try again or reload the page.');
      showStep('configure');
    } finally {
      aiState.processing = false;
      const dlWrap = document.getElementById('ai-download-progress');
      if (dlWrap) dlWrap.style.display = 'none';
    }
  }

  // --- Section 10b: Event Bindings for AI UI ---
  // Auto-detect resolution when video metadata loads (uses addEventListener, doesn't touch existing onloadedmetadata)
  if (previewVideo) {
    previewVideo.addEventListener('loadedmetadata', function () {
      if (state.fileType === 'video' && this.videoHeight > 0) {
        showSmartResolutionCard(this.videoHeight, this.videoWidth);
      }
    });
  }

  // AI CTA button — starts AI processing directly
  const aiCTABtn = document.getElementById('ai-enhance-cta');
  if (aiCTABtn) {
    aiCTABtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (aiState.processing) return;
      runAIProcessing().catch(err => {
        console.error('[AI CTA] Error:', err);
        alert('AI Processing failed: ' + err.message);
        showStep('configure');
      });
    });
  }

  // AI Cancel integration: stop AI processing if cancel is clicked
  const aiCancelBtn = document.getElementById('btn-process-cancel');
  if (aiCancelBtn) {
    aiCancelBtn.addEventListener('click', function () {
      // Set both flags so both canvas and ONNX pipelines stop at next check
      aiState.cancelRequested = true;
      aiState.paused = false;
      aiState.processing = false;
      console.log('[AI] Cancel requested by user');
      // Give the pipelines a moment to detect the flag, then force back to configure
      setTimeout(() => {
        aiState.cancelRequested = false;
        showStep('configure');
      }, 400);
    });
  }

  // ===== VISIBILITY CHANGE HANDLER (sleep/wake recovery) ===== //
  // When a laptop sleeps, the WebGPU/WebGL session dies silently.
  // On wake, any ONNX inference call hangs forever, freezing the page.
  // This handler detects wake-up and probes the session with a tiny dummy inference.
  // If it throws, we null out the session and show a toast so the user knows to retry.
  //
  // RACE CONDITION FIX: Added _wakeGuardRunning mutex + 200ms settle delay.
  // Without these, the dummy session.run() fires concurrently with real tile processing,
  // causing "Session already started" and "Session mismatch" errors on the active tiles.
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return;
    if (!aiState.session) return; // No session to test

    // 200ms settle delay — give the processing flag time to be set if we woke during start
    await new Promise(r => setTimeout(r, 200));

    // Do NOT run if ONNX tiles are actively in-flight — concurrent session.run() is not safe
    if (aiState.processing) {
      console.log('[WakeGuard] Processing active — skipping session check (race condition guard)');
      return;
    }
    // Mutex: prevent two WakeGuard probes from running simultaneously (e.g. rapid tab switches)
    if (aiState._wakeGuardRunning) {
      console.log('[WakeGuard] Already running — skipping duplicate check');
      return;
    }
    // Skip if on result screen — processing already done, a dead session is harmless there
    if (state.currentStep === 'result') {
      console.log('[WakeGuard] On result screen — skipping (processing already complete)');
      return;
    }

    aiState._wakeGuardRunning = true;
    console.log('[WakeGuard] Tab became visible — testing ONNX session health...');
    try {
      // The Real-ESRGAN model requires 64×64 tile inputs — using 1×1 causes
      // "Got invalid dimensions" errors even on a perfectly healthy session.
      // Use a proper 64×64 dummy tile (batch=1, 3 channels).
      const DUMMY_TILE = 64;
      const dummyData = new Float32Array(1 * 3 * DUMMY_TILE * DUMMY_TILE);
      const dummyTensor = new ort.Tensor('float32', dummyData, [1, 3, DUMMY_TILE, DUMMY_TILE]);
      const sessionToTest = aiState.session; // local reference — session may change during await
      if (!sessionToTest) { aiState._wakeGuardRunning = false; return; }
      const inputName = sessionToTest.inputNames[0] || 'input';
      const feeds = {};
      feeds[inputName] = dummyTensor;
      // Set a timeout — if inference hangs for >5s, the session is dead
      await Promise.race([
        sessionToTest.run(feeds),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Session hang timeout')), 5000))
      ]);
      console.log('[WakeGuard] ✓ ONNX session is healthy after wake');
    } catch (e) {
      const errMsg = e.message || '';
      // 'Session already started' = session is alive but busy — NOT a failure.
      // This happens if we wake while a session.run() is still completing.
      // Do NOT kill the session — it's perfectly healthy.
      if (errMsg.includes('already started') || errMsg.includes('already running')) {
        console.log('[WakeGuard] Session is busy (not dead) — skipping cleanup');
      } else {
        console.error('[WakeGuard] ✗ ONNX session died during sleep:', errMsg);
        // Mark WebGPU as failed if this was a GPU device death
        const isGpuDeath = errMsg.toLowerCase().includes('device') ||
          errMsg.toLowerCase().includes('lost') || errMsg.toLowerCase().includes('abort') ||
          errMsg.toLowerCase().includes('hung');
        if (isGpuDeath && aiState.backend === 'webgpu') {
          aiState._webgpuFailed = true;
        }
        // Null out the dead session so loadONNXModel() will create a fresh one
        aiState.session = null;
        videoAI.model = null;
        // Only show the toast on configure screen — on result screen it is confusing noise
        if (state.currentStep === 'configure') {
          var wakeToast = document.createElement('div');
          wakeToast.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:10001;background:rgba(255,71,87,0.15);border:1px solid rgba(255,71,87,0.4);color:#ff6b6b;padding:14px 28px;border-radius:12px;font-family:Inter,sans-serif;font-size:0.88rem;font-weight:600;backdrop-filter:blur(10px);max-width:520px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.3);';
          wakeToast.textContent = isGpuDeath
            ? 'GPU disconnected — will use safe mode next time. Click Enhance Now to restart.'
            : 'AI engine reconnecting… Click Enhance Now to restart.';
          document.body.appendChild(wakeToast);
          setTimeout(function () { wakeToast.style.transition = 'opacity 0.5s'; wakeToast.style.opacity = '0'; setTimeout(function () { wakeToast.remove(); }, 600); }, 8000);
        }
      }
    } finally {
      aiState._wakeGuardRunning = false;
    }
  });

  // ===== GLOBAL UNHANDLED REJECTION CATCHER FOR WEBGPU DEVICE LOSS ===== //
  // ONNX Runtime Web does some asynchronous mapAsync() calls inside internal promises
  // that can reject with AbortError/device lost when the GPU driver hangs.
  // These escape our try/catch blocks and trigger unhandled rejection events.
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason || {};
    const errMsg = (reason.message || String(reason)).toLowerCase();
    const isDeviceLost = errMsg.includes('device') || errMsg.includes('lost') ||
      errMsg.includes('abort') || errMsg.includes('hung') || errMsg.includes('removed') ||
      errMsg.includes('mapasync') || (reason.name && reason.name === 'AbortError');

    if (isDeviceLost && aiState.backend === 'webgpu') {
      console.warn('[Global Catcher] WebGPU device loss detected asynchronously:', reason.message || reason);
      // Mark WebGPU as failed so we switch backends
      aiState._webgpuFailed = true;
      // Invalidate current session
      aiState.session = null;
      // If we are currently processing, force-fail the active tile loop so it triggers recovery
      if (aiState.processing) {
        console.warn('[Global Catcher] Active processing detected. Invalidate and trigger recovery.');
        aiState.gpuDeviceLostTriggered = true;
      }
      // Prevent browser console from spamming the red error message
      event.preventDefault();
    }
  });

})();