import React from 'react';
import { ChevronRight } from 'lucide-react';
import './TripCard.css';

const fmt = (n) => 'Rs ' + Math.round(n || 0).toLocaleString('en-US');

export default function TripCard({ trip, onClick }) {
  return (
    <button className="stub-card trip-card" onClick={onClick}>
      <div className="trip-card__top">
        <div className="trip-card__date">
          {new Date(trip.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
        <div className="route">
          <span className="route-dot" />
          <span className="route-place">{trip.origin}</span>
          <span className="route-line" />
          <ChevronRight size={12} />
          <span className="route-line" />
          <span className="route-place">{trip.destination}</span>
          <span className="route-dot" />
        </div>
      </div>
      <div className="trip-card__stats">
        <div>
          <div className="mini-label">DISTANCE</div>
          <div className="mini-value">{trip.distance} km</div>
        </div>
        <div>
          <div className="mini-label">REVENUE</div>
          <div className="mini-value">{fmt(trip.revenue)}</div>
        </div>
        <div>
          <div className="mini-label">COST</div>
          <div className="mini-value mini-value--red">{fmt(trip.totalCost)}</div>
        </div>
        <div>
          <div className="mini-label">PROFIT</div>
          <div className="mini-value mini-value--green">{fmt(trip.profit)}</div>
        </div>
      </div>
    </button>
  );
}