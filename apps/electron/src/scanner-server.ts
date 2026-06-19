import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';
import selfsigned from 'selfsigned';
import { buildScannerHtml } from './scanner-html.js';
import {
  compose,
  withMethod,
  withQueryToken,
  withBodyJson,
  withAuth,
  type RequestWithBody,
} from './scanner-middleware.js';

// Inline shelf-life prediction (avoids ESM/CJS boundary with @aetherAssembly/big-core)
type StorageLocation = 'fridge' | 'freezer' | 'pantry';

const CATEGORY_SHELF_LIFE: Record<string, Record<StorageLocation, number>> = {
  dairy:      { fridge: 10,  freezer: 90,  pantry: 3   },
  eggs:       { fridge: 35,  freezer: 365, pantry: 7   },
  meat:       { fridge: 4,   freezer: 120, pantry: 1   },
  poultry:    { fridge: 3,   freezer: 120, pantry: 1   },
  fish:       { fridge: 3,   freezer: 120, pantry: 1   },
  fruits:     { fridge: 14,  freezer: 365, pantry: 7   },
  vegetables: { fridge: 10,  freezer: 365, pantry: 5   },
  bread:      { fridge: 14,  freezer: 90,  pantry: 7   },
  pasta:      { fridge: 730, freezer: 730, pantry: 730 },
  cereals:    { fridge: 365, freezer: 365, pantry: 365 },
  canned:     { fridge: 7,   freezer: 1095, pantry: 1095 },
  frozen:     { fridge: 7,   freezer: 365, pantry: 1   },
  beverages:  { fridge: 30,  freezer: 365, pantry: 365 },
  snacks:     { fridge: 180, freezer: 365, pantry: 180 },
  condiments: { fridge: 365, freezer: 365, pantry: 365 },
  spices:     { fridge: 730, freezer: 730, pantry: 730 },
  oils:       { fridge: 365, freezer: 365, pantry: 365 },
  nuts:       { fridge: 180, freezer: 365, pantry: 90  },
  sweets:     { fridge: 180, freezer: 365, pantry: 180 },
};

const DEFAULTS: Record<StorageLocation, number> = { fridge: 14, freezer: 365, pantry: 30 };

const OFB_CATEGORY_MAP: Array<[RegExp, string]> = [
  [/dairy|milk|cream|fromage|cheese|yogurt|butter/i, 'dairy'],
  [/egg/i,                                            'eggs'],
  [/meat|beef|pork|lamb|veal|deli/i,                 'meat'],
  [/poultry|chicken|turkey|duck/i,                   'poultry'],
  [/fish|salmon|tuna|cod|seafood|shellfish/i,         'fish'],
  [/fruit|berr|apple|orange|banana|grape|melon/i,     'fruits'],
  [/vegetable|veggie|salad|greens|spinach|carrot/i,   'vegetables'],
  [/bread|bakery|biscuit|cracker|pastry/i,            'bread'],
  [/pasta|noodle|spaghetti|macaroni/i,                'pasta'],
  [/rice|grain|quinoa|oat|cereal/i,                   'cereals'],
  [/canned|tinned|conserv/i,                          'canned'],
  [/frozen/i,                                         'frozen'],
  [/beverage|drink|juice|water|soda|coffee|tea/i,     'beverages'],
  [/snack|chip|crisp|popcorn/i,                       'snacks'],
  [/sauce|condiment|ketchup|mustard|mayo/i,           'condiments'],
  [/spice|herb|seasoning/i,                           'spices'],
  [/oil|vinegar/i,                                    'oils'],
  [/nut|almond|cashew|peanut|walnut/i,                'nuts'],
  [/chocolate|candy|sweet|confection/i,               'sweets'],
];

function predictShelfLifeCategory(ofbCategories: string[]): string | null {
  const combined = ofbCategories.join(' ').toLowerCase();
  for (const [pattern, key] of OFB_CATEGORY_MAP) {
    if (pattern.test(combined)) return key;
  }
  return null;
}

function predictShelfLife(ofbCategories: string[], location: StorageLocation): number {
  const matched = predictShelfLifeCategory(ofbCategories);
  const table = matched ? (CATEGORY_SHELF_LIFE[matched] ?? DEFAULTS) : DEFAULTS;
  return table[location];
}

export type PhoneSavePayload = {
  barcode: string;
  name: string;
  quantity: number;
  location: 'fridge' | 'freezer' | 'pantry';
  category: string | null;
  shelfLifeDays: number;
  expiresAt: string | null;
};

type OFBProduct = {
  name: string;
  imageUrl: string | null;
  suggestedShelfLifeDays: number;
  category: string | null;
  caloriesPer100g: number | null;
  allergens: string[];
};

let activeServer: https.Server | null = null;

export const LINUX_SCANNER_PORT = 45678;

const VIRTUAL_ADAPTER_PATTERNS = [
  /vethernet/i, /vmware/i, /virtualbox/i, /docker/i,
  /hyper-v/i, /bluetooth/i, /teredo/i, /isatap/i, /loopback/i,
  /pseudo/i, /tunnel/i, /6to4/i,
];

function isPrivateIp(address: string): boolean {
  return (
    address.startsWith('10.') ||
    address.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(address)
  );
}

function getLanIp(): string {
  const interfaces = os.networkInterfaces();

  for (const [name, iface] of Object.entries(interfaces)) {
    if (!iface) continue;
    if (VIRTUAL_ADAPTER_PATTERNS.some((p) => p.test(name))) continue;
    for (const entry of iface) {
      if (entry.family === 'IPv4' && !entry.internal && isPrivateIp(entry.address)) {
        return entry.address;
      }
    }
  }

  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const entry of iface) {
      if (entry.family === 'IPv4' && !entry.internal && isPrivateIp(entry.address)) {
        return entry.address;
      }
    }
  }

  return '127.0.0.1';
}

function tryAddWindowsFirewallRule(port: number): void {
  if (process.platform !== 'win32') return;
  const name = 'Before Its Gone Scanner';
  exec(`netsh advfirewall firewall delete rule name="${name}"`, () => {
    exec(
      `netsh advfirewall firewall add rule name="${name}" protocol=TCP dir=in localport=${port} action=allow profile=private,public`,
      () => {}
    );
  });
}

function tryAddLinuxFirewallRule(port: number): void {
  if (process.platform !== 'linux') return;
  exec('which ufw', (ufwErr) => {
    if (!ufwErr) {
      exec(`ufw allow ${port}/tcp`, () => {});
      return;
    }
    exec('which firewall-cmd', (fwErr) => {
      if (!fwErr) {
        exec(`firewall-cmd --add-port=${port}/tcp --temporary`, () => {});
        return;
      }
      console.warn(`[scanner] No firewall tool found. Open port ${port}/tcp manually if the phone cannot connect.`);
    });
  });
}

interface PersistedCert { private: string; cert: string; expiresAt: string }

async function loadOrGenerateCert(userDataPath: string): Promise<{ private: string; cert: string }> {
  const certPath = path.join(userDataPath, 'scanner-cert.json');
  try {
    const raw = fs.readFileSync(certPath, 'utf-8');
    const stored = JSON.parse(raw) as PersistedCert;
    if (new Date(stored.expiresAt) > new Date()) {
      return { private: stored.private, cert: stored.cert };
    }
  } catch {
    // File missing or malformed; fall through to generate
  }

  const pems = await selfsigned.generate(
    [{ name: 'commonName', value: 'Before Its Gone Scanner' }],
    { days: 365, keySize: 2048 } as never
  );

  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  const stored: PersistedCert = { private: pems.private, cert: pems.cert, expiresAt: expiresAt.toISOString() };

  try {
    fs.writeFileSync(certPath, JSON.stringify(stored), 'utf-8');
  } catch {
    // Non-fatal; cert will just regenerate next session
  }

  return { private: pems.private, cert: pems.cert };
}

async function lookupProduct(barcode: string): Promise<OFBProduct> {
  const defaultProduct: OFBProduct = {
    name: '',
    imageUrl: null,
    suggestedShelfLifeDays: 30,
    category: null,
    caloriesPer100g: null,
    allergens: [],
  };

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`
    );
    if (!res.ok) return defaultProduct;

    const payload = await res.json() as {
      product?: {
        product_name?: string;
        image_url?: string;
        image_thumb_url?: string;
        categories_tags?: string[];
        nutriments?: Record<string, unknown>;
        allergens_tags?: string[];
      };
    };

    const p = payload.product;
    if (!p) return defaultProduct;

    const name = p.product_name?.trim() ?? '';
    const imageUrl = p.image_thumb_url ?? p.image_url ?? null;
    const categoriesTags = p.categories_tags ?? [];
    const category = predictShelfLifeCategory(categoriesTags);
    const suggestedShelfLifeDays = predictShelfLife(categoriesTags, 'fridge');

    const rawCal = p.nutriments?.['energy-kcal_100g'];
    const caloriesPer100g = typeof rawCal === 'number' ? Math.round(rawCal) : null;

    const allergens = (p.allergens_tags ?? [])
      .map((t) => t.replace(/^en:/, ''))
      .filter(Boolean);

    return { name, imageUrl, suggestedShelfLifeDays, category, caloriesPer100g, allergens };
  } catch {
    return defaultProduct;
  }
}

export async function startScannerServer(
  onBarcode: (barcode: string) => void,
  onSaveItem: (data: PhoneSavePayload) => Promise<void>,
  userDataPath: string
): Promise<{ port: number; token: string; lanIp: string }> {
  stopScannerServer();

  const token = crypto.randomUUID();
  const html = buildScannerHtml(token);
  const lanIp = getLanIp();

  const pems = await loadOrGenerateCert(userDataPath);

  const scanRoute = compose(withMethod('POST'), withBodyJson(), withAuth(token));
  const saveRoute = compose(withMethod('POST'), withBodyJson(), withAuth(token));

  return new Promise((resolve, reject) => {
    const server = https.createServer(
      { key: pems.private, cert: pems.cert },
      async (req: http.IncomingMessage, res: http.ServerResponse) => {
        const url = new URL(req.url ?? '/', 'https://localhost');

        if (url.pathname === '/') {
          await compose(withMethod('GET'), withQueryToken(token))(req, res, async () => {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
          });
          return;
        }

        if (url.pathname === '/scan') {
          await scanRoute(req, res, async () => {
            const body = (req as RequestWithBody).body;
            if (typeof body.barcode !== 'string' || !body.barcode.trim()) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing barcode' }));
              return;
            }
            const barcode = body.barcode.trim();
            onBarcode(barcode);
            const product = await lookupProduct(barcode);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, product }));
          });
          return;
        }

        if (url.pathname === '/save') {
          await saveRoute(req, res, async () => {
            const body = (req as RequestWithBody).body;
            const location = body.location as string | undefined;
            if (
              typeof body.name !== 'string' || !body.name.trim() ||
              !['fridge', 'freezer', 'pantry'].includes(location ?? '')
            ) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing required fields' }));
              return;
            }
            try {
              const rawExpiresAt = typeof body.expiresAt === 'string' && body.expiresAt.trim() ? body.expiresAt.trim() : null;
              await onSaveItem({
                barcode: typeof body.barcode === 'string' ? body.barcode.trim() : '',
                name: (body.name as string).trim(),
                quantity: Math.max(1, Number(body.quantity) || 1),
                location: location as 'fridge' | 'freezer' | 'pantry',
                category: typeof body.category === 'string' ? body.category.trim() || null : null,
                shelfLifeDays: Math.max(1, Number(body.shelfLifeDays) || 30),
                expiresAt: rawExpiresAt && !isNaN(new Date(rawExpiresAt).getTime()) ? rawExpiresAt : null,
              });
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: true }));
            } catch {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Save failed' }));
            }
          });
          return;
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      }
    );

    server.on('error', reject);

    const listenPort = process.platform === 'linux' ? LINUX_SCANNER_PORT : 0;
    server.listen(listenPort, '0.0.0.0', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Unexpected server address'));
        return;
      }
      activeServer = server;
      const port = addr.port;
      tryAddWindowsFirewallRule(port);
      tryAddLinuxFirewallRule(port);
      resolve({ port, token, lanIp });
    });
  });
}

export function stopScannerServer(): void {
  if (activeServer) {
    activeServer.close();
    activeServer = null;
  }
}
