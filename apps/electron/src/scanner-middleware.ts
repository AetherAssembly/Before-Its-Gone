import http from 'node:http';

export interface RequestWithBody extends http.IncomingMessage {
  body: Record<string, unknown>;
}

type Next = () => Promise<void>;
export type Middleware = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: Next
) => Promise<void>;

export function compose(...layers: Middleware[]): Middleware {
  return async (req, res, next) => {
    let index = 0;
    const run = async (): Promise<void> => {
      if (index >= layers.length) { await next(); return; }
      await layers[index++](req, res, run);
    };
    await run();
  };
}

export function withMethod(method: string): Middleware {
  return async (req, res, next) => {
    if (req.method !== method) {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    await next();
  };
}

export function withBodyJson(): Middleware {
  return async (req, res, next) => {
    let raw = '';
    await new Promise<void>((resolve, reject) => {
      req.on('data', (chunk: Buffer) => { raw += chunk.toString(); });
      req.on('end', resolve);
      req.on('error', reject);
    });
    try {
      (req as RequestWithBody).body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }
    await next();
  };
}

export function withAuth(sessionToken: string): Middleware {
  return async (req, res, next) => {
    const body = (req as RequestWithBody).body;
    if (body?.token !== sessionToken) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }
    await next();
  };
}

export function withQueryToken(sessionToken: string): Middleware {
  return async (req, res, next) => {
    const url = new URL(req.url ?? '/', 'https://localhost');
    if (url.searchParams.get('token') !== sessionToken) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }
    await next();
  };
}
