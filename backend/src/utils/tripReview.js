// The rules for "suspicious" plus two small helpers. No database in here.

// A trip is suspicious when its distance or total cost is further than this
// from the standard of its route. Change them here.
export const DISTANCE_TOLERANCE = 0.1; // 10 %
export const COST_TOLERANCE = 0.3; // 30 %

const km = (n) => `${Number(n).toLocaleString('en-US')} km`;
const rs = (n) => `Rs ${Math.round(Number(n)).toLocaleString('en-US')}`;
const pct = (value, base) => {
  const p = Math.round(((value - base) / base) * 100);
  return `${p > 0 ? '+' : ''}${p}%`;
};

// trip and standard both need { distance, total_cost }.
// Returns { suspicious, reason } where reason explains what didn't match.
export function evaluateTrip(trip, standard) {
  const distance = Number(trip.distance);
  const cost = Number(trip.total_cost);
  const stdDistance = Number(standard.distance);
  const stdCost = Number(standard.total_cost);
  const reasons = [];

  // A standard of 0 has nothing to compare against, so that check is skipped.
  if (stdDistance > 0 && Math.abs(distance - stdDistance) / stdDistance > DISTANCE_TOLERANCE) {
    reasons.push(`Distance ${km(distance)} vs standard ${km(stdDistance)} (${pct(distance, stdDistance)})`);
  }
  if (stdCost > 0 && Math.abs(cost - stdCost) / stdCost > COST_TOLERANCE) {
    reasons.push(`Cost ${rs(cost)} vs standard ${rs(stdCost)} (${pct(cost, stdCost)})`);
  }

  return reasons.length
    ? { suspicious: true, reason: reasons.join(' · ') }
    : { suspicious: false, reason: null };
}

export const isAdmin = (req) => String(req.user?.role || '').toLowerCase() === 'admin';

// Drivers must not see the verdict or the numbers of the standard, otherwise
// they could simply enter values that sit just inside the tolerance.
export const hideReview = (trip) => {
  if (!trip) return trip;
  const { review_status, flag_reason, ...rest } = trip;
  return rest;
};