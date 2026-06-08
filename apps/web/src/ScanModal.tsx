import { useEffect, type ReactElement } from 'react';

interface ScanModalProps {
  qrDataUrl: string;
  serverUrl: string;
  status: 'waiting' | 'received';
  platform?: string;
  onClose: () => void;
}

export function ScanModal({ qrDataUrl, serverUrl, status, platform, onClose }: ScanModalProps): ReactElement {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Barcode scanner"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', color: '#111',
          borderRadius: '12px',
          padding: '28px 24px',
          maxWidth: '340px', width: '90%',
          textAlign: 'center',
          display: 'flex', flexDirection: 'column', gap: '16px'
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Scan with your phone</h2>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#555' }}>
          Open your phone camera and scan the QR code, or type the address into your browser.
        </p>

        <img
          src={qrDataUrl}
          alt="QR code to open barcode scanner on your phone"
          width={220}
          height={220}
          style={{ imageRendering: 'pixelated', margin: '0 auto', display: 'block' }}
        />

        <code style={{
          fontSize: '0.75rem', wordBreak: 'break-all',
          background: '#f3f4f6', padding: '8px', borderRadius: '6px',
          display: 'block'
        }}>
          {serverUrl}
        </code>

        <p style={{
          margin: 0,
          fontSize: '0.9rem',
          color: status === 'received' ? '#16a34a' : '#888',
          fontWeight: status === 'received' ? 600 : 400,
          minHeight: '1.4em'
        }}>
          {status === 'received' ? '✓ Barcode received!' : 'Waiting for scan…'}
        </p>

        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Cancel
        </button>

        <details style={{ textAlign: 'left', fontSize: '0.72rem', color: '#aaa' }}>
          <summary style={{ cursor: 'pointer', marginBottom: '6px' }}>First time? Read this.</summary>
          <ol style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>Make sure your phone and PC are on the <strong>same Wi-Fi network.</strong></li>
            <li>Your browser will show a <strong>&ldquo;connection not private&rdquo; warning</strong> because the certificate is self-signed. This is normal — tap <strong>Advanced → Proceed</strong> (Chrome) or <strong>Show Details → visit this website</strong> (Safari).</li>
            <li>If you still can&apos;t connect on Windows, right-click the app and choose <strong>Run as administrator</strong> once to set the firewall rule.</li>
            {platform === 'linux' && (
              <li>On Linux, run <code>sudo ufw allow 45678/tcp</code> once in a terminal to permanently allow connections — you only need to do this once.</li>
            )}
          </ol>
        </details>
      </div>
    </div>
  );
}
