import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { InventoryItem } from '@aetherAssembly/big-core';

// Table name used in Supabase. User must run SETUP_SQL once in their project.
const TABLE = 'inventory_sync';

export const SETUP_SQL = `-- Run once in your Supabase SQL editor
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
  with check (auth.uid() = user_id);`;

type SyncRow = { id: string; user_id: string; updated_at: string; data: InventoryItem };

export class SyncService {
  private client: SupabaseClient | null = null;
  private currentUser: User | null = null;

  connect(supabaseUrl: string, supabaseAnonKey: string): void {
    if (!supabaseUrl || !supabaseAnonKey) { this.client = null; return; }
    this.client = createClient(supabaseUrl, supabaseAnonKey);
  }

  async signIn(email: string, password: string): Promise<User> {
    if (!this.client) throw new Error('Not connected; configure Supabase URL and anon key first.');
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Sign-in succeeded but no user returned.');
    this.currentUser = data.user;
    return data.user;
  }

  async signUp(email: string, password: string): Promise<User> {
    if (!this.client) throw new Error('Not connected.');
    const { data, error } = await this.client.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Sign-up succeeded but no user returned.');
    this.currentUser = data.user;
    return data.user;
  }

  async signOut(): Promise<void> {
    await this.client?.auth.signOut();
    this.currentUser = null;
  }

  async restoreSession(): Promise<User | null> {
    if (!this.client) return null;
    const { data } = await this.client.auth.getSession();
    this.currentUser = data.session?.user ?? null;
    return this.currentUser;
  }

  getUser(): User | null { return this.currentUser; }

  isReady(): boolean { return this.client !== null && this.currentUser !== null; }

  async sync(localItems: InventoryItem[]): Promise<{ merged: InventoryItem[]; pushed: number; pulled: number }> {
    if (!this.client || !this.currentUser) throw new Error('Not signed in.');
    const userId = this.currentUser.id;

    // Push local items to remote (upsert)
    const rows: SyncRow[] = localItems.map((item) => ({
      id: item.id,
      user_id: userId,
      updated_at: item.updatedAt,
      data: item,
    }));

    if (rows.length > 0) {
      const { error } = await this.client.from(TABLE).upsert(rows, { onConflict: 'id,user_id' });
      if (error) throw new Error(`Push failed: ${error.message}`);
    }

    // Pull remote items
    const { data: remote, error: fetchError } = await this.client
      .from(TABLE)
      .select('data')
      .eq('user_id', userId);

    if (fetchError) throw new Error(`Pull failed: ${fetchError.message}`);

    const remoteItems: InventoryItem[] = (remote ?? []).map((r: { data: InventoryItem }) => r.data);

    // Merge: last-write-wins by updatedAt
    const mergedMap = new Map<string, InventoryItem>();
    for (const item of localItems) mergedMap.set(item.id, item);
    for (const item of remoteItems) {
      const existing = mergedMap.get(item.id);
      if (!existing || item.updatedAt > existing.updatedAt) {
        mergedMap.set(item.id, item);
      }
    }

    const merged = [...mergedMap.values()];
    const pulled = remoteItems.filter((r) => {
      const local = localItems.find((l) => l.id === r.id);
      return !local || r.updatedAt > local.updatedAt;
    }).length;

    return { merged, pushed: rows.length, pulled };
  }
}

export const syncService = new SyncService();
