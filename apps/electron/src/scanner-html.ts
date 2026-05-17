export function buildScannerHtml(token: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Scan Barcode</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0a0a0a;
      color: #f0f0f0;
      font-family: system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      height: 100svh;
      overflow: hidden;
    }

    /* ── Camera view ── */
    #camera-view {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    #header {
      padding: 14px 16px;
      font-size: 1rem;
      font-weight: 600;
      text-align: center;
      flex-shrink: 0;
      background: #111;
    }
    #video-wrap {
      position: relative;
      flex: 1;
      min-height: 0;
    }
    #video {
      width: 100%; height: 100%;
      object-fit: cover;
      display: block;
    }
    #viewfinder {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: min(70vw, 260px);
      height: min(70vw, 260px);
      border: 3px solid rgba(255,255,255,0.85);
      border-radius: 12px;
      box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);
      pointer-events: none;
    }
    #scan-status {
      padding: 14px 16px;
      font-size: 0.9rem;
      text-align: center;
      flex-shrink: 0;
      background: #111;
    }
    #scan-status.error { color: #f87171; }

    /* ── Result card ── */
    #result-view {
      display: none;
      flex-direction: column;
      height: 100%;
      overflow-y: auto;
    }
    .result-header {
      padding: 14px 16px;
      font-size: 1rem;
      font-weight: 600;
      background: #111;
      text-align: center;
      flex-shrink: 0;
    }
    .result-body {
      flex: 1;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .product-image {
      width: 100px;
      height: 100px;
      object-fit: contain;
      border-radius: 8px;
      background: #1a1a1a;
      align-self: center;
    }
    .product-placeholder {
      width: 100px;
      height: 100px;
      border-radius: 8px;
      background: #1a1a1a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      align-self: center;
    }
    .field-label {
      font-size: 0.75rem;
      color: #888;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .field-value {
      font-size: 1rem;
      font-weight: 600;
    }
    input[type="text"], input[type="number"] {
      width: 100%;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      color: #f0f0f0;
      font-size: 1rem;
      padding: 10px 12px;
      font-family: inherit;
    }
    input[type="text"]:focus, input[type="number"]:focus {
      outline: none;
      border-color: #22d3ee;
    }

    /* Location tabs */
    .location-tabs {
      display: flex;
      gap: 8px;
    }
    .loc-btn {
      flex: 1;
      padding: 10px 4px;
      border-radius: 8px;
      border: 1px solid #333;
      background: #1a1a1a;
      color: #999;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      font-family: inherit;
    }
    .loc-btn.active {
      background: #164e63;
      border-color: #22d3ee;
      color: #22d3ee;
    }

    /* Quantity stepper */
    .qty-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .qty-btn {
      width: 40px; height: 40px;
      border-radius: 8px;
      border: 1px solid #333;
      background: #1a1a1a;
      color: #f0f0f0;
      font-size: 1.3rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-family: inherit;
    }
    .qty-val {
      font-size: 1.4rem;
      font-weight: 700;
      min-width: 2rem;
      text-align: center;
    }

    /* Expiry preview */
    .expiry-preview {
      font-size: 0.875rem;
      color: #94a3b8;
    }

    /* Action buttons */
    .action-row {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 0 0 8px;
    }
    .btn-primary {
      width: 100%;
      padding: 14px;
      border-radius: 10px;
      border: none;
      background: #22d3ee;
      color: #0a0a0a;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-secondary {
      width: 100%;
      padding: 12px;
      border-radius: 10px;
      border: 1px solid #333;
      background: transparent;
      color: #999;
      font-size: 0.9rem;
      cursor: pointer;
      font-family: inherit;
    }

    /* Saving / saved states */
    #saving-view, #saved-view {
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 16px;
      padding: 32px;
      text-align: center;
    }
    .spinner {
      width: 48px; height: 48px;
      border: 4px solid #333;
      border-top-color: #22d3ee;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .saved-icon { font-size: 3.5rem; }
    .saved-text { font-size: 1.1rem; font-weight: 600; color: #4ade80; }
  </style>
</head>
<body>

<!-- Camera scanning view -->
<div id="camera-view">
  <div id="header">Point camera at a barcode</div>
  <div id="video-wrap">
    <video id="video" playsinline muted></video>
    <div id="viewfinder"></div>
  </div>
  <div id="scan-status">Starting camera…</div>
</div>

<!-- Product review / edit view -->
<div id="result-view">
  <div class="result-header">Review item</div>
  <div class="result-body">
    <div id="product-img-wrap"></div>

    <div>
      <div class="field-label">Name</div>
      <input type="text" id="name-input" placeholder="Product name" autocomplete="off" />
    </div>

    <div>
      <div class="field-label">Category (optional)</div>
      <input type="text" id="category-input" placeholder="e.g. dairy, meat, snacks" autocomplete="off" />
    </div>

    <div>
      <div class="field-label">Storage location</div>
      <div class="location-tabs">
        <button class="loc-btn active" data-loc="fridge">🧊 Fridge</button>
        <button class="loc-btn" data-loc="freezer">❄️ Freezer</button>
        <button class="loc-btn" data-loc="pantry">🗄️ Pantry</button>
      </div>
    </div>

    <div>
      <div class="field-label">Quantity</div>
      <div class="qty-row">
        <button class="qty-btn" id="qty-minus">−</button>
        <span class="qty-val" id="qty-display">1</span>
        <button class="qty-btn" id="qty-plus">+</button>
      </div>
    </div>

    <div>
      <div class="field-label">Shelf life (days)</div>
      <input type="number" id="shelf-input" min="1" max="3650" />
      <div class="expiry-preview" id="expiry-preview"></div>
    </div>

    <div class="action-row">
      <button class="btn-primary" id="save-btn">Save &amp; scan next</button>
      <button class="btn-secondary" id="cancel-btn">Cancel</button>
    </div>
  </div>
</div>

<!-- Saving spinner -->
<div id="saving-view">
  <div class="spinner"></div>
  <div>Saving…</div>
</div>

<!-- Saved confirmation -->
<div id="saved-view">
  <div class="saved-icon">✓</div>
  <div class="saved-text">Saved!</div>
  <div style="color:#888;font-size:0.875rem">Scanning next…</div>
</div>

<script>
  var TOKEN = ${JSON.stringify(token)};

  // ── State ──
  var state = {
    barcode: '',
    name: '',
    category: '',
    location: 'fridge',
    quantity: 1,
    shelfLifeDays: 14,
    scanning: true,
    activeStream: null,
  };

  // ── DOM refs ──
  var cameraView   = document.getElementById('camera-view');
  var resultView   = document.getElementById('result-view');
  var savingView   = document.getElementById('saving-view');
  var savedView    = document.getElementById('saved-view');
  var scanStatus   = document.getElementById('scan-status');
  var video        = document.getElementById('video');
  var nameInput    = document.getElementById('name-input');
  var categoryInput= document.getElementById('category-input');
  var shelfInput   = document.getElementById('shelf-input');
  var qtyDisplay   = document.getElementById('qty-display');
  var expiryPreview= document.getElementById('expiry-preview');
  var saveBtn      = document.getElementById('save-btn');
  var cancelBtn    = document.getElementById('cancel-btn');
  var imgWrap      = document.getElementById('product-img-wrap');
  var locBtns      = document.querySelectorAll('.loc-btn');

  function show(view) {
    cameraView.style.display  = 'none';
    resultView.style.display  = 'none';
    savingView.style.display  = 'none';
    savedView.style.display   = 'none';
    view.style.display = 'flex';
  }

  // ── Location tabs ──
  locBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.location = btn.dataset.loc;
      locBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      updateShelfSuggestion();
    });
  });

  // ── Quantity stepper ──
  document.getElementById('qty-minus').addEventListener('click', function() {
    if (state.quantity > 1) { state.quantity--; qtyDisplay.textContent = state.quantity; }
  });
  document.getElementById('qty-plus').addEventListener('click', function() {
    state.quantity++;
    qtyDisplay.textContent = state.quantity;
  });

  // ── Shelf life input ──
  shelfInput.addEventListener('input', function() {
    state.shelfLifeDays = Math.max(1, parseInt(shelfInput.value, 10) || 1);
    updateExpiryPreview();
  });

  function updateExpiryPreview() {
    var d = new Date();
    d.setDate(d.getDate() + state.shelfLifeDays);
    expiryPreview.textContent = 'Expires ~' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function updateShelfSuggestion() {
    // Adjust suggestion when location changes based on original product data
    if (state._shelfByLocation) {
      var days = state._shelfByLocation[state.location] || state.shelfLifeDays;
      state.shelfLifeDays = days;
      shelfInput.value = days;
      updateExpiryPreview();
    }
  }

  // ── Save button ──
  saveBtn.addEventListener('click', function() {
    state.name = nameInput.value.trim();
    state.category = categoryInput.value.trim();
    state.shelfLifeDays = Math.max(1, parseInt(shelfInput.value, 10) || 1);
    if (!state.name) { nameInput.focus(); return; }
    doSave();
  });

  // ── Cancel button ──
  cancelBtn.addEventListener('click', function() {
    resetToScanning();
  });

  function doSave() {
    show(savingView);
    fetch('/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: TOKEN,
        barcode: state.barcode,
        name: state.name,
        quantity: state.quantity,
        location: state.location,
        category: state.category || null,
        shelfLifeDays: state.shelfLifeDays,
      })
    }).then(function(res) {
      if (res.ok) {
        show(savedView);
        setTimeout(resetToScanning, 1500);
      } else {
        show(resultView);
        scanStatus.textContent = 'Save failed — please try again.';
      }
    }).catch(function() {
      show(resultView);
    });
  }

  function showProductCard(barcode, product) {
    state.barcode = barcode;
    state.name = product.name || '';
    state.category = product.category || '';
    state.shelfLifeDays = product.suggestedShelfLifeDays || 14;
    state.quantity = 1;
    state.location = 'fridge';
    state._shelfByLocation = product.shelfByLocation || null;

    nameInput.value = state.name;
    categoryInput.value = state.category;
    shelfInput.value = state.shelfLifeDays;
    qtyDisplay.textContent = '1';
    updateExpiryPreview();

    // Reset location to fridge
    locBtns.forEach(function(b) {
      b.classList.toggle('active', b.dataset.loc === 'fridge');
    });

    // Product image
    imgWrap.innerHTML = '';
    if (product.imageUrl) {
      var img = document.createElement('img');
      img.src = product.imageUrl;
      img.className = 'product-image';
      img.alt = state.name;
      img.onerror = function() {
        imgWrap.innerHTML = '<div class="product-placeholder">📦</div>';
      };
      imgWrap.appendChild(img);
    } else {
      imgWrap.innerHTML = '<div class="product-placeholder">📦</div>';
    }

    show(resultView);
  }

  function resetToScanning() {
    state.scanning = true;
    show(cameraView);
    scanStatus.textContent = 'Scanning…';
    scanStatus.className = '';
    startBarcodeScanning();
  }

  // ── Barcode detection ──
  function sendBarcode(barcode) {
    state.scanning = false;
    scanStatus.textContent = 'Looking up product…';

    fetch('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode: barcode, token: TOKEN })
    }).then(function(res) { return res.json(); }).then(function(data) {
      if (data.ok) {
        showProductCard(barcode, data.product || {});
      } else {
        showProductCard(barcode, { name: '', imageUrl: null, suggestedShelfLifeDays: 14, category: null });
      }
    }).catch(function() {
      showProductCard(barcode, { name: '', imageUrl: null, suggestedShelfLifeDays: 14, category: null });
    });
  }

  function startBarcodeDetector() {
    var detector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39',
                'qr_code', 'data_matrix', 'pdf417', 'aztec', 'itf', 'codabar']
    });
    function tick() {
      if (!state.scanning) return;
      detector.detect(video).then(function(results) {
        if (!state.scanning) return;
        if (!results.length) { requestAnimationFrame(tick); return; }
        state.scanning = false;
        sendBarcode(results[0].rawValue);
      }).catch(function() {
        if (state.scanning) requestAnimationFrame(tick);
      });
    }
    requestAnimationFrame(tick);
  }

  function startZXing() {
    scanStatus.textContent = 'Loading scanner…';
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.18.6/umd/index.min.js';
    s.onload = function() {
      scanStatus.textContent = 'Scanning…';
      var reader = new ZXing.BrowserMultiFormatReader();
      reader.decodeFromStream(state.activeStream, video, function(result) {
        if (!result || !state.scanning) return;
        state.scanning = false;
        reader.reset();
        sendBarcode(result.getText());
      });
    };
    s.onerror = function() {
      scanStatus.textContent = 'Failed to load scanner.';
      scanStatus.className = 'error';
    };
    document.head.appendChild(s);
  }

  function startBarcodeScanning() {
    if (state.activeStream) {
      if (typeof BarcodeDetector !== 'undefined') {
        startBarcodeDetector();
      } else {
        startZXing();
      }
      return;
    }

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
    }).then(function(stream) {
      state.activeStream = stream;
      video.srcObject = stream;
      return video.play();
    }).then(function() {
      scanStatus.textContent = 'Scanning…';
      if (typeof BarcodeDetector !== 'undefined') {
        startBarcodeDetector();
      } else {
        startZXing();
      }
    }).catch(function(err) {
      var name = err && err.name ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        scanStatus.textContent = 'Camera permission denied — please allow access and reload.';
      } else if (name === 'NotFoundError') {
        scanStatus.textContent = 'No camera found on this device.';
      } else {
        scanStatus.textContent = 'Could not start camera.';
      }
      scanStatus.className = 'error';
    });
  }

  startBarcodeScanning();
</script>
</body>
</html>`;
}
