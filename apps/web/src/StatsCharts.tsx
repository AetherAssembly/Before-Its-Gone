import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { calculateExpiryStatus, type InventoryItem } from '@before-its-gone/core';

type Props = { items: InventoryItem[]; warningWindowDays: number };

const LOCATION_COLORS = ['#22d3ee', '#6366f1', '#f59e0b', '#34d399', '#f43f5e', '#a78bfa'];

function buildLocationData(items: InventoryItem[]) {
  const counts: Record<string, number> = {};
  for (const item of items) counts[item.location] = (counts[item.location] ?? 0) + 1;
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function buildCategoryData(items: InventoryItem[]) {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = item.category ?? 'uncategorised';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length <= 8) return sorted.map(([name, value]) => ({ name, value }));
  const top = sorted.slice(0, 7).map(([name, value]) => ({ name, value }));
  const otherTotal = sorted.slice(7).reduce((s, [, v]) => s + v, 0);
  return [...top, { name: 'other', value: otherTotal }];
}

function buildExpiryCountdown(items: InventoryItem[], warningWindowDays: number) {
  const now = Date.now();
  const dayMs = 86400000;
  return Array.from({ length: 7 }, (_, i) => {
    const day = i + 1;
    const dayStart = now + i * dayMs;
    const dayEnd = now + day * dayMs;
    const count = items.filter(item => {
      const t = new Date(item.expiresAt).getTime();
      return t >= dayStart && t < dayEnd &&
        calculateExpiryStatus(item.expiresAt, warningWindowDays) !== 'expired';
    }).length;
    return { name: `Day ${day}`, count };
  });
}

export function StatsCharts({ items, warningWindowDays }: Props) {
  const locationData = useMemo(() => buildLocationData(items), [items]);
  const categoryData = useMemo(() => buildCategoryData(items), [items]);
  const countdownData = useMemo(() => buildExpiryCountdown(items, warningWindowDays), [items, warningWindowDays]);

  if (items.length === 0) return null;

  return (
    <div className="stats-charts">
      <div className="charts-grid">
        <div className="chart-block">
          <h3 className="chart-title">By location</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={locationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`} labelLine={false}>
                {locationData.map((_, i) => (
                  <Cell key={i} fill={LOCATION_COLORS[i % LOCATION_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.8rem' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-block">
          <h3 className="chart-title">By category</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={90} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.8rem' }} />
              <Bar dataKey="value" fill="var(--indigo)" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-block chart-block--wide">
          <h3 className="chart-title">Expiring in the next 7 days</h3>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={countdownData} margin={{ left: 4, right: 4, top: 4, bottom: 4 }}>
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={24} />
              <Tooltip contentStyle={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.8rem' }} />
              <Bar dataKey="count" fill="var(--warning)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
