import { useEffect } from 'react';
import { type InventoryItem, type StorageLocation } from '@before-its-gone/core';

export type FormState = {
  name: string;
  quantity: number;
  location: StorageLocation;
  barcode: string;
  shelfLifeDays: number;
  expiryDate: string;
  category: string;
  depletionThreshold: string;
  tags: string;
  recurring: boolean;
  restockQuantity: string;
};

type Props = {
  item: InventoryItem | null;
  editForm: FormState | null;
  loading: boolean;
  customLocations: string[];
  onStartEdit: () => void;
  onEditFormChange: (updater: (f: FormState) => FormState) => void;
  onEditSave: () => void;
  onClose: () => void;
};

export function ItemDrawer({ item, editForm, loading, customLocations, onStartEdit, onEditFormChange, onEditSave, onClose }: Props) {
  useEffect(() => {
    if (!item) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [item, onClose]);

  return (
    <>
      {item && (
        <div
          className="drawer-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`item-drawer${item ? ' item-drawer--open' : ''}`}
        aria-label={item ? `Details for ${item.name}` : 'Item details'}
        role="complementary"
        aria-hidden={!item}
      >
        {item && <>
        <div className="drawer-header">
          <h2 className="drawer-title">{item.name}</h2>
          <button
            type="button"
            className="drawer-close"
            onClick={onClose}
            aria-label="Close drawer"
          >
            &#x2715;
          </button>
        </div>

        {!editForm ? (
          <div className="drawer-detail">
            <dl className="detail-list">
              <dt>Location</dt><dd>{item.location}</dd>
              {item.category && <><dt>Category</dt><dd>{item.category}</dd></>}
              <dt>Quantity</dt><dd>{item.quantity}</dd>
              <dt>Expires</dt><dd>{new Date(item.expiresAt).toLocaleDateString()}</dd>
              {item.barcode && <><dt>Barcode</dt><dd>{item.barcode}</dd></>}
              {item.tags?.length > 0 && (
                <><dt>Tags</dt><dd>{item.tags.join(', ')}</dd></>
              )}
              {item.depletionThreshold != null && (
                <><dt>Low stock at</dt><dd>{item.depletionThreshold}</dd></>
              )}
              {item.recurring && (
                <><dt>Auto-restock</dt><dd>Yes{item.restockQuantity ? ` (${item.restockQuantity})` : ''}</dd></>
              )}
              <dt>Added</dt><dd>{new Date(item.createdAt).toLocaleDateString()}</dd>
              <dt>Updated</dt><dd>{new Date(item.updatedAt).toLocaleDateString()}</dd>
            </dl>
            <button type="button" onClick={onStartEdit} className="drawer-edit-btn">
              Edit item
            </button>
          </div>
        ) : (
          <div className="drawer-edit inventory-form">
            <label>Name
              <input value={editForm.name} required onChange={e => onEditFormChange(f => ({ ...f, name: e.target.value }))} />
            </label>
            <label>Category (optional)
              <input value={editForm.category} placeholder="e.g. dairy" onChange={e => onEditFormChange(f => ({ ...f, category: e.target.value }))} />
            </label>
            <label>Tags (comma-separated)
              <input value={editForm.tags} placeholder="e.g. organic, local" onChange={e => onEditFormChange(f => ({ ...f, tags: e.target.value }))} />
            </label>
            <label>Quantity
              <input type="number" min={1} value={editForm.quantity} onChange={e => onEditFormChange(f => ({ ...f, quantity: Number(e.target.value) || 1 }))} />
            </label>
            <label>Expiry date
              <input type="date" value={editForm.expiryDate} onChange={e => onEditFormChange(f => ({ ...f, expiryDate: e.target.value }))} />
            </label>
            <label>Location
              <select value={editForm.location} onChange={e => onEditFormChange(f => ({ ...f, location: e.target.value as StorageLocation }))}>
                <option value="fridge">Fridge</option>
                <option value="freezer">Freezer</option>
                <option value="pantry">Pantry</option>
                {customLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </label>
            <label>Low stock alert at (optional)
              <input type="number" min={1} value={editForm.depletionThreshold} placeholder="e.g. 2" onChange={e => onEditFormChange(f => ({ ...f, depletionThreshold: e.target.value }))} />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={editForm.recurring} onChange={e => onEditFormChange(f => ({ ...f, recurring: e.target.checked }))} />
              Auto-restock when depleted
            </label>
            {editForm.recurring && (
              <label>Restock quantity
                <input type="number" min={1} value={editForm.restockQuantity} placeholder="e.g. 3" onChange={e => onEditFormChange(f => ({ ...f, restockQuantity: e.target.value }))} />
              </label>
            )}
            <div className="confirm-row">
              <button type="button" disabled={loading} onClick={onEditSave}>
                {loading ? 'Saving...' : 'Save changes'}
              </button>
              <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </div>
        )}
        </>}
      </aside>
    </>
  );
}
