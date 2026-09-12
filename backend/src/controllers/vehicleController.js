import Vehicle from '../models/vehicleModel.js';

export const getVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.findAll();
    return res.json(vehicles);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createVehicle = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    const newVehicle = await Vehicle.create(req.body);
    return res.status(201).json(newVehicle);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateVehicle = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    const updatedVehicle = await Vehicle.update(req.params.id, req.body);

    if (!updatedVehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    return res.json(updatedVehicle);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteVehicle = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    const deleted = await Vehicle.deleteById(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    return res.json({ message: 'Vehicle deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};