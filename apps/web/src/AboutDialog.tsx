interface Props {
  open: boolean;
  onClose: () => void;
  version: string;
}

export function AboutDialog({ open, onClose, version }: Props) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="About Before It's Gone">
      <div className="about-dialog" onClick={(e) => e.stopPropagation()}>
        <img src={`${import.meta.env.BASE_URL}icons/icon-192.svg`} width="80" height="80" alt="Before It's Gone icon" className="about-icon" />
        <h2>Before It&apos;s Gone</h2>
        <p className="about-version">v{version}</p>
        <p className="about-description">Offline-first inventory tracker for fridge and pantry items.</p>
        <div className="about-links">
          <a
            href="https://github.com/AetherAssembly/Before-Its-Gone"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
        <p className="about-license">MIT License · AetherAssembly</p>
        <button className="about-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
