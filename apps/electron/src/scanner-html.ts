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
      background: #000;
      color: #fff;
      font-family: system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      height: 100svh;
    }
    #header {
      padding: 16px;
      font-size: 1.1rem;
      font-weight: 600;
      text-align: center;
      flex-shrink: 0;
    }
    #video-wrap {
      position: relative;
      flex: 1;
      min-height: 0;
    }
    #video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    #viewfinder {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: min(70vw, 280px);
      height: min(70vw, 280px);
      border: 3px solid rgba(255,255,255,0.85);
      border-radius: 12px;
      box-shadow: 0 0 0 9999px rgba(0,0,0,0.45);
      pointer-events: none;
    }
    #status {
      padding: 18px 16px;
      font-size: 1rem;
      text-align: center;
      flex-shrink: 0;
    }
    #status.success { color: #4ade80; font-weight: 600; font-size: 1.1rem; }
    #status.error   { color: #f87171; }
  </style>
</head>
<body>
  <div id="header">Point camera at a barcode</div>
  <div id="video-wrap">
    <video id="video" playsinline muted></video>
    <div id="viewfinder"></div>
  </div>
  <div id="status">Starting camera…</div>

  <script>
    var TOKEN = ${JSON.stringify(token)};
    var statusEl = document.getElementById('status');
    var video = document.getElementById('video');
    var activeStream = null;

    function handleCameraError(err) {
      var name = err && err.name ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        statusEl.textContent = 'Camera permission denied — please allow access and reload.';
      } else if (name === 'NotFoundError') {
        statusEl.textContent = 'No camera found on this device.';
      } else {
        statusEl.textContent = 'Could not start camera: ' + (err ? err.message || name : 'unknown error');
      }
      statusEl.className = 'error';
    }

    function sendBarcode(barcode) {
      statusEl.textContent = 'Sending…';
      fetch('/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: barcode, token: TOKEN })
      }).then(function(res) {
        if (res.ok) {
          statusEl.textContent = '\\u2713 Barcode sent! You can close this page.';
          statusEl.className = 'success';
        } else {
          statusEl.textContent = 'Server error — please try again.';
          statusEl.className = 'error';
        }
      }).catch(function() {
        statusEl.textContent = 'Failed to send — please try again.';
        statusEl.className = 'error';
      });
    }

    function startBarcodeDetector() {
      var detector = new BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39',
                  'qr_code', 'data_matrix', 'pdf417', 'aztec', 'itf', 'codabar']
      });
      var scanning = true;
      function tick() {
        if (!scanning) return;
        detector.detect(video).then(function(results) {
          if (!scanning) return;
          if (!results.length) { requestAnimationFrame(tick); return; }
          scanning = false;
          activeStream.getTracks().forEach(function(t) { t.stop(); });
          sendBarcode(results[0].rawValue);
        }).catch(function() {
          if (scanning) requestAnimationFrame(tick);
        });
      }
      requestAnimationFrame(tick);
    }

    function startZXing() {
      statusEl.textContent = 'Loading scanner library…';
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.18.6/umd/index.min.js';
      s.onload = function() {
        statusEl.textContent = 'Scanning…';
        var reader = new ZXing.BrowserMultiFormatReader();
        reader.decodeFromStream(activeStream, video, function(result, err) {
          if (!result) return;
          reader.reset();
          activeStream.getTracks().forEach(function(t) { t.stop(); });
          sendBarcode(result.getText());
        });
      };
      s.onerror = function() {
        statusEl.textContent = 'Failed to load scanner — check your internet connection.';
        statusEl.className = 'error';
      };
      document.head.appendChild(s);
    }

    // Get camera stream, explicitly play the video, then start scanning
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
    }).then(function(stream) {
      activeStream = stream;
      video.srcObject = stream;
      return video.play();
    }).then(function() {
      statusEl.textContent = 'Scanning…';
      if (typeof BarcodeDetector !== 'undefined') {
        startBarcodeDetector();
      } else {
        startZXing();
      }
    }).catch(handleCameraError);
  </script>
</body>
</html>`;
}
