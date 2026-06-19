import { useMemo } from 'react';
import { calculateExpiryStatus, type InventoryItem } from '@before-its-gone/core';

type Props = {
  items: InventoryItem[];
  warningWindowDays: number;
  onSelect: (id: string) => void;
};

const STATUS_COLORS: Record<string, string> = {
  fresh: 'var(--success)',
  'expiring-soon': 'var(--warning)',
  expired: 'var(--danger)',
};

export function ExpiryTimeline({ items, warningWindowDays, onSelect }: Props) {
  const { sorted, nowMs, rangeMs } = useMemo(() => {
    const sorted = [...items].sort(
      (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
    );
    const nowMs = Date.now();
    const maxMs = sorted.length > 0
      ? Math.max(new Date(sorted[sorted.length - 1].expiresAt).getTime(), nowMs) + 7 * 86400000
      : nowMs + 14 * 86400000;
    const minMs = Math.min(nowMs, sorted.length > 0 ? new Date(sorted[0].expiresAt).getTime() : nowMs);
    const rangeMs = Math.max(maxMs - minMs, 1);
    return { sorted, nowMs, minMs, rangeMs };
  }, [items]);

  if (sorted.length === 0) {
    return <p className="status-msg">No items to display on the timeline.</p>;
  }

  const toPercent = (ms: number) =>
    Math.max(0, Math.min(100, ((ms - (nowMs - rangeMs * 0.02)) / (rangeMs * 1.04)) * 100));

  const todayPct = toPercent(nowMs);

  return (
    <div className="expiry-timeline" role="list" aria-label="Expiry timeline">
      <div className="timeline-axis">
        <div className="timeline-today" style={{ left: `${todayPct}%` }} title="Today" />
      </div>
      {sorted.map(item => {
        const status = calculateExpiryStatus(item.expiresAt, warningWindowDays);
        const pct = toPercent(new Date(item.expiresAt).getTime());
        const color = STATUS_COLORS[status] ?? STATUS_COLORS.fresh;
        return (
          <div
            key={item.id}
            className="timeline-row"
            role="listitem"
            onClick={() => onSelect(item.id)}
            onKeyDown={e => e.key === 'Enter' && onSelect(item.id)}
            tabIndex={0}
            aria-label={`${item.name}, expires ${new Date(item.expiresAt).toLocaleDateString()}`}
          >
            <span className="timeline-label">{item.name}</span>
            <div className="timeline-track">
              <div
                className="timeline-bar"
                style={{ left: `${pct}%`, background: color }}
                title={new Date(item.expiresAt).toLocaleDateString()}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
