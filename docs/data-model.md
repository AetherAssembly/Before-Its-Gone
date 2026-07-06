# Data Model

Every item stored in the inventory is an `InventoryItem` object. This page describes each field.

---

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `string` | Yes | UUID generated on creation. |
| `name` | `string` | Yes | Human-readable product name. |
| `quantity` | `number` | Yes | Current stock count (whole units). |
| `location` | `string` | Yes | Where the item is stored. Built-in values: `fridge`, `freezer`, `pantry`. Any custom string (defined in Settings) is also accepted. |
| `barcode` | `string \| null` | No | EAN/UPC barcode, or `null` if not scanned. |
| `expiresAt` | `string` | Yes | ISO 8601 timestamp for the expiry date (e.g. `2026-12-01T23:59:59.000Z`). |
| `shelfLifeDays` | `number` | No | Expected shelf life in days, used to pre-fill the expiry date on restock. |
| `createdAt` | `string` | Yes | ISO 8601 timestamp set when the item is first added. |
| `updatedAt` | `string` | Yes | ISO 8601 timestamp updated on every edit. |
| `category` | `string \| null` | No | Free-text category label (e.g. `dairy`, `meat`), or `null`. |
| `depletionThreshold` | `number \| null` | No | Quantity at or below which a low-stock notification fires. `null` disables the alert. |
| `tags` | `string[]` | Yes | Array of free-text tags; empty array when none are set. |
| `recurring` | `boolean` | No | When `true`, a new item is automatically created from this one when it is fully consumed. Defaults to `false`. |
| `restockQuantity` | `number` | No | Starting quantity for the auto-created restock item when `recurring` is enabled. |
| `photo` | `string` | No | Data URL of an optional item photo. |

---

For the serialised format used when importing and exporting, see [Import & Export Format](import-export-format.md).
