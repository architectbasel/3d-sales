import { Unit } from '../types';

export async function fetchUnitsFromSheet(sheetId: string, apiKey: string): Promise<Unit[]> {
  if (!sheetId || !apiKey) return [];

  // Range A:Z to get all columns. Assuming first row is header.
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A2:Z?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.values) return [];

    return data.values.map((row: any[]) => {
      const id = row[0] || '';
      
      // Map Arabic status
      const arabicStatus = row[1] || '';
      let status: 'available' | 'reserved' | 'sold' = 'available';
      if (arabicStatus.includes('محجوزة')) status = 'reserved';
      if (arabicStatus.includes('مباعة')) status = 'sold';

      // Parse price (e.g., "590,000 SAR")
      const priceStr = (row[3] || '0').replace(/[^0-9]/g, '');
      const price = parseInt(priceStr) || 0;

      // Parse area (e.g., "m2 118")
      const areaStr = (row[5] || '0').replace(/[^0-9]/g, '');
      const area = parseInt(areaStr) || 0;

      return {
        id,
        name: id,
        status,
        price,
        area,
        floorPlanUrl: '', 
        vrTourUrl: '',
        description: row[7] || '', 
        floor: row[6] || '', 
        bedrooms: row[4] || '', 
        bathrooms: 0,
        interestLink: '',
        amenities: [],
        updatedAt: new Date().toISOString(),
        modelUrl: '',
        color: row[2] || '#00ff00' // Capture Hex color from Column C
      };
    });
  } catch (error) {
    console.error("Error fetching Google Sheet data:", error);
    return [];
  }
}
