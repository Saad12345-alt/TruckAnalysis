import Trip from '../models/tripModel.js';
import { approveTrip, makeStandard } from '../models/routeStandardModel.js';
import { isAdmin } from '../utils/tripReview.js';

export const requireAdmin = (req, res, next) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  return next();
};

// PUT /trips/:id/approve        -> the trip is fine, the red goes away
export const approve = async (req, res) => {
  try {
    if (!(await approveTrip(req.params.id))) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    return res.json(await Trip.findById(req.params.id));
  } catch (error) {
    console.error('Approve trip error:', error);
    return res.status(500).json({ message: error.message });
  }
};

// PUT /trips/:id/set-standard   -> this trip's distance and cost become the route's standard
export const setStandard = async (req, res) => {
  try {
    if (!(await makeStandard(req.params.id))) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    return res.json(await Trip.findById(req.params.id));
  } catch (error) {
    console.error('Set standard error:', error);
    return res.status(500).json({ message: error.message });
  }
};