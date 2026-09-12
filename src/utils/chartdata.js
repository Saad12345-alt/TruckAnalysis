// Aggregation helpers for the dashboard charts. Kept separate from the
// recharts-specific components (TrendChart, CostBreakdownChart) so the
// "how do we roll trips up into chart data" logic can change independently
// of how it's rendered.

// Postgres DATE columns can come back as JS Date objects (node-postgres'
// default parsing) or as plain 'YYYY-MM-DD' strings depending on the query
// path (live DB vs. the in-memory fallback in tripModel.js) — normalize
// both to a 'YYYY-MM-DD' string so grouping/sorting is consistent either way.
function toDateKey(date) {
  if (!date) return '';
  if (date instanceof Date) return date.toISOString().slice(0, 10);
  return String(date).slice(0, 10);
}

// Groups trips by date and sums revenue/cost/profit per day, sorted oldest
// to newest. Multiple trips on the same date get folded into one point.
export function aggregateTrendByDate(trips = []) {
  const byDate = new Map();

  trips.forEach((trip) => {
    const key = toDateKey(trip.date);
    if (!key) return;

    const revenue = Number(trip.revenue || 0);
    const cost = Number(trip.totalCost ?? 0);
    const profit = Number(trip.profit ?? revenue - cost);

    const existing = byDate.get(key) || { date: key, revenue: 0, cost: 0, profit: 0 };
    existing.revenue += revenue;
    existing.cost += cost;
    existing.profit += profit;
    byDate.set(key, existing);
  });

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// Sums each cost category (fuel/tolls/maintenance/other) across all trips.
export function aggregateCostBreakdown(trips = []) {
  const totals = trips.reduce(
    (acc, trip) => {
      const cost = trip.cost || {};
      acc.fuel += Number(cost.fuel || 0);
      acc.tolls += Number(cost.tolls || 0);
      acc.maintenance += Number(cost.maintenance || 0);
      acc.other += Number(cost.other || 0);
      return acc;
    },
    { fuel: 0, tolls: 0, maintenance: 0, other: 0 }
  );

  return [
    { name: 'FUEL', value: totals.fuel },
    { name: 'TOLLS', value: totals.tolls },
    { name: 'MAINTENANCE', value: totals.maintenance },
    { name: 'OTHER', value: totals.other },
  ];
}

// 'YYYY-MM-DD' -> 'MM-DD' for compact axis/tooltip labels.
export function formatDateLabel(isoDate) {
  const parts = String(isoDate || '').split('-');
  return parts.length === 3 ? `${parts[1]}-${parts[2]}` : isoDate;
}

export function formatRs(value) {
  return `Rs ${Number(value || 0).toLocaleString()}`;
}

export function formatK(value) {
  return `${Math.round(Number(value || 0) / 1000)}k`;
}