// Fixaplex Service Catalog Reference & Price Range Lookup
// Contains official minimum and maximum pricing ranges for all Fixaplex services

export interface ServicePriceInfo {
  id: string;
  name: string;
  min_price: string;
  max_price: string;
  category_id: number;
}

export const FIXAPLEX_SERVICE_CATALOG: Record<string, ServicePriceInfo> = {
  // Category 1: Plumbers (PLB)
  "1": { id: "1", name: "Leaking tap repair", min_price: "110.00", max_price: "160.00", category_id: 1 },
  "2": { id: "2", name: "Leaking pipe repair", min_price: "150.00", max_price: "240.00", category_id: 1 },
  "3": { id: "3", name: "Toilet leak repair", min_price: "120.00", max_price: "180.00", category_id: 1 },
  "4": { id: "4", name: "Shower leak repair", min_price: "160.00", max_price: "260.00", category_id: 1 },
  "5": { id: "5", name: "Radiator leak repair", min_price: "140.00", max_price: "220.00", category_id: 1 },
  "6": { id: "6", name: "Blocked sink", min_price: "120.00", max_price: "170.00", category_id: 1 },
  "7": { id: "7", name: "Blocked toilet", min_price: "140.00", max_price: "190.00", category_id: 1 },
  "8": { id: "8", name: "Blocked shower drain", min_price: "120.00", max_price: "160.00", category_id: 1 },
  "9": { id: "9", name: "Drain unblocking (basic domestic)", min_price: "195.00", max_price: "280.00", category_id: 1 },
  "10": { id: "10", name: "New tap installation", min_price: "140.00", max_price: "200.00", category_id: 1 },
  "11": { id: "11", name: "Toilet installation", min_price: "280.00", max_price: "450.00", category_id: 1 },
  "12": { id: "12", name: "Sink installation", min_price: "280.00", max_price: "480.00", category_id: 1 },
  "13": { id: "13", name: "Shower mixer replacement", min_price: "180.00", max_price: "280.00", category_id: 1 },
  "14": { id: "14", name: "Dishwasher connection", min_price: "110.00", max_price: "150.00", category_id: 1 },
  "15": { id: "15", name: "Washing machine connection", min_price: "110.00", max_price: "150.00", category_id: 1 },
  "16": { id: "16", name: "Radiator replacement", min_price: "320.00", max_price: "550.00", category_id: 1 },
  "17": { id: "17", name: "Radiator bleeding", min_price: "95.00", max_price: "130.00", category_id: 1 },
  "18": { id: "18", name: "Thermostat replacement", min_price: "130.00", max_price: "190.00", category_id: 1 },
  "19": { id: "19", name: "Boiler diagnosis", min_price: "120.00", max_price: "180.00", category_id: 1 },

  // Category 2: Electricians (ELE)
  "20": { id: "20", name: "Electrical fault diagnosis", min_price: "140.00", max_price: "200.00", category_id: 2 },
  "21": { id: "21", name: "Tripping fuse board investigation", min_price: "160.00", max_price: "240.00", category_id: 2 },
  "22": { id: "22", name: "Localised power outage investigation", min_price: "150.00", max_price: "220.00", category_id: 2 },
  "23": { id: "23", name: "Light fitting replacement", min_price: "100.00", max_price: "150.00", category_id: 2 },
  "24": { id: "24", name: "Ceiling light installation", min_price: "130.00", max_price: "190.00", category_id: 2 },
  "25": { id: "25", name: "Outdoor light installation", min_price: "190.00", max_price: "320.00", category_id: 2 },
  "26": { id: "26", name: "Socket replacement", min_price: "90.00", max_price: "140.00", category_id: 2 },
  "27": { id: "27", name: "Additional socket installation", min_price: "160.00", max_price: "260.00", category_id: 2 },
  "28": { id: "28", name: "Light switch replacement", min_price: "80.00", max_price: "130.00", category_id: 2 },
  "29": { id: "29", name: "Electric shower connection", min_price: "300.00", max_price: "500.00", category_id: 2 },
  "30": { id: "30", name: "Cooker connection", min_price: "130.00", max_price: "190.00", category_id: 2 },
  "31": { id: "31", name: "Extractor fan installation", min_price: "200.00", max_price: "300.00", category_id: 2 },

  // Category 4: Handyman (HND)
  "32": { id: "32", name: "Flat-pack furniture assembly", min_price: "80.00", max_price: "130.00", category_id: 4 },
  "33": { id: "33", name: "Bed assembly", min_price: "100.00", max_price: "160.00", category_id: 4 },
  "34": { id: "34", name: "Wardrobe assembly", min_price: "160.00", max_price: "320.00", category_id: 4 },
  "35": { id: "35", name: "TV mounting", min_price: "120.00", max_price: "180.00", category_id: 4 },
  "36": { id: "36", name: "Mirror hanging", min_price: "60.00", max_price: "100.00", category_id: 4 },
  "37": { id: "37", name: "Shelf installation", min_price: "80.00", max_price: "130.00", category_id: 4 },
  "38": { id: "38", name: "Picture hanging", min_price: "60.00", max_price: "90.00", category_id: 4 },
  "39": { id: "39", name: "Door adjustment", min_price: "80.00", max_price: "140.00", category_id: 4 },
  "40": { id: "40", name: "Lock replacement", min_price: "130.00", max_price: "190.00", category_id: 4 },
  "41": { id: "41", name: "Curtain rail installation", min_price: "90.00", max_price: "150.00", category_id: 4 },
  "42": { id: "42", name: "Blinds installation", min_price: "110.00", max_price: "170.00", category_id: 4 },
  "43": { id: "43", name: "Fence repair (minor)", min_price: "200.00", max_price: "380.00", category_id: 4 },
  "44": { id: "44", name: "Gate repair", min_price: "160.00", max_price: "320.00", category_id: 4 },
  "45": { id: "45", name: "Small decking repairs", min_price: "280.00", max_price: "550.00", category_id: 4 },

  // Category 3: Cleaners (CLN)
  "46": { id: "46", name: "1-bed apartment (Standard)", min_price: "100.00", max_price: "130.00", category_id: 3 },
  "47": { id: "47", name: "2-bed apartment (Standard)", min_price: "130.00", max_price: "170.00", category_id: 3 },
  "48": { id: "48", name: "3-bed house (Standard)", min_price: "180.00", max_price: "240.00", category_id: 3 },
  "49": { id: "49", name: "1-bed apartment (Deep Clean)", min_price: "160.00", max_price: "240.00", category_id: 3 },
  "50": { id: "50", name: "2-bed apartment (Deep Clean)", min_price: "240.00", max_price: "320.00", category_id: 3 },
  "51": { id: "51", name: "3-bed house (Deep Clean)", min_price: "320.00", max_price: "480.00", category_id: 3 },
  "52": { id: "52", name: "1-bed property (End of Tenancy)", min_price: "200.00", max_price: "280.00", category_id: 3 },
  "53": { id: "53", name: "2-bed property (End of Tenancy)", min_price: "280.00", max_price: "380.00", category_id: 3 },
  "54": { id: "54", name: "3-bed property (End of Tenancy)", min_price: "380.00", max_price: "550.00", category_id: 3 },
  "55": { id: "55", name: "Single room carpet", min_price: "70.00", max_price: "100.00", category_id: 3 },
  "56": { id: "56", name: "Full apartment carpets", min_price: "200.00", max_price: "320.00", category_id: 3 },
  "57": { id: "57", name: "Sofa cleaning", min_price: "90.00", max_price: "160.00", category_id: 3 },
};

export const CATEGORY_CODE_TO_ID: Record<string, number> = {
  PLB: 1,
  ELE: 2,
  CLN: 3,
  HND: 4,
};

/**
 * Resolves formatted price range string for a given service by id, name, or booking code.
 * E.g. "€120.00 - €180.00"
 */
export function getServicePriceRange(
  serviceIdentifier?: string | number | null,
  serviceName?: string | null,
  bookingCode?: string | null
): string | null {
  if (!serviceIdentifier && !serviceName && !bookingCode) return null;

  // 1. Lookup by service ID
  if (serviceIdentifier && FIXAPLEX_SERVICE_CATALOG[String(serviceIdentifier)]) {
    const item = FIXAPLEX_SERVICE_CATALOG[String(serviceIdentifier)];
    return `€${item.min_price} - €${item.max_price}`;
  }

  const cleanName = (serviceName || (typeof serviceIdentifier === "string" ? serviceIdentifier : ""))
    .toLowerCase()
    .trim();

  // 2. Lookup by exact or partial service name
  if (cleanName) {
    const catalogValues = Object.values(FIXAPLEX_SERVICE_CATALOG);
    // Exact match
    const exact = catalogValues.find(
      (s) => s.name.toLowerCase().trim() === cleanName
    );
    if (exact) {
      return `€${exact.min_price} - €${exact.max_price}`;
    }

    // Partial/contains match
    const partial = catalogValues.find(
      (s) =>
        s.name.toLowerCase().includes(cleanName) ||
        cleanName.includes(s.name.toLowerCase())
    );
    if (partial) {
      return `€${partial.min_price} - €${partial.max_price}`;
    }
  }

  return null;
}
