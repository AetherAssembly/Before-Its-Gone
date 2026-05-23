import type { InventoryItem } from './models';

const BRAND = '#6366f1';
const BG = '#020617';
const SURFACE = '#0f172a';
const BORDER = '#334155';
const TEXT = '#e2e8f0';
const MUTED = '#94a3b8';
const DANGER = '#ef4444';
const WARNING = '#f59e0b';

function base(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:Inter,system-ui,sans-serif;color:${TEXT};">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:${SURFACE};border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
        <tr><td style="background:${BRAND};padding:20px 28px;">
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff;">Before It&rsquo;s Gone</h1>
          <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">${title}</p>
        </td></tr>
        <tr><td style="padding:24px 28px;">${bodyHtml}</td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid ${BORDER};font-size:12px;color:${MUTED};">
          Sent by Before It&rsquo;s Gone &mdash; your local food expiry tracker. To stop these emails, open the app and go to Settings &rarr; Email Notifications.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function itemRow(item: InventoryItem, accentColor: string): string {
  const expiry = new Date(item.expiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid ${BORDER};">
      <strong style="color:${TEXT};">${item.name}</strong>
      ${item.category ? `<span style="margin-left:8px;font-size:12px;color:${MUTED};">${item.category}</span>` : ''}
    </td>
    <td style="padding:8px 0;border-bottom:1px solid ${BORDER};text-align:right;white-space:nowrap;">
      <span style="color:${accentColor};font-weight:600;">${expiry}</span>
      <span style="color:${MUTED};font-size:12px;margin-left:8px;">&middot; ${item.quantity} unit${item.quantity !== 1 ? 's' : ''} &middot; ${item.location}</span>
    </td>
  </tr>`;
}

export function renderExpiryAlert(expired: InventoryItem[], expiringSoon: InventoryItem[]): string {
  const rows: string[] = [
    ...expired.map((i) => itemRow(i, DANGER)),
    ...expiringSoon.map((i) => itemRow(i, WARNING)),
  ];

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;color:${TEXT};">
      ${expired.length > 0 ? `<strong>${expired.length}</strong> item${expired.length !== 1 ? 's' : ''} expired` : ''}
      ${expired.length > 0 && expiringSoon.length > 0 ? ' and ' : ''}
      ${expiringSoon.length > 0 ? `<strong>${expiringSoon.length}</strong> expiring soon` : ''}
      in your inventory.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="font-size:14px;">
      ${rows.join('\n')}
    </table>`;

  return base('Expiry Alert', bodyHtml);
}

export function renderDepletionAlert(items: InventoryItem[]): string {
  const rows = items.map((item) => {
    const threshold = item.depletionThreshold ?? 0;
    return `<tr>
      <td style="padding:8px 0;border-bottom:1px solid ${BORDER};">
        <strong style="color:${TEXT};">${item.name}</strong>
        ${item.category ? `<span style="margin-left:8px;font-size:12px;color:${MUTED};">${item.category}</span>` : ''}
      </td>
      <td style="padding:8px 0;border-bottom:1px solid ${BORDER};text-align:right;white-space:nowrap;">
        <span style="color:${WARNING};font-weight:600;">${item.quantity} left</span>
        ${threshold ? `<span style="color:${MUTED};font-size:12px;margin-left:6px;">(threshold: ${threshold})</span>` : ''}
        <span style="color:${MUTED};font-size:12px;margin-left:8px;">&middot; ${item.location}</span>
      </td>
    </tr>`;
  }).join('\n');

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;color:${TEXT};">
      <strong>${items.length}</strong> item${items.length !== 1 ? 's are' : ' is'} running low and may need restocking.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="font-size:14px;">
      ${rows}
    </table>`;

  return base('Low Stock Alert', bodyHtml);
}

export function renderDigest(options: {
  expired: InventoryItem[];
  expiringSoon: InventoryItem[];
  depleted: InventoryItem[];
  digestType: 'daily' | 'weekly';
}): string {
  const { expired, expiringSoon, depleted, digestType } = options;
  const sections: string[] = [];

  if (expired.length > 0 || expiringSoon.length > 0) {
    const rows = [
      ...expired.map((i) => itemRow(i, DANGER)),
      ...expiringSoon.map((i) => itemRow(i, WARNING)),
    ];
    sections.push(`
      <h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:${TEXT};">Expiring Items</h2>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="font-size:14px;margin-bottom:24px;">
        ${rows.join('\n')}
      </table>`);
  }

  if (depleted.length > 0) {
    const rows = depleted.map((item) => {
      const threshold = item.depletionThreshold ?? 0;
      return `<tr>
        <td style="padding:8px 0;border-bottom:1px solid ${BORDER};"><strong style="color:${TEXT};">${item.name}</strong></td>
        <td style="padding:8px 0;border-bottom:1px solid ${BORDER};text-align:right;color:${WARNING};">${item.quantity} left${threshold ? ` / ${threshold}` : ''}</td>
      </tr>`;
    }).join('\n');
    sections.push(`
      <h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:${TEXT};">Low Stock</h2>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="font-size:14px;">
        ${rows}
      </table>`);
  }

  const intro = sections.length === 0
    ? `<p style="color:${MUTED};font-size:14px;">Everything looks good &mdash; no expiring or low-stock items right now.</p>`
    : `<p style="margin:0 0 20px;font-size:15px;color:${TEXT};">Here&rsquo;s your ${digestType} inventory summary.</p>`;

  return base(`${digestType.charAt(0).toUpperCase() + digestType.slice(1)} Digest`, intro + sections.join(''));
}
