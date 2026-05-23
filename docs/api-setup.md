# External API Setup

Before It's Gone integrates with several external services. Most are free and require no account. This guide covers what each service does, whether you need to configure it, and how.

---

## Overview

| Service | Purpose | Account required | API key required |
|---------|---------|-----------------|-----------------|
| [Open Food Facts](#open-food-facts) | Barcode lookup, nutritional info | No | No |
| [TheMealDB](#themealdb) | Recipe suggestions | No | No |
| [Resend](#resend) | Email notifications | Yes (free tier available) | Yes |
| [Supabase](#supabase) | Optional cloud sync | Yes (free tier available) | No — anon key only |

---

## Open Food Facts

**What it does:** Looks up barcodes to retrieve product names, categories, kcal per 100g, and allergen tags. Used by:
- The phone scanner's product review card
- Barcode field lookup in the Add Item form
- Batch barcode import

**Account required:** No  
**API key required:** No  
**Cost:** Free — Open Food Facts is a non-profit open database

**Endpoints used:**

```
GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json
GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json  (batch import, per barcode)
```

**Rate limits:** Open Food Facts does not publish a hard rate limit, but excessive automated queries are discouraged. The batch barcode import processes one barcode at a time sequentially to stay within reasonable usage.

**Data sent:** The barcode string only. No personal data, no inventory content.

**No configuration needed** — the integration works out of the box.

---

## TheMealDB

**What it does:** Suggests recipes when 3 or more items in your inventory are expiring or expired. The app uses the free tier (API v1, no key needed).

**Account required:** No  
**API key required:** No (free tier uses the string `1` as the key, which the app handles internally)  
**Cost:** Free

**Endpoint used:**

```
GET https://www.themealdb.com/api/json/v1/1/filter.php?i={ingredient}
```

**Data sent:** The first word of the first expiring item's name (e.g. `chicken`, `milk`). No personal data.

**Trigger:** Automatic when 3+ items are expiring or expired. Dismissed for the current calendar day if you click the × button. Re-appears the next day if items are still expiring.

**No configuration needed.**

---

## Resend

**What it does:** Delivers email notifications (expiry alerts, digests) from the desktop app. Resend is the recommended provider for simplicity — one API key, no mail server required.

**Account required:** Yes  
**API key required:** Yes  
**Cost:** Free tier includes 3,000 emails/month and 100/day

### Setup

1. Go to [resend.com](https://resend.com) and create an account.
2. Navigate to **API Keys** → **Create API Key**.
   - Give it a name (e.g. "Before It's Gone").
   - Set **Permission** to *Sending access*.
3. Copy the key — it starts with `re_` and is shown only once.
4. Open the app → **Settings** → **Email Notifications**.
5. Set **Provider** to **Resend**, paste the key, enter a recipient email, and click **Save email settings**.
6. Click **Send test email** to verify.

### Sender address

The app sends from `notifications@beforeitsgone.local`. Resend will route this through their infrastructure. If you have a verified domain in Resend, you can modify `apps/electron/src/email-service.ts` to use it — change the `from:` field in `sendEmail()`.

### Limits and delivery

Resend routes mail through their own sending infrastructure. Deliverability depends on your recipient's mail provider. If test emails land in spam, check Resend's dashboard for bounce or spam reports.

---

## Supabase

**What it does:** Provides optional cloud sync. You create and own the Supabase project — AetherAssembly has no access to it.

**Account required:** Yes (at supabase.com)  
**API key required:** No — the app uses the project's public **anon key**, which is safe to store in localStorage  
**Cost:** Free tier includes 500 MB database, unlimited auth users

### Setup

See [docs/cloud-sync.md](cloud-sync.md) for the complete walkthrough including the required SQL migration.

Quick reference:

1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL migration from the cloud sync guide (or copy it from **Settings → Cloud sync → Show required SQL migration** in the app).
3. Go to **Project Settings → API** and copy the **Project URL** and **anon / public** key.
4. Paste both into **Settings → Cloud sync** in the app.
5. Sign in or create an account, then click **Sync now**.

### Security model

The anon key is a publishable key — it is safe to store client-side. All access is controlled by Supabase's Row Level Security policy, which restricts each user to only their own rows. Without a valid authenticated session, the anon key cannot read or write any data.

Supabase auth sessions (JWT tokens) are managed by the Supabase SDK and stored in localStorage alongside the project URL and anon key.

---

## Troubleshooting

### Barcode lookup returns no result

- The barcode may not be in Open Food Facts yet — it's community-contributed. You can add the product at [world.openfoodfacts.org](https://world.openfoodfacts.org).
- Check that the barcode was scanned or entered correctly (EAN-13, UPC-A, etc.).

### Recipe suggestions don't appear

- At least 3 items must be in an expiring-soon or expired state simultaneously.
- The banner is dismissed for the rest of the calendar day when you click ×. Dismiss date resets at midnight.
- TheMealDB may not have recipes for every ingredient — the banner only appears if results are returned.

### Resend test email not received

- Check your spam/junk folder.
- Verify the API key has *Sending access* permission (not *Full access* or *No access*).
- Check Resend's dashboard for delivery logs and error details.
- Resend free accounts cannot send to unverified domains by default — confirm your recipient address in the Resend dashboard if required.

### Supabase sync fails

- Ensure the SQL migration has been run — the `inventory_sync` table must exist.
- Verify the Row Level Security policy was created (check **Authentication → Policies** in your Supabase dashboard).
- Confirm you are signed in (the **Sync now** button only appears after sign-in).
- Check that your Supabase project is not paused — free-tier projects pause after 1 week of inactivity.
