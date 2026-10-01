export type DriverStatus = 'active' | 'maintenance' | 'idle' | 'inactive' | string;

export interface Driver {
  id: number | string;
  name: string;
  phone?: string;
  vehicle_id?: number | string | null;
  vehicle_plate?: string | null;
  status?: DriverStatus;
}

export interface Vehicle {
  id: number | string;
  plate: string;
  model?: string;
  capacity?: number | string;
  driver_name?: string | null;
  status?: DriverStatus;
}
