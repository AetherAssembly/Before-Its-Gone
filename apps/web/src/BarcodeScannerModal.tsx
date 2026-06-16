import { useEffect, useRef, useState, type ReactElement } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface BarcodeScannerModalProps {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScannerModal({ onDetected, onClose }: BarcodeScannerModalProps): ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result, err) => {
        if (result) {
          onDetected(result.getText());
          onClose();
        }
        if (err && (err as Error).name !== 'NotFoundException') {
          setError('Camera error: ' + err.message);
        }
      })
      .catch((e: Error) => setError('Could not access camera: ' + e.message));

    return () => {
      BrowserMultiFormatReader.releaseAllStreams();
    };
  }, [onDetected, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
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
        background: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#fff', color: '#111',
        borderRadius: '12px', padding: '24px',
        maxWidth: '360px', width: '90%',
        display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Scan Barcode</h2>

        {error ? (
          <p style={{ color: '#dc2626', fontSize: '0.875rem' }}>{error}</p>
        ) : (
          <video
            ref={videoRef}
            style={{ width: '100%', borderRadius: '8px', background: '#000' }}
            autoPlay
            muted
            playsInline
          />
        )}

        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '10px 20px', borderRadius: '6px',
            border: '1px solid #d1d5db', background: '#fff',
            cursor: 'pointer', fontSize: '0.9rem'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
