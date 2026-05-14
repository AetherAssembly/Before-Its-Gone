import {
  calculateExpiryStatus,
  type InventoryItem
} from '@before-its-gone/core';

type InventoryCardProps = {
  item: InventoryItem;
  onDelete: (id: string) => void;
  onDecrement: (id: string) => void;
};

export function InventoryCard({ item, onDelete, onDecrement }: InventoryCardProps) {
  const status = calculateExpiryStatus(item.expiresAt);

  return (
    <article className="inventory-card" data-status={status}>
      <header>
        <h3>{item.name}</h3>
        <div className="card-meta">
          <span>{item.location}</span>
          {item.category ? <span className="tag">{item.category}</span> : null}
        </div>
      </header>

      <p>Expires: {new Date(item.expiresAt).toLocaleDateString()}</p>
      <p>Status: {status === 'expiring-soon' ? 'expiring soon' : status}</p>
      {item.barcode ? <p>Barcode: {item.barcode}</p> : null}

      <div className="card-actions">
        <button
          type="button"
          className="btn-sm"
          onClick={() => onDecrement(item.id)}
          title="Use one"
          disabled={item.quantity <= 0}
        >
          − Use one
        </button>
        <span className="qty-display">{item.quantity} left</span>
        <button
          type="button"
          className="btn-remove"
          onClick={() => onDelete(item.id)}
        >
          Remove
        </button>
      </div>
    </article>
  );
}
