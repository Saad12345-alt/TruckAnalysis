import Driver from '../models/driverModel.js';

export const getDrivers = async (req, res) => {
  try {
    const drivers = await Driver.findAll();
    return res.json(drivers);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createDriver = async (req, res) => {
  try {
    const newDriver = await Driver.create(req.body);
    return res.status(201).json(newDriver);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateDriver = async (req, res) => {
  try {
    const updatedDriver = await Driver.update(req.params.id, req.body);

    if (!updatedDriver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    return res.json(updatedDriver);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteDriver = async (req, res) => {
  try {
    const deleted = await Driver.deleteById(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    return res.json({ message: 'Driver deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};