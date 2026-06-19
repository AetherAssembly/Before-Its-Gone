# Import & Export Format Reference

Before It's Gone can export your inventory to **JSON** or **CSV**, and import from either format. This page documents the exact structure expected for each.

---

## JSON

### JSON-Exporting

The app exports a single JSON object with three top-level keys:

```json
{
  "version": 1,
  "exportedAt": "2026-05-18T14:30:00.000Z",
  "items": [ ... ]
}
```

| Key | Type | Description |
| --- | ---- | ----------- |
| `version` | `number` | Schema version. Currently always `1`. |
| `exportedAt` | `string` | ISO 8601 timestamp of when the export was created. |
| `items` | `array` | Array of inventory item objects (see below). |

#### Item object

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | `string` | UUID. Preserved on re-import; re-importing the same export will overwrite the existing record rather than duplicate it. |
| `name` | `string` | Display name of the item. |
| `quantity` | `number` | Must be a positive integer ≥ 1. |
| `location` | `string` | One of `"fridge"`, `"freezer"`, `"pantry"`. |
| `barcode` | `string \| null` | Raw barcode string, or `null` if none was scanned. |
| `expiresAt` | `string` | ISO 8601 timestamp of the expiry date (e.g. `"2026-06-01T23:59:59.000Z"`). |
| `shelfLifeDays` | `number` | Shelf life in days, stored at creation time. |
| `createdAt` | `string` | ISO 8601 timestamp. |
| `updatedAt` | `string` | ISO 8601 timestamp. |
| `category` | `string \| null` | Free-text category label, or `null`. |
| `depletionThreshold` | `number \| null` | Low-stock alert threshold (quantity), or `null` if unset. |
| `tags` | `string[]` | Array of tag strings. Empty array if none. |
| `recurring` | `boolean` | Whether the item auto-restocks when depleted. Optional; defaults to `false`. |
| `restockQuantity` | `number \| undefined` | Quantity to restock to when `recurring` is true. Optional. |

#### Full example

```json
{
  "version": 1,
  "exportedAt": "2026-05-18T14:30:00.000Z",
  "items": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Whole Milk",
      "quantity": 2,
      "location": "fridge",
      "barcode": "5000112637922",
      "expiresAt": "2026-05-25T23:59:59.000Z",
      "shelfLifeDays": 10,
      "createdAt": "2026-05-15T08:00:00.000Z",
      "updatedAt": "2026-05-15T08:00:00.000Z",
      "category": "dairy",
      "depletionThreshold": 1,
      "tags": ["organic", "fridge-door"]
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "name": "Penne",
      "quantity": 3,
      "location": "pantry",
      "barcode": null,
      "expiresAt": "2027-12-31T23:59:59.000Z",
      "shelfLifeDays": 730,
      "createdAt": "2026-05-10T10:00:00.000Z",
      "updatedAt": "2026-05-10T10:00:00.000Z",
      "category": "pasta",
      "depletionThreshold": null,
      "tags": []
    }
  ]
}
```

### JSON-Importing

The importer reads the `items` array from inside the `{ version, exportedAt, items }` envelope. Items missing an `id` or `name` are silently skipped. If you re-import a file that was previously exported, existing items with matching `id` values are overwritten in place rather than duplicated.

> **Tip:** JSON import is best for full backups and restores. Use CSV import when adding items from a spreadsheet.

---

## CSV

### CSV-Exporting

The exported CSV uses the following fixed column order:

```csv
name,quantity,location,barcode,expiresAt,category,tags,shelf_life_days,depletion_threshold,createdAt
```

- Values that contain commas are double-quoted.
- `barcode` and `category` are empty strings when not set.
- `expiresAt` is a date-only string (`YYYY-MM-DD`); `createdAt` is a full ISO 8601 timestamp.
- `tags` is a semicolon-separated list (e.g. `organic;bulk`); empty string if none.
- `shelf_life_days` and `depletion_threshold` are empty strings when not set.

#### Example export

```csv
name,quantity,location,barcode,expiresAt,category,tags,shelf_life_days,depletion_threshold,createdAt
"Whole Milk",2,fridge,5000112637922,2026-05-25,dairy,organic;fridge-door,10,1,2026-05-15T08:00:00.000Z
Penne,3,pantry,,2027-12-31,pasta,,730,,2026-05-10T10:00:00.000Z
"Free-range Eggs, 6pk",6,fridge,5010029005120,2026-06-01,eggs,,21,2,2026-05-18T09:00:00.000Z
```

> **Note:** CSV export omits `id`, `recurring`, `restockQuantity`, and per-item photo data. Use JSON export for a complete, lossless backup.

### CSV-Importing

The CSV importer is more flexible than the exporter; it accepts any column order and a wider set of column names. Column headers are **case-insensitive** and matched after lowercasing.

#### Column reference

| Column name | Required | Type | Notes |
| ----------- | -------- | ---- | ----- |
| `name` | **Yes** | `string` | Item display name. Rows with an empty name are skipped. |
| `expires_at` | **Yes** | `string` | Expiry date. See [date formats](#date-formats) below. Also accepted as `expiresat` (no underscore). |
| `location` | **Yes** | `string` | Must be exactly `fridge`, `freezer`, or `pantry` (case-sensitive). Rows with any other value, including custom locations defined in Settings, are skipped. |
| `quantity` | No | `number` | Defaults to `1` if missing or non-numeric. Always at least `1`. |
| `barcode` | No | `string` | Leave empty if none. |
| `category` | No | `string` | Free-text category label. |
| `shelf_life_days` | No | `number` | Shelf life in days. If omitted, calculated from `expires_at` minus today. Always at least `1`. |
| `tags` | No | `string` | Semicolon-separated list of tags, e.g. `organic;bulk;fridge-door`. |
| `depletion_threshold` | No | `number` | Low-stock alert threshold. Leave empty for none. |

#### Date formats

`expires_at` accepts the following formats:

| Format | Example | Notes |
| ------ | ------- | ----- |
| `YYYY-MM-DD` | `2026-06-01` | Recommended. Stored as `2026-06-01T23:59:59.000Z`. |
| Full ISO timestamp | `2026-06-01T23:59:59.000Z` | Date portion extracted; the time component is discarded. |

This means re-importing a file that was previously exported (which uses date-only `expiresAt`) works correctly. Locale-specific formats such as `06/01/2026` are not accepted; use `YYYY-MM-DD`.

#### Rows that are skipped

A row is skipped (counted in the "X rows skipped" status message) if:

- `name` is empty or missing
- `expires_at` / `expiresat` is empty, missing, or not a parseable date
- `location` is not one of `fridge`, `freezer`, `pantry`
- The entire row throws an unexpected parse error

Skipped rows do not cause the import to fail; the rest of the file continues to be processed.

> **Custom locations:** The CSV importer only accepts the three built-in location values. Items stored in custom locations (e.g. `garage`, `wine rack`) are exported to CSV correctly but cannot be re-imported from CSV; those rows will be skipped. Use JSON export/import for a lossless round-trip that preserves custom locations.

#### Column order

Columns can appear in any order. The importer matches by header name, not position. Extra columns are ignored.

#### Example import file

```csv
name,quantity,location,expires_at,barcode,category,shelf_life_days,tags,depletion_threshold
Whole Milk,2,fridge,2026-05-25,5000112637922,dairy,10,organic;fridge-door,1
Penne,3,pantry,2027-12-31,,pasta,730,,
"Free-range Eggs, 6pk",6,fridge,2026-06-01,5010029005120,eggs,21,,,2
Frozen Peas,4,freezer,2027-03-01,,vegetables,365,bulk,
```

> **Tip:** When creating a CSV by hand or from a spreadsheet, use `YYYY-MM-DD` for `expires_at` and separate multiple tags with semicolons, not commas.

---

## Format comparison

| | JSON export | CSV export | JSON import | CSV import |
| - | :-----------: | :----------: | :-----------: | :----------: |
| `id` | ✅ | ❌ | ✅ preserved | ❌ new UUIDs assigned |
| `name` | ✅ | ✅ | ✅ | ✅ |
| `quantity` | ✅ | ✅ | ✅ | ✅ |
| `location` | ✅ | ✅ | ✅ | ✅ |
| `barcode` | ✅ | ✅ | ✅ | ✅ |
| `expiresAt` / `expires_at` | ✅ full ISO | ✅ date only | ✅ | ✅ |
| `shelfLifeDays` | ✅ | ✅ (`shelf_life_days`) | ✅ | ✅ (`shelf_life_days`) |
| `category` | ✅ | ✅ | ✅ | ✅ |
| `tags` | ✅ | ✅ semicolon-separated | ✅ | ✅ semicolon-separated |
| `depletionThreshold` | ✅ | ✅ (`depletion_threshold`) | ✅ | ✅ (`depletion_threshold`) |
| `recurring` / `restockQuantity` | ✅ | ❌ | ✅ | ❌ |
| `photo` | ✅ | ❌ | ✅ | ❌ |
| `createdAt` / `updatedAt` | ✅ | `createdAt` only | ✅ preserved | ❌ set to import time |

**For a lossless round-trip (export → edit → re-import), always use JSON.**  
CSV export omits `id`, `recurring`, `restockQuantity`, and per-item photos. CSV import creates new item IDs and timestamps.

---

## Barcode import

The **Import barcodes (.txt)** button in the Data section accepts a plain text file with one barcode per line.

```txt
5000112637922
5010029005120
3017620429484
```

For each barcode the app:

1. Queries Open Food Facts for the product name, category, and nutritional info.
2. Creates a new inventory item using your **default shelf life** and **default storage location** from Settings.
3. Saves the nutritional profile (kcal/100g, allergens) to the barcode profile store.

A progress bar tracks enrichment. Barcodes that Open Food Facts does not recognise are still imported, using the raw barcode string as the item name.

> **Note:** Barcode import always creates new items with new UUIDs. It does not deduplicate against existing inventory.
