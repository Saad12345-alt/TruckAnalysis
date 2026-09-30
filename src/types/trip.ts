export interface TripCost {
  fuel: number;
  tolls: number;
  maintenance: number;
  other: number;
}

export interface Trip {
  id: number | string;
  date: string | Date;
  origin: string;
  destination: string;
  distance: number;
  material: string;
  revenue: number;
  totalCost?: number;
  total_cost?: number;
  profit: number;
  cost?: Partial<TripCost>;
  notes?: string | null;
  driver?: { id: number | string; name: string } | null;
  vehicle?: { id: number | string; plate: string } | null;
}

export interface TripTotals {
  revenue: number;
  cost: number;
  profit: number;
}
