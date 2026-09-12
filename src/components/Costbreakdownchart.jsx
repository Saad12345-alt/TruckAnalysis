import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { aggregateCostBreakdown, formatK } from '../utils/chartdata';
import './Trendchart.css';

function BreakdownTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__label">{name}</span>
        <span>Rs {Number(value || 0).toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function CostBreakdownChart({ trips }) {
  const data = useMemo(() => aggregateCostBreakdown(trips), [trips]);
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return <div className="chart-panel chart-panel--empty">No cost data for this range yet.</div>;
  }

  return (
    <div className="chart-panel">
      <h3 className="chart-panel__title">COST BREAKDOWN</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={formatK}
            stroke="var(--chart-axis-line)"
            tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="var(--chart-axis-line)"
            tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
            width={100}
          />
          <Tooltip content={<BreakdownTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          <Bar dataKey="value" fill="var(--blue, #4a7ba6)" radius={[0, 4, 4, 0]} barSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}