import https from 'node:https';
import http from 'node:http';
import os from 'node:os';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';
import selfsigned from 'selfsigned';
import { buildScannerHtml } from './scanner-html.js';

let activeServer: https.Server | null = null;

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

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export async function startScannerServer(
  onBarcode: (barcode: string) => void
): Promise<{ port: number; token: string; lanIp: string }> {
  stopScannerServer();

  const token = crypto.randomUUID();
  const html = buildScannerHtml(token);
  const lanIp = getLanIp();

  const pems = await selfsigned.generate(
    [{ name: 'commonName', value: 'Before Its Gone Scanner' }],
    { days: 1, keySize: 2048 } as never
  );

  return new Promise((resolve, reject) => {
    const server = https.createServer(
      { key: pems.private, cert: pems.cert },
      async (req, res) => {
        const url = new URL(req.url ?? '/', `https://localhost`);

        if (req.method === 'GET' && url.pathname === '/') {
          if (url.searchParams.get('token') !== token) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html);
          return;
        }

        if (req.method === 'POST' && url.pathname === '/scan') {
          let body: { barcode?: string; token?: string };
          try {
            body = JSON.parse(await readBody(req)) as { barcode?: string; token?: string };
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
            return;
          }
          if (body.token !== token) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Forbidden' }));
            return;
          }
          if (typeof body.barcode !== 'string' || !body.barcode.trim()) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing barcode' }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
          onBarcode(body.barcode.trim());
          return;
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      }
    );

    server.on('error', reject);

    server.listen(0, '0.0.0.0', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Unexpected server address'));
        return;
      }
      activeServer = server;
      const port = addr.port;
      tryAddWindowsFirewallRule(port);
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
