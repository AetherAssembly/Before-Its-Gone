import {
  calculateExpiryStatus,
  type InventoryItem
} from '@before-its-gone/core';

type InventoryCardProps = {
  item: InventoryItem;
  onDelete: (id: string) => void;
  onDecrement: (id: string) => void;
  onIncrement?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDetail?: (id: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  warningWindowDays?: number;
  onTagClick?: (tag: string) => void;
  caloriesPer100g?: number | null;
  allergens?: string[];
};

export function InventoryCard({ item, onDelete, onDecrement, onIncrement, onEdit, onDetail, selected, onToggleSelect, warningWindowDays, onTagClick, caloriesPer100g, allergens }: InventoryCardProps) {
  const status = calculateExpiryStatus(item.expiresAt, warningWindowDays);

  return (
    <article
      className="inventory-card"
      data-status={status}
      data-selected={selected ? 'true' : undefined}
      onClick={onDetail ? () => onDetail(item.id) : undefined}
      style={onDetail ? { cursor: 'pointer' } : undefined}
    >
      <header>
        {onToggleSelect && (
          <input
            type="checkbox"
            className="bulk-checkbox"
            checked={selected ?? false}
            onChange={() => onToggleSelect(item.id)}
            aria-label={`Select ${item.name}`}
          />
        )}
        <h3>{item.name}</h3>
        <div className="card-meta">
          <span>{item.location}</span>
          {item.category ? <span className="tag">{item.category}</span> : null}
          {item.tags?.map((tag) => (
            <span
              key={tag}
              className={onTagClick ? 'tag tag--clickable' : 'tag'}
              role={onTagClick ? 'button' : undefined}
              tabIndex={onTagClick ? 0 : undefined}
              onClick={onTagClick ? (e) => { e.stopPropagation(); onTagClick(tag); } : undefined}
              onKeyDown={onTagClick ? (e) => { if (e.key === 'Enter') { e.stopPropagation(); onTagClick(tag); } } : undefined}
            >
              {tag}
            </span>
          ))}
        </div>
      </header>

      <p>Expires: {new Date(item.expiresAt).toLocaleDateString()}</p>
      <p>Status: {status === 'expiring-soon' ? 'expiring soon' : status}</p>
      {item.barcode ? <p>Barcode: {item.barcode}</p> : null}
      {(caloriesPer100g != null || (allergens && allergens.length > 0)) && (
        <div className="card-nutrition">
          {caloriesPer100g != null && <span className="nutrition-chip">{caloriesPer100g} kcal/100g</span>}
          {allergens?.map((a) => <span key={a} className="nutrition-chip nutrition-chip--allergen">⚠ {a}</span>)}
        </div>
      )}

      <div className="card-actions" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          className="btn-sm"
          onClick={() => onDecrement(item.id)}
          title="Use one"
          aria-label={`Use one ${item.name}`}
          disabled={item.quantity <= 0}
        >
          - Use one
        </button>
        <span className="qty-display">{item.quantity} left</span>
        {onIncrement && (
          <button
            type="button"
            className="btn-sm"
            onClick={() => onIncrement(item.id)}
            title="Add one"
            aria-label={`Add one ${item.name}`}
          >
            + Add one
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            className="btn-sm"
            onClick={() => onEdit(item.id)}
            aria-label={`Edit ${item.name}`}
          >
            Edit
          </button>
        )}
        <button
          type="button"
          className="btn-remove"
          onClick={() => onDelete(item.id)}
          aria-label={`Remove ${item.name}`}
        >
          Remove
        </button>
      </div>
    </article>
  );
}
