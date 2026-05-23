# Cloud Sync

Before It's Gone supports optional sync to a **Supabase** project you own. The app remains fully offline-first — sync is opt-in and disabled by default.

---

## How it works

- Your inventory is stored as rows in a `inventory_sync` table in your Supabase project.
- When you tap **Sync now**, the app pushes all local items to Supabase, then pulls any remote items that are newer than the local copy.
- **Conflict resolution is last-write-wins** by the `updatedAt` timestamp on each item. The most-recently-modified version of any item always wins.
- On launch, if you have saved credentials and a valid session, the app syncs automatically.
- Deleted items are not propagated — deletions are local-only. Items deleted on one device will reappear after the next sync from another device.

---

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up or sign in.
2. Create a new project. Choose a region close to you.
3. Wait for the project to finish provisioning.

### 2. Run the SQL migration

In your Supabase dashboard, open the **SQL Editor** and run the following once:

```sql
create table if not exists inventory_sync (
  id        text    not null,
  user_id   uuid    references auth.users not null,
  updated_at text   not null,
  data      jsonb   not null,
  primary key (id, user_id)
);

alter table inventory_sync enable row level security;

create policy "Users manage their own inventory"
  on inventory_sync for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

This creates the sync table and a Row Level Security policy so each user can only access their own rows.

> You can also copy this SQL directly from **Settings → Cloud sync → Show required SQL migration** in the app.

### 3. Get your project credentials

In your Supabase dashboard:

1. Go to **Project Settings → API**.
2. Copy the **Project URL** (e.g. `https://xxxx.supabase.co`).
3. Copy the **`anon` / public key** (starts with `eyJ`).

### 4. Enter credentials in the app

Open **Settings → Cloud sync** and paste in:

- **Supabase URL**
- **Supabase anon key**

### 5. Sign in or create an account

Enter an email and password, then click **Sign in** or **Create account**. After signing in, the **Sync now** button becomes available.

> Supabase's email confirmation is enabled by default for new projects. If you get a "check your email" message after signing up, confirm your email, then sign in.

---

## Syncing between devices

Install the app on a second device, enter the same Supabase URL and anon key, sign in with the same account, and click **Sync now**. Both devices will converge to the most-recently-modified version of each item.

---

## Credential storage

Your Supabase URL and anon key are stored in `before-its-gone.sync` in the browser's **localStorage** (the Electron renderer's local storage). Session tokens managed by the Supabase SDK are stored in the same localStorage namespace. Neither is sent anywhere other than your own Supabase project.

---

## Disabling sync

Click **Sign out** in **Settings → Cloud sync**. The app will stop syncing. Your local inventory is unaffected. Data already in your Supabase project is not deleted — use the Supabase dashboard to remove rows if desired.

---

## Limitations

| | |
| - | - |
| Deletions | Local-only. Items deleted on one device reappear after syncing from another. |
| Waste log | Not synced. Waste log entries are local-only. |
| Barcode profiles | Not synced. Profiles are local-only. |
| Offline edits | Queued in IndexedDB and pushed on the next **Sync now**. |
| Multiple accounts | Only one account per app install. Sign out before signing in with a different account. |
