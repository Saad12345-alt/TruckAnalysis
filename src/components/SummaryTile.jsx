import React from 'react';
import './SummaryTile.css';

export default function SummaryTile({ label, value, color }) {
  return (
    <div className="summary-tiles">
      <div className="summary-tile__label">{label}</div>
      <div className="summary-tile__value" style={{ color }}>
        Rs {Math.round(value || 0).toLocaleString('en-US')}
      </div>
    </div>
  );
}
