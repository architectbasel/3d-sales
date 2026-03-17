export interface Unit {
  id: string;
  name: string;
  price: number;
  status: 'available' | 'reserved' | 'sold';
  area: number;
  bedrooms: number | string;
  bathrooms: number | string;
  description: string;
  modelUrl: string;
  floorPlanUrl: string;
  vrTourUrl: string;
  interestLink: string;
  floor: number | string;
  amenities: string[];
  updatedAt: string;
  color?: string;
  projectId?: string;
  details?: {
    diningRoom?: string;
    kitchen?: string;
    majlis?: string;
    livingRoom?: string;
    bathroomsCount?: string;
    bedroomsCount?: string;
    maidRoom?: string;
    swimmingPool?: string;
    terrace?: string;
  };
}

export interface Project {
  id: string;
  name: string;
  modelUrl: string;
  csvUrl?: string;
  clientId?: string;
  admins?: string[];
  primaryColor?: string;
  logoUrl?: string;
  description?: string;
  whatsappNumber?: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  logoUrl?: string;
  admins: string[];
}
