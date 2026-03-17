import Papa from 'papaparse';
import { Unit } from '../types';

const convertGoogleDriveLink = (url: string) => {
  if (!url) return '';
  const driveRegex = /\/d\/(.+?)(\/|$|\?)/;
  const idRegex = /id=(.+?)(&|$)/;
  const fileId = url.match(driveRegex)?.[1] || url.match(idRegex)?.[1];

  if (fileId) {
    // Use thumbnail link which is more reliable for embedding in iframes/web apps
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }
  return url;
};

export const fetchUnitsFromCSV = async (csvUrl: string): Promise<Unit[]> => {
  console.log("Fetching CSV from:", csvUrl);
  return new Promise((resolve, reject) => {
    Papa.parse(csvUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log("CSV Parse Results:", results);
        if (results.errors.length > 0) {
          console.warn("CSV Parse Errors:", results.errors);
        }
        
        if (!results.data || results.data.length === 0) {
          console.warn("No data found in CSV");
          resolve([]);
          return;
        }

        const units: Unit[] = results.data.map((row: any, index: number) => {
          // Clean up keys (remove spaces and invisible characters)
          const cleanRow: any = {};
          Object.keys(row).forEach(key => {
            const cleanKey = key.trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
            cleanRow[cleanKey] = row[key];
          });

          if (index === 0) console.log("First cleaned row:", cleanRow);

          // Try to find ID in various possible column names
          const id = cleanRow.ID || cleanRow.id || cleanRow['المعرف'] || cleanRow['رقم الوحدة'] || cleanRow['Unit ID'];
          if (!id) {
            if (index === 0) console.warn("Row 0 missing ID. Available keys:", Object.keys(cleanRow));
            return null;
          }

          // Parse details from the "تفاصيل الشقة" column (handling typos like "تفاصل")
          const detailsRaw = cleanRow['تفاصل الشقة'] || cleanRow['تفاصيل الشقة'] || cleanRow['Details'] || '';
          
          const getCount = (patterns: string[]) => {
            // Split by common separators like + or ,
            const parts = detailsRaw.split(/[+,]/).map((p: string) => p.trim());
            
            for (const part of parts) {
              for (const pattern of patterns) {
                const regex = new RegExp(`(\\d+)\\s*${pattern}|${pattern}\\s*(\\d+)`);
                const match = part.match(regex);
                if (match) return match[1] || match[2];
              }
            }

            // Fallback to searching the whole string if split didn't work as expected
            for (const pattern of patterns) {
              const regex = new RegExp(`(\\d+)\\s*${pattern}|${pattern}\\s*(\\d+)`);
              const match = detailsRaw.match(regex);
              if (match) return match[1] || match[2];
            }

            // Check if any of the patterns exist as a fallback (for "1" count)
            for (const pattern of patterns) {
              if (detailsRaw.includes(pattern)) return '1';
            }
            return null;
          };

          const details = {
            livingRoom: getCount(['غرفة معيشة', 'صالة']),
            bathroomsCount: getCount(['دورة مياه', 'حمامات', 'حمام']),
            bedroomsCount: getCount(['غرفة نوم', 'غرف نوم']),
            kitchen: getCount(['مطبخ']),
            majlis: getCount(['مجلس']),
            diningRoom: getCount(['غرفة طعام', 'غرف طعام']),
            maidRoom: getCount(['غرفة خادمة', 'خادمة']),
            swimmingPool: getCount(['مسبح', 'مسبح خاص']),
            terrace: getCount(['تراس', 'شرفة']),
          };

          return {
            id: String(id).trim(),
            name: String(id).trim(),
            status: parseStatus(cleanRow['حالة الشقة'] || cleanRow['Status'] || cleanRow['الحالة']),
            price: parseInt(String(cleanRow['سعر الشقة'] || cleanRow['Price'] || cleanRow['السعر'] || '0').replace(/[^0-9]/g, '') || '0'),
            area: parseInt(String(cleanRow['المساحة'] || cleanRow['Area'] || '0').replace(/[^0-9]/g, '') || '0'),
            bedrooms: details.bedroomsCount || cleanRow['عدد الغرف'] || cleanRow['Bedrooms'] || 0,
            bathrooms: details.bathroomsCount || cleanRow['Bathrooms'] || 0,
            description: cleanRow['معلوات اضافية'] || cleanRow['معلومات اضافية'] || cleanRow['Description'] || '',
            modelUrl: '', 
            floorPlanUrl: convertGoogleDriveLink(cleanRow['رابط للمخطط الشقة'] || cleanRow['Floor Plan URL'] || ''),
            vrTourUrl: convertGoogleDriveLink(cleanRow['رابط الجولة الافتراضية في الشقة'] || cleanRow['VR Tour URL'] || ''),
            interestLink: '',
            floor: cleanRow['الدور'] || cleanRow['Floor'] || '',
            amenities: [],
            updatedAt: new Date().toISOString(),
            color: cleanRow['Hex'] || cleanRow['Color'] || '#34C759',
            details
          };
        }).filter(Boolean) as Unit[];
        
        console.log("Mapped Units:", units);
        resolve(units);
      },
      error: (error: any) => {
        console.error("Papa Parse Error:", error);
        // Provide a more descriptive error message
        const message = error.message || "فشل تحميل ملف CSV. تأكد من أن الرابط صحيح ومنشور للجميع.";
        reject(new Error(message));
      }
    });
  });
};

const parseStatus = (statusStr: string): 'available' | 'reserved' | 'sold' => {
  if (!statusStr) return 'available';
  const s = statusStr.toLowerCase().trim();
  
  // Arabic variations
  if (s.includes('متاح') || s.includes('available')) return 'available';
  if (s.includes('محجوز') || s.includes('reserved')) return 'reserved';
  if (s.includes('مباع') || s.includes('sold')) return 'sold';
  
  return 'available';
};
