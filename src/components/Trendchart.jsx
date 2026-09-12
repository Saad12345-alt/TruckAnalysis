import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { aggregateTrendByDate, formatDateLabel, formatRs, formatK } from '../utils/chartdata';
import './Trendchart.css';

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__date">{formatDateLabel(label)}</div>
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__label" style={{ color: 'var(--amber)' }}>Revenue</span>
        <span style={{ color: 'var(--amber)' }}>{formatRs(point.revenue)}</span>
      </div>
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__label" style={{ color: 'var(--red)' }}>Cost</span>
        <span style={{ color: 'var(--red)' }}>{formatRs(point.cost)}</span>
      </div>
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__label" style={{ color: 'var(--green)' }}>Profit</span>
        <span style={{ color: 'var(--green)' }}>{formatRs(point.profit)}</span>
      </div>
    </div>
  );
}

export default function TrendChart({ trips }) {
  // Recomputed only when the trips array actually changes (not on every
  // Dashboard re-render) since useTrips.refetch() gives us a new array
  // reference each time it reloads.
  const data = useMemo(() => aggregateTrendByDate(trips), [trips]);

  if (data.length === 0) {
    return <div className="chart-panel chart-panel--empty">No trips in this range yet.</div>;
  }

  return (
    <div className="chart-panel">
      <h3 className="chart-panel__title">REVENUE · COST · PROFIT OVER TIME</h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            stroke="var(--chart-axis-line)"
            tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
          />
          <YAxis
            tickFormatter={formatK}
            stroke="var(--chart-axis-line)"
            tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
          />
          <Tooltip content={<TrendTooltip />} />
          <Line type="monotone" dataKey="revenue" name="Revenue" stroke="var(--amber)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="cost" name="Cost" stroke="var(--red)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="profit" name="Profit" stroke="var(--green)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}