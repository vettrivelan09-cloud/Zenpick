/* =====================================================================
 * faceMask.js — MediaPipe FaceLandmarker Face-Masked Filtering Module
 * =====================================================================
 *
 * This module provides precise face-contour masking using MediaPipe
 * FaceLandmarker (478 landmarks). Instead of bounding-box ellipses,
 * it draws the EXACT face oval polygon and subtracts eyes + mouth
 * interior so filters only apply to facial skin.
 *
 * USAGE:
 *   1. <script type="module"> or import from this file
 *   2. Call `await FaceMaskModule.init()` once on page load
 *   3. Call `await FaceMaskModule.detectAndCache(imageElement, w, h)` on upload
 *   4. Use `FaceMaskModule.getCachedMask()` for subsequent slider changes
 *   5. Use `FaceMaskModule.applyMaskedFilter(origCanvas, filterFn)` to apply
 *      any filter only to the face skin region
 *
 * HOOK POINTS (marked with ★):
 *   ★ Call detectAndCache() in your handleFile/image-upload function
 *   ★ Replace detectFaceBounds + buildFaceRegionMask with getCachedMask()
 *   ★ Wrap your filter functions with applyMaskedFilter()
 * ===================================================================== */

(function () {
  'use strict';

  // ── MediaPipe CDN configuration ──
  const MP_VERSION = '0.10.14';
  const MP_CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}`;
  const MP_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
  const MP_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

  // Selfie Multiclass segmenter — classifies EVERY pixel into:
  //   0 = background, 1 = hair, 2 = body-skin, 3 = face-skin, 4 = clothes, 5 = other/accessories
  // This is what actually separates "skin" from "dress/saree/jewelry/hair" instead of
  // guessing from color alone, which is why the old YCbCr-only approach leaked onto fabric.
  const MP_SEGMENTER_MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite';
  const SEG_CATEGORY = { BACKGROUND: 0, HAIR: 1, BODY_SKIN: 2, FACE_SKIN: 3, CLOTHES: 4, OTHER: 5 };

  // ── Face landmark index arrays ──
  // These define the polygons we draw on the mask canvas

  // Face oval contour — ordered clockwise for a closed polygon
  const FACE_OVAL = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
    397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
    172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
  ];

  // Left eye contour (viewer's right) — subtracted from mask
  const LEFT_EYE = [
    362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387,
    386, 385, 384, 398
  ];

  // Right eye contour (viewer's left) — subtracted from mask
  const RIGHT_EYE = [
    33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158,
    159, 160, 161, 246
  ];

  // Lips/mouth contour — subtracted from mask
  const LIPS = [
    61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291,
    308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 185,
    40, 39, 37, 0, 267, 269, 270, 409, 415, 310, 311,
    312, 13, 82, 81, 42, 183, 78
  ];

  // Left eyebrow — subtracted from mask to protect eyebrow area
  const LEFT_EYEBROW = [276, 283, 282, 295, 285, 300, 293, 334, 296, 336];

  // Right eyebrow — subtracted from mask to protect eyebrow area
  const RIGHT_EYEBROW = [46, 53, 52, 65, 55, 70, 63, 105, 66, 107];

  // ── Module state ──
  let _faceLandmarker = null;
  let _imageSegmenter = null;
  let _isInitializing = false;
  let _initPromise = null;
  let _contextLost = false;

  // Cache: stores { faceMask: Float32Array, skinMask: Float32Array, width, height, faceCount }
  let _cachedMask = null;
  let _cachedSourceId = null;

  // ── WebGL context-loss recovery ──
  // Browsers can discard a backgrounded tab's WebGL context to reclaim GPU memory
  // (e.g. switching to another tab for a while). When that happens, MediaPipe's
  // GPU pipeline is silently dead — .detect()/.segment() keep "succeeding" but
  // return empty results instead of throwing, so without this listener the app
  // would quietly report "no face / no skin" forever after a context loss.
  // This forces a full model rebuild the next time detection actually runs.
  window.addEventListener('webglcontextlost', () => {
    console.warn('[FaceMask] WebGL context lost — models will be rebuilt before next detection');
    _contextLost = true;
    _faceLandmarker = null;
    _imageSegmenter = null;
    _initPromise = null;
    _isInitializing = false;
    _cachedMask = null;
    _cachedSourceId = null;
  }, true);

  // ── Initialization ──
  // Lazy-loads MediaPipe WASM + FaceLandmarker model (~250ms).
  async function init() {
    if (_faceLandmarker && !_contextLost) return true;
    if (_isInitializing) return _initPromise;

    _contextLost = false;
    _isInitializing = true;
    _initPromise = _doInit();
    const result = await _initPromise;
    _isInitializing = false;
    return result;
  }

  async function _doInit() {
    try {
      console.log('[FaceMask] Loading MediaPipe FaceLandmarker...');
      const startTime = performance.now();

      // Dynamically import the MediaPipe tasks-vision module
      const { FilesetResolver, FaceLandmarker, ImageSegmenter } = await import(
        MP_CDN
      );

      const vision = await FilesetResolver.forVisionTasks(MP_WASM);

      // Create FaceLandmarker
      _faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MP_MODEL,
          delegate: 'CPU'
        },
        runningMode: 'IMAGE',
        numFaces: 20, // group photos can have many faces — 5 was too low
        minFaceDetectionConfidence: 0.3, // default 0.5 misses small/dim faces in group & low-light shots
        minFacePresenceConfidence: 0.3,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false
      });

      const elapsed = Math.round(performance.now() - startTime);
      console.log(`[FaceMask] MediaPipe FaceLandmarker ready (${elapsed}ms)`);

      // Yield to browser between heavy steps so animations/UI stay responsive
      await new Promise(r => setTimeout(r, 0));

      // Create ImageSegmenter (selfie multiclass) — this is the real skin/hair/clothes
      // scanner. It's loaded best-effort: if it fails, the module falls back to the
      // legacy color-heuristic skin mask so the app keeps working either way.
      try {
        const segStart = performance.now();
        _imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MP_SEGMENTER_MODEL,
            delegate: 'CPU'
          },
          runningMode: 'IMAGE',
          outputCategoryMask: true,
          outputConfidenceMasks: false
        });
        console.log(`[FaceMask] MediaPipe ImageSegmenter (skin scanner) ready (${Math.round(performance.now() - segStart)}ms)`);
      } catch (segErr) {
        console.warn('[FaceMask] ImageSegmenter unavailable — will fall back to color-based skin detection:', segErr?.message || segErr);
        _imageSegmenter = null;
      }

      // ── Fast Immediate Warm-up ──
      // Since we are using CPU delegate, there is no WebGL shader compilation,
      // so we can warm up the engines immediately in the background in less than 50ms
      // without blocking the browser thread.
      const warmCanvas = document.createElement('canvas');
      warmCanvas.width = 32;
      warmCanvas.height = 32;
      const warmCtx = warmCanvas.getContext('2d');
      warmCtx.fillStyle = '#808080';
      warmCtx.fillRect(0, 0, 32, 32);

      if (_faceLandmarker) {
        try {
          const t = performance.now();
          _faceLandmarker.detect(warmCanvas);
          console.log(`[FaceMask] CPU FaceLandmarker warm-up done (${Math.round(performance.now() - t)}ms)`);
        } catch (e) { /* expected — blank canvas */ }
      }

      if (_imageSegmenter) {
        let warmSeg = null;
        try {
          const t = performance.now();
          warmSeg = _imageSegmenter.segment(warmCanvas);
          console.log(`[FaceMask] CPU ImageSegmenter warm-up done (${Math.round(performance.now() - t)}ms)`);
        } catch (e) { /* expected */ } finally {
          if (warmSeg && warmSeg.categoryMask && typeof warmSeg.categoryMask.close === 'function') warmSeg.categoryMask.close();
          if (warmSeg && typeof warmSeg.close === 'function') warmSeg.close();
        }
      }

      return true;
    } catch (e) {
      console.error('[FaceMask] Failed to initialize MediaPipe:', e);
      _faceLandmarker = null;
      return false;
    }
  }

  // ── Face Detection & Segmentation Mask Building ──
  let _activeDetectionPromise = null;
  let _activeSourceId = null;

  // Fast CPU-based Float32 box blur (2ms execution, no canvas overhead or GPU stalls)
  function _fastFloat32BoxBlur(src, w, h, r) {
    if (r <= 0) return new Float32Array(src);
    const tmp = new Float32Array(w * h);
    const dst = new Float32Array(w * h);

    // 1D Horizontal Pass
    for (let y = 0; y < h; y++) {
      let sum = 0;
      const rowOffset = y * w;
      for (let i = -r; i <= r; i++) {
        const xi = Math.min(Math.max(i, 0), w - 1);
        sum += src[rowOffset + xi];
      }
      for (let x = 0; x < w; x++) {
        tmp[rowOffset + x] = sum / (2 * r + 1);
        const removeX = Math.max(x - r, 0);
        const addX = Math.min(x + r + 1, w - 1);
        sum += src[rowOffset + addX] - src[rowOffset + removeX];
      }
    }

    // 1D Vertical Pass
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let i = -r; i <= r; i++) {
        const yi = Math.min(Math.max(i, 0), h - 1);
        sum += tmp[yi * w + x];
      }
      for (let y = 0; y < h; y++) {
        dst[y * w + x] = sum / (2 * r + 1);
        const removeY = Math.max(y - r, 0);
        const addY = Math.min(y + r + 1, h - 1);
        sum += tmp[addY * w + x] - tmp[removeY * w + x];
      }
    }
    return dst;
  }

  // Call this ONCE when a new image is uploaded.
  // Caches the face and skin masks.
  async function detectAndCache(imageSource, w, h, sourceId) {
    if (sourceId && sourceId === _cachedSourceId && _cachedMask) {
      return { faceMask: _cachedMask.faceMask, skinMask: _cachedMask.skinMask, faceCount: _cachedMask.faceCount };
    }

    if (sourceId && sourceId === _activeSourceId && _activeDetectionPromise) {
      return _activeDetectionPromise;
    }

    _activeSourceId = sourceId;
    _activeDetectionPromise = _doDetectAndCache(imageSource, w, h, sourceId);
    try {
      const res = await _activeDetectionPromise;
      return res;
    } finally {
      _activeDetectionPromise = null;
      _activeSourceId = null;
    }
  }

  async function _doDetectAndCache(imageSource, w, h, sourceId) {
    const ready = await init();
    if (!ready || !_faceLandmarker) {
      console.warn('[FaceMask] MediaPipe FaceLandmarker not available — falling back');
      _cachedMask = null;
      _cachedSourceId = null;
      return null;
    }

    try {
      console.log(`[FaceMask] Run face & skin detection on ${w}×${h} image...`);
      const startTime = performance.now();

      // PERF FIX: Downsample images for landmark generation.
      // MediaPipe face DETECTOR benefits from more external resolution — shrinking a group
      // photo down to 384px can leave each individual face only ~20-30px wide,
      // which is too small for reliable detection. 640px keeps faces large enough
      // in multi-person shots while still being cheap to process (<1s even on
      // modest hardware).
      let detSource = imageSource;
      let detW = w;
      let detH = h;
      const MAX_DET_DIM = 640;

      if (w > MAX_DET_DIM || h > MAX_DET_DIM) {
        if (w >= h) {
          detW = MAX_DET_DIM;
          detH = Math.round((h * MAX_DET_DIM) / w);
        } else {
          detH = MAX_DET_DIM;
          detW = Math.round((w * MAX_DET_DIM) / h);
        }
        const detCanvas = document.createElement('canvas');
        detCanvas.width = detW;
        detCanvas.height = detH;
        const detCtx = detCanvas.getContext('2d', { willReadFrequently: true });
        detCtx.drawImage(imageSource, 0, 0, detW, detH);
        detSource = detCanvas;
      }

      await new Promise(r => setTimeout(r, 0));

      // 1. Run Face Landmarker (Executes in ~30ms)
      const landmarkerResult = _faceLandmarker.detect(detSource);

      const faceCount = (landmarkerResult && landmarkerResult.faceLandmarks) ? landmarkerResult.faceLandmarks.length : 0;
      console.log(`[FaceMask] FaceLandmarker detected ${faceCount} face(s)`);

      // We build the actual skin & face masks at a lower resolution (e.g. max 256px)
      // because the segmentation model's native resolution is 256x256 anyway,
      // and a feathered/blurred mask does not benefit from 640px resolution.
      // This reduces pixel loop counts by 6x and speeds up mask creation to a few milliseconds.
      const MAX_MASK_DIM = 256;
      let maskW = w;
      let maskH = h;
      if (w > MAX_MASK_DIM || h > MAX_MASK_DIM) {
        if (w >= h) {
          maskW = MAX_MASK_DIM;
          maskH = Math.round((h * MAX_MASK_DIM) / w);
        } else {
          maskH = MAX_MASK_DIM;
          maskW = Math.round((w * MAX_MASK_DIM) / h);
        }
      }

      // Create a small version of the image specifically for the segmenter and legacy fallback
      let segSource = detSource;
      if (detW !== maskW || detH !== maskH) {
        const segCanvas = document.createElement('canvas');
        segCanvas.width = maskW;
        segCanvas.height = maskH;
        const segCtx = segCanvas.getContext('2d', { willReadFrequently: true });
        segCtx.drawImage(detSource, 0, 0, maskW, maskH);
        segSource = segCanvas;
      }

      const faceOvalUnblurred = new Float32Array(maskW * maskH);
      const excludeFeaturesUnblurred = new Float32Array(maskW * maskH); // eyes/lips/eyebrows — never smoothed
      const headNeckRoi = new Uint8Array(maskW * maskH); // Geofence mask (legacy fallback only)

      if (faceCount > 0) {
        _buildFaceOvalPolygons(landmarkerResult.faceLandmarks, maskW, maskH, faceOvalUnblurred, excludeFeaturesUnblurred);

        // Build Head + Neck spatial Geofence bounds
        for (const landmarks of landmarkerResult.faceLandmarks) {
          let minX = maskW, maxX = 0, minY = maskH, maxY = 0;
          for (const pt of landmarks) {
            const px = pt.x * maskW;
            const py = pt.y * maskH;
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
          }
          const faceW = maxX - minX;
          const faceH = maxY - minY;
          // Extend box: top 0.2 faceH, sides 0.25 faceW, bottom 0.5 faceH (covers neck to collarbone only)
          const roiMinX = Math.max(0, Math.floor(minX - faceW * 0.25));
          const roiMaxX = Math.min(maskW - 1, Math.ceil(maxX + faceW * 0.25));
          const roiMinY = Math.max(0, Math.floor(minY - faceH * 0.20));
          const roiMaxY = Math.min(maskH - 1, Math.ceil(maxY + faceH * 0.50)); // Strict cutoff below neck

          for (let ry = roiMinY; ry <= roiMaxY; ry++) {
            const rowOff = ry * maskW;
            for (let rx = roiMinX; rx <= roiMaxX; rx++) {
              headNeckRoi[rowOff + rx] = 1;
            }
          }
        }
      }

      // 2. Real skin/hair/clothes scan via MediaPipe Selfie-Multiclass segmenter.
      // This is the actual fix for smoothing leaking onto sarees/jewelry/hair:
      // instead of guessing "skin" from color alone, every pixel is classified
      // into background / hair / body-skin / face-skin / clothes / other.
      let skinResult = _runImageSegmenterSkinMask(segSource, maskW, maskH);
      let usedSegmenter = !!skinResult;

      let skinMaskUnblurred, skinCount;
      if (skinResult) {
        skinMaskUnblurred = skinResult.skinMaskUnblurred;
        skinCount = skinResult.skinCount;
      } else {
        // Fallback path: segmenter not available (e.g. offline/model failed to load).
        // Use the old geofenced color heuristic so the app still functions, just
        // less precisely (head/neck box only, color+gradient based).
        const tempC = document.createElement('canvas');
        tempC.width = maskW;
        tempC.height = maskH;
        const tempCtx = tempC.getContext('2d', { willReadFrequently: true });
        tempCtx.drawImage(segSource, 0, 0, maskW, maskH);
        const pixels = tempCtx.getImageData(0, 0, maskW, maskH).data;

        const legacy = _legacyColorSkinMask(pixels, maskW, maskH, faceCount, headNeckRoi);
        skinMaskUnblurred = legacy.skinMaskUnblurred;
        skinCount = legacy.skinCount;
      }

      let faceCountPixels = 0;
      for (let i = 0; i < maskW * maskH; i++) {
        if (faceOvalUnblurred[i] > 0.5) faceCountPixels++;
      }

      // 4. Union skin mask with face-oval mask, then subtract eyes/lips/eyebrows —
      // the segmenter's face-skin category doesn't know to exclude those, so we
      // carve them back out using the same landmark regions the face mask uses.
      const unionMaskUnblurred = new Float32Array(maskW * maskH);
      let combinedCount = 0;
      for (let i = 0; i < maskW * maskH; i++) {
        let v = Math.max(skinMaskUnblurred[i], faceOvalUnblurred[i]);
        v = Math.max(0, v - excludeFeaturesUnblurred[i]);
        unionMaskUnblurred[i] = v;
        if (v > 0.5) {
          combinedCount++;
        }
      }

      console.log(`[FaceMask] Skin detection source: ${usedSegmenter ? 'ImageSegmenter (selfie-multiclass, full-body)' : 'legacy color heuristic (head/neck geofence, fallback)'}`);

      // 5. Fast Float32 Box Blur for feathering (2ms, zero GPU stalls)
      // Since mask resolution is scaled down from 640px to 256px (approx 2.5x reduction),
      // we also scale down the blur radius accordingly to keep the same physical feather size.
      const blurRadius = Math.max(3, Math.round(8 * (maskW / detW)));
      const faceMask = _fastFloat32BoxBlur(faceOvalUnblurred, maskW, maskH, blurRadius);
      const skinMask = _fastFloat32BoxBlur(unionMaskUnblurred, maskW, maskH, blurRadius);

      const totalPixels = maskW * maskH;
      const facePct = ((faceCountPixels / totalPixels) * 100).toFixed(1);
      const skinPct = ((skinCount / totalPixels) * 100).toFixed(1);
      const combinedPct = ((combinedCount / totalPixels) * 100).toFixed(1);
      console.log(`[FaceMask] Mask coverage stats (${maskW}x${maskH}):`);
      console.log(` - Face-only coverage: ${facePct}% (${faceCountPixels} pixels)`);
      console.log(` - Skin-only (${usedSegmenter ? 'segmenter' : 'geofenced color'}) coverage: ${skinPct}% (${skinCount} pixels)`);
      console.log(` - Combined skin mask coverage: ${combinedPct}% (${combinedCount} pixels)`);

      const elapsed = Math.round(performance.now() - startTime);
      console.log(`[FaceMask] Mask detection & building complete in ${elapsed}ms`);

      _cachedMask = {
        faceMask,
        skinMask,
        width: maskW,
        height: maskH,
        nativeW: w,
        nativeH: h,
        faceCount
      };
      _cachedSourceId = sourceId || null;

      return { faceMask, skinMask, faceCount };
    } catch (e) {
      console.error('[FaceMask] Detection/segmentation error:', e);
      _cachedMask = null;
      _cachedSourceId = null;
      return null;
    }
  }

  // Draw unblurred face oval mask.
  // @param {Float32Array} [excludeArray] - optional: if provided, filled with the
  //   eyes+lips+eyebrows regions that were carved OUT of the oval. Used so the same
  //   "never smooth these" regions can also be subtracted from the segmenter-based
  //   skin mask (which doesn't know about eyes/lips on its own).
  function _buildFaceOvalPolygons(allFaceLandmarks, w, h, targetArray, excludeArray) {
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });

    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, w, h);

    let excludeCtx = null;
    if (excludeArray) {
      const excludeCanvas = document.createElement('canvas');
      excludeCanvas.width = w;
      excludeCanvas.height = h;
      excludeCtx = excludeCanvas.getContext('2d', { willReadFrequently: true });
      excludeCtx.fillStyle = 'black';
      excludeCtx.fillRect(0, 0, w, h);
      excludeCtx._canvasRef = excludeCanvas;
    }

    for (const landmarks of allFaceLandmarks) {
      maskCtx.fillStyle = 'white';
      maskCtx.beginPath();
      _drawLandmarkPolygon(maskCtx, landmarks, FACE_OVAL, w, h);
      maskCtx.fill();

      maskCtx.globalCompositeOperation = 'destination-out';
      maskCtx.fillStyle = 'white';

      const featurePolys = [
        [RIGHT_EYE, 1.3], [LEFT_EYE, 1.3], [LIPS, 1.15],
        [RIGHT_EYEBROW, 1.4], [LEFT_EYEBROW, 1.4]
      ];

      for (const [poly, scale] of featurePolys) {
        maskCtx.beginPath();
        _drawExpandedLandmarkPolygon(maskCtx, landmarks, poly, w, h, scale);
        maskCtx.fill();

        if (excludeCtx) {
          excludeCtx.fillStyle = 'white';
          excludeCtx.beginPath();
          _drawExpandedLandmarkPolygon(excludeCtx, landmarks, poly, w, h, scale);
          excludeCtx.fill();
        }
      }

      maskCtx.globalCompositeOperation = 'source-over';
    }

    const imgData = maskCtx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < w * h; i++) {
      targetArray[i] = data[i * 4] / 255;
    }

    if (excludeCtx) {
      const exImgData = excludeCtx.getImageData(0, 0, w, h);
      const exData = exImgData.data;
      for (let i = 0; i < w * h; i++) {
        excludeArray[i] = exData[i * 4] / 255;
      }
    }
  }

  // ── Run the real skin/hair/clothes scanner (MediaPipe Selfie Multiclass) ──
  // Returns a Float32Array skin mask (1.0 = body-skin or face-skin category) or
  // null if the segmenter isn't loaded / the call fails, so callers can fall back.
  function _runImageSegmenterSkinMask(detSource, detW, detH) {
    if (!_imageSegmenter) return null;
    let segResult = null;
    let categoryMask = null;
    try {
      segResult = _imageSegmenter.segment(detSource);
      categoryMask = segResult && segResult.categoryMask;
      if (!categoryMask) return null;

      const catArray = categoryMask.getAsUint8Array();
      if (!catArray || catArray.length !== detW * detH) {
        console.warn('[FaceMask] Segmenter mask size mismatch — falling back to color heuristic');
        return null;
      }

      const skinMaskUnblurred = new Float32Array(detW * detH);
      let skinCount = 0;
      for (let i = 0; i < catArray.length; i++) {
        const cat = catArray[i];
        if (cat === SEG_CATEGORY.BODY_SKIN || cat === SEG_CATEGORY.FACE_SKIN) {
          skinMaskUnblurred[i] = 1.0;
          skinCount++;
        }
      }
      return { skinMaskUnblurred, skinCount };
    } catch (e) {
      console.warn('[FaceMask] ImageSegmenter run failed — falling back to color heuristic:', e?.message || e);
      return null;
    } finally {
      // MediaPipe masks/results hold WASM memory — must be released explicitly.
      if (categoryMask && typeof categoryMask.close === 'function') categoryMask.close();
      if (segResult && typeof segResult.close === 'function') segResult.close();
    }
  }

  // ── Legacy fallback: color/gradient heuristic skin detection ──
  // Only used if the MediaPipe ImageSegmenter model fails to load (e.g. offline).
  // Restricted to a head+neck geofence box since, unlike the segmenter, it can't
  // reliably tell skin from fabric anywhere else in the frame.
  function _legacyColorSkinMask(pixels, detW, detH, faceCount, headNeckRoi) {
    const skinMaskUnblurred = new Float32Array(detW * detH);
    let skinCount = 0;

    for (let y = 0; y < detH; y++) {
      for (let x = 0; x < detW; x++) {
        const idx = y * detW + x;

        // GEOFENCE RULE: If pixel is outside face + neck region when a face is detected, HARD EXCLUDE!
        if (faceCount > 0 && headNeckRoi[idx] === 0) {
          continue;
        }

        const pIdx = idx * 4;
        const r = pixels[pIdx];
        const g = pixels[pIdx + 1];
        const b = pixels[pIdx + 2];

        // YCbCr thresholds for human skin
        const Cb = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
        const Cr = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;
        const isSkinYCbCr = (Cr >= 135 && Cr <= 178 && Cb >= 85 && Cb <= 135 && r > g && r > b && (r - g) > 12);

        // Fabric / Sequin texture gradient check: fabric & beaded embroidery have high local edge gradient
        const rRight = (x < detW - 1) ? pixels[pIdx + 4] : r;
        const rDown = (y < detH - 1) ? pixels[pIdx + detW * 4] : r;
        const grad = Math.abs(r - rRight) + Math.abs(r - rDown);
        const isLowTexture = grad < 26; // High gradient (beads, fabric folds, jewelry) = excluded

        // HSV Saturation & Hue check (exclude gold silk, yellow saris, bright fabric)
        const maxRGB = Math.max(r, g, b);
        const minRGB = Math.min(r, g, b);
        const sat = maxRGB > 0 ? (maxRGB - minRGB) / maxRGB : 0;
        const isNotGoldFabric = sat < 0.60;

        if (isSkinYCbCr && isLowTexture && isNotGoldFabric) {
          skinMaskUnblurred[idx] = 1.0;
          skinCount++;
        }
      }
    }
    return { skinMaskUnblurred, skinCount };
  }

  function _drawLandmarkPolygon(ctx, landmarks, indices, w, h) {
    if (!landmarks || landmarks.length === 0 || !indices || indices.length === 0) return;
    ctx.beginPath();
    const firstIdx = indices[0];
    const pt0 = landmarks[firstIdx];
    ctx.moveTo(pt0.x * w, pt0.y * h);
    for (let i = 1; i < indices.length; i++) {
      const pt = landmarks[indices[i]];
      ctx.lineTo(pt.x * w, pt.y * h);
    }
    ctx.closePath();
  }

  function _drawExpandedLandmarkPolygon(ctx, landmarks, indices, w, h, scale) {
    if (!landmarks || landmarks.length === 0 || !indices || indices.length === 0) return;

    // Calculate centroid
    let sumX = 0;
    let sumY = 0;
    for (const idx of indices) {
      const pt = landmarks[idx];
      sumX += pt.x * w;
      sumY += pt.y * h;
    }
    const cx = sumX / indices.length;
    const cy = sumY / indices.length;

    ctx.beginPath();
    const pt0 = landmarks[indices[0]];
    const px0 = pt0.x * w;
    const py0 = pt0.y * h;
    ctx.moveTo(cx + (px0 - cx) * scale, cy + (py0 - cy) * scale);

    for (let i = 1; i < indices.length; i++) {
      const pt = landmarks[indices[i]];
      const px = pt.x * w;
      const py = pt.y * h;
      ctx.lineTo(cx + (px - cx) * scale, cy + (py - cy) * scale);
    }
    ctx.closePath();
  }

  function _applyCanvasBlur(canvas, w, h, radius) {
    const blurredCanvas = document.createElement('canvas');
    blurredCanvas.width = w;
    blurredCanvas.height = h;
    const ctx = blurredCanvas.getContext('2d');
    ctx.filter = `blur(${radius}px)`;
    ctx.drawImage(canvas, 0, 0);
    return blurredCanvas;
  }

  // Helper: Apply CSS blur to Float32Array
  function _applyBlurToFloatArray(floatArray, w, h, radius) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;
    for (let i = 0; i < w * h; i++) {
      const val = Math.round(floatArray[i] * 255);
      const idx = i * 4;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    const blurredCanvas = _applyCanvasBlur(canvas, w, h, radius);
    const blurredCtx = blurredCanvas.getContext('2d', { willReadFrequently: true });
    const blurredImgData = blurredCtx.getImageData(0, 0, w, h);
    const blurredData = blurredImgData.data;

    const blurredFloat = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      blurredFloat[i] = blurredData[i * 4] / 255;
    }
    return blurredFloat;
  }


  // ── Public API: Get cached mask ──
  // Returns the cached Float32Array mask or null if no face detected.
  // Use this in your slider-change handlers so detection doesn't re-run.
  //
  // @param {string} [type='face'] - 'face' for face-only, 'skin' for combined skin mask
  function getCachedMask(type = 'face') {
    if (!_cachedMask) return null;
    return (type === 'skin') ? _cachedMask.skinMask : _cachedMask.faceMask;
  }

  // Returns the cached mask info object { faceMask, skinMask, width, height, faceCount }
  function getCachedMaskInfo() {
    return _cachedMask || null;
  }

  // ── Check if a cached mask exists and is valid for given dimensions ──
  function hasCachedMask(w, h) {
    return _cachedMask && _cachedMask.width === w && _cachedMask.height === h;
  }

  // ── Clear the cached mask (call when switching images) ──
  function clearCache() {
    _cachedMask = null;
    _cachedSourceId = null;
    console.log('[FaceMask] Cache cleared');
  }

  // ── Apply a filter function ONLY to face-masked regions ──
  // This is the main compositing function. It:
  //   a. Renders the filtered result to an offscreen canvas
  //   b. Composites filtered + original using the mask as alpha
  //   c. Only filtered pixels show through where mask is white/opaque
  //
  // ★ HOOK POINT: Wrap your existing filter functions with this
  //
  // @param {CanvasRenderingContext2D} ctx - the working canvas context
  // @param {number} w - canvas width
  // @param {number} h - canvas height
  // @param {Function} filterFn - function(offscreenCtx, w, h) that applies the filter
  //                               to the offscreen canvas. It receives a context with
  //                               the SAME image data as ctx, and should modify it in-place.
  // @param {Float32Array} [mask] - optional mask override. If not provided, uses cached mask.
  function applyMaskedFilter(ctx, w, h, filterFn, mask) {
    const effectiveMask = mask || getCachedMask('face');

    if (!effectiveMask) {
      // No mask available — apply filter to entire image (fallback)
      console.warn('[FaceMask] No face mask available — applying filter globally');
      filterFn(ctx, w, h);
      return;
    }

    // Step 1: Save the original image data
    const originalData = ctx.getImageData(0, 0, w, h);
    const origPixels = new Uint8ClampedArray(originalData.data);

    // Step 2: Apply the filter to the canvas (in-place)
    filterFn(ctx, w, h);

    // Step 3: Read the filtered result
    const filteredData = ctx.getImageData(0, 0, w, h);
    const filtPixels = filteredData.data;

    // Step 4: Composite — blend filtered pixels with original using mask alpha
    for (let i = 0; i < w * h; i++) {
      const alpha = effectiveMask[i]; // 0.0 = original, 1.0 = fully filtered
      if (alpha < 0.01) {
        // Restore original pixel (mask is transparent here)
        filtPixels[i * 4] = origPixels[i * 4];
        filtPixels[i * 4 + 1] = origPixels[i * 4 + 1];
        filtPixels[i * 4 + 2] = origPixels[i * 4 + 2];
      } else if (alpha < 0.99) {
        // Blend: original * (1 - alpha) + filtered * alpha
        const inv = 1 - alpha;
        filtPixels[i * 4] = Math.round(origPixels[i * 4] * inv + filtPixels[i * 4] * alpha);
        filtPixels[i * 4 + 1] = Math.round(origPixels[i * 4 + 1] * inv + filtPixels[i * 4 + 1] * alpha);
        filtPixels[i * 4 + 2] = Math.round(origPixels[i * 4 + 2] * inv + filtPixels[i * 4 + 2] * alpha);
      }
      // else: alpha >= 0.99 → keep filtered pixel as-is
    }

    // Step 5: Write the composited result back
    ctx.putImageData(filteredData, 0, 0);
  }

  // ── Convenience: Apply masked filter to ImageData directly ──
  // For cases where you're working with raw pixel arrays instead of canvas contexts.
  //
  // @param {ImageData} imageData - the image data to modify
  // @param {number} w - width
  // @param {number} h - height  
  // @param {Function} filterFn - function(data, w, h) that modifies the Uint8ClampedArray
  // @param {Float32Array} [mask] - optional mask override
  function applyMaskedFilterToData(imageData, w, h, filterFn, mask) {
    const effectiveMask = mask || getCachedMask('face');

    if (!effectiveMask) {
      // No mask — apply globally
      filterFn(imageData.data, w, h);
      return;
    }

    // Save original pixels
    const origPixels = new Uint8ClampedArray(imageData.data);

    // Apply the filter in-place
    filterFn(imageData.data, w, h);

    // Composite with mask
    const d = imageData.data;
    for (let i = 0; i < w * h; i++) {
      const alpha = effectiveMask[i];
      if (alpha < 0.01) {
        d[i * 4] = origPixels[i * 4];
        d[i * 4 + 1] = origPixels[i * 4 + 1];
        d[i * 4 + 2] = origPixels[i * 4 + 2];
      } else if (alpha < 0.99) {
        const inv = 1 - alpha;
        d[i * 4] = Math.round(origPixels[i * 4] * inv + d[i * 4] * alpha);
        d[i * 4 + 1] = Math.round(origPixels[i * 4 + 1] * inv + d[i * 4 + 1] * alpha);
        d[i * 4 + 2] = Math.round(origPixels[i * 4 + 2] * inv + d[i * 4 + 2] * alpha);
      }
    }
  }

  // ── Build a mask for a specific canvas size (rescale cached) ──
  // When preview canvas is smaller than the full image, this rescales the mask.
  // If no cached mask exists, returns null.
  //
  // @param {number} targetW - target width
  // @param {number} targetH - target height
  // @param {string} [type='face'] - 'face' for face-only, 'skin' for combined skin mask
  function getMaskForSize(targetW, targetH, type = 'face') {
    if (!_cachedMask) return null;

    const srcMask = (type === 'skin') ? _cachedMask.skinMask : _cachedMask.faceMask;
    const { width: srcW, height: srcH } = _cachedMask;

    // If dimensions match, return the cached mask directly
    if (srcW === targetW && srcH === targetH) return srcMask;

    // Bilinear resample the mask to target dimensions
    const resized = new Float32Array(targetW * targetH);
    const xRatio = srcW / targetW;
    const yRatio = srcH / targetH;

    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        const srcX = x * xRatio;
        const srcY = y * yRatio;
        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = Math.min(x0 + 1, srcW - 1);
        const y1 = Math.min(y0 + 1, srcH - 1);
        const fx = srcX - x0;
        const fy = srcY - y0;

        // Bilinear interpolation
        const v00 = srcMask[y0 * srcW + x0];
        const v10 = srcMask[y0 * srcW + x1];
        const v01 = srcMask[y1 * srcW + x0];
        const v11 = srcMask[y1 * srcW + x1];
        const top = v00 * (1 - fx) + v10 * fx;
        const bot = v01 * (1 - fx) + v11 * fx;
        resized[y * targetW + x] = top * (1 - fy) + bot * fy;
      }
    }

    return resized;
  }

  // ── Detect for a specific canvas size (preview) ──
  // Detects on the source, then rescales mask to preview dimensions.
  // Uses cache if available to avoid re-detection.
  async function detectForPreview(imageSource, previewW, previewH, sourceId, type = 'face') {
    // If we don't have a cached mask yet, detect on the source at its native size
    if (!_cachedMask || sourceId !== _cachedSourceId) {
      const srcW = imageSource.naturalWidth || imageSource.width;
      const srcH = imageSource.naturalHeight || imageSource.height;
      await detectAndCache(imageSource, srcW, srcH, sourceId);
    }

    // Return a mask resized for the preview dimensions
    return getMaskForSize(previewW, previewH, type);
  }

  // ── Check if MediaPipe is available ──
  function isAvailable() {
    return _faceLandmarker !== null;
  }

  // ── Check if MediaPipe is initialized ──
  function isInitialized() {
    return _faceLandmarker !== null;
  }

  // ── Expose public API on window ──
  window.FaceMaskModule = {
    init,
    detectAndCache,
    detectForPreview,
    getCachedMask,
    getCachedMaskInfo,
    getMaskForSize,
    hasCachedMask,
    clearCache,
    applyMaskedFilter,
    applyMaskedFilterToData,
    isAvailable,
    isInitialized
  };

  console.log('[FaceMask] Module loaded — init deferred until after splash screen.');

  // Background init is now triggered by main.js AFTER the splash screen is
  // fully removed. This prevents the heavy model loading + GPU warm-up from
  // competing with the splash CSS animations on the main thread.
  function startDeferredInit() {
    console.log('[FaceMask] Deferred init triggered — starting model load...');
    init().catch(err => console.warn('[FaceMask] Background initialization error:', err?.message || err));
  }

  // Expose so main.js can call it
  window.FaceMaskModule.startDeferredInit = startDeferredInit;
})();