/**
 * Servicio de logística: cálculo de distancia y clasificación de prioridad
 * Utiliza una base de datos interna de coordenadas ZIP para evitar llamadas excesivas a APIs
 */

// Base de datos interna de coordenadas ZIP (muestra - en producción usar API o base de datos completa)
const ZIP_COORDINATES: Record<string, { lat: number; lon: number; city: string; state: string }> = {
  "33166": { lat: 25.7617, lon: -80.1918, city: "Miami", state: "FL" },
  "33172": { lat: 25.7282, lon: -80.3844, city: "Miami", state: "FL" },
  "33101": { lat: 25.7617, lon: -80.1918, city: "Miami", state: "FL" },
  "10001": { lat: 40.7506, lon: -73.9972, city: "New York", state: "NY" },
  "10002": { lat: 40.7142, lon: -73.9898, city: "New York", state: "NY" },
  "90210": { lat: 34.0901, lon: -118.4065, city: "Beverly Hills", state: "CA" },
  "90001": { lat: 33.9731, lon: -118.2479, city: "Los Angeles", state: "CA" },
  "60601": { lat: 41.8819, lon: -87.6278, city: "Chicago", state: "IL" },
  "77001": { lat: 29.7589, lon: -95.3677, city: "Houston", state: "TX" },
  "75201": { lat: 32.7767, lon: -96.797, city: "Dallas", state: "TX" },
};

/**
 * Calcula la distancia aproximada entre dos ZIP codes usando la fórmula de Haversine
 * @param pickupZip - ZIP code de recogida
 * @param deliveryZip - ZIP code de entrega
 * @returns Distancia en millas o null si no se puede calcular
 */
export function calculateDistance(pickupZip: string, deliveryZip: string): number | null {
  const pickup = ZIP_COORDINATES[pickupZip];
  const delivery = ZIP_COORDINATES[deliveryZip];

  if (!pickup || !delivery) {
    return null;
  }

  // Fórmula de Haversine para calcular distancia entre dos puntos
  const R = 3959; // Radio de la Tierra en millas
  const dLat = ((delivery.lat - pickup.lat) * Math.PI) / 180;
  const dLon = ((delivery.lon - pickup.lon) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((pickup.lat * Math.PI) / 180) *
      Math.cos((delivery.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance);
}

/**
 * Clasifica la distancia en una categoría de prioridad logística
 * @param distanceMiles - Distancia en millas
 * @returns Color de prioridad: green, yellow, orange, red
 */
export function classifyLogisticsPriority(distanceMiles: number | null): "green" | "yellow" | "orange" | "red" | null {
  if (distanceMiles === null) return null;

  if (distanceMiles <= 500) return "green";
  if (distanceMiles <= 1000) return "yellow";
  if (distanceMiles <= 1500) return "orange";
  return "red";
}

/**
 * Obtiene información de un ZIP code (ciudad, estado)
 * @param zipCode - ZIP code a buscar
 * @returns Objeto con información del ZIP code o null
 */
export function getZipCodeInfo(zipCode: string): { city: string; state: string } | null {
  const info = ZIP_COORDINATES[zipCode];
  if (!info) return null;
  return { city: info.city, state: info.state };
}

/**
 * Busca ZIP codes que coincidan con una búsqueda parcial
 * @param query - Búsqueda parcial (ZIP, ciudad o estado)
 * @returns Array de sugerencias de ZIP codes
 */
export function searchZipCodes(query: string): Array<{ zip: string; city: string; state: string }> {
  const lowerQuery = query.toLowerCase();
  const results: Array<{ zip: string; city: string; state: string }> = [];

  for (const [zip, info] of Object.entries(ZIP_COORDINATES)) {
    if (
      zip.startsWith(query) ||
      info.city.toLowerCase().includes(lowerQuery) ||
      info.state.toLowerCase().includes(lowerQuery)
    ) {
      results.push({
        zip,
        city: info.city,
        state: info.state,
      });
    }
  }

  return results.slice(0, 10); // Limitar a 10 resultados
}

// Mapa de nombres completos de estados -> abreviatura de 2 letras
const US_STATE_ABBREVIATIONS: Record<string, string> = {
  "alabama": "AL",
  "alaska": "AK",
  "arizona": "AZ",
  "arkansas": "AR",
  "california": "CA",
  "colorado": "CO",
  "connecticut": "CT",
  "delaware": "DE",
  "florida": "FL",
  "georgia": "GA",
  "hawaii": "HI",
  "idaho": "ID",
  "illinois": "IL",
  "indiana": "IN",
  "iowa": "IA",
  "kansas": "KS",
  "kentucky": "KY",
  "louisiana": "LA",
  "maine": "ME",
  "maryland": "MD",
  "massachusetts": "MA",
  "michigan": "MI",
  "minnesota": "MN",
  "mississippi": "MS",
  "missouri": "MO",
  "montana": "MT",
  "nebraska": "NE",
  "nevada": "NV",
  "new york": "NY",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "north carolina": "NC",
  "north dakota": "ND",
  "ohio": "OH",
  "oklahoma": "OK",
  "oregon": "OR",
  "pennsylvania": "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  "tennessee": "TN",
  "texas": "TX",
  "utah": "UT",
  "vermont": "VT",
  "virginia": "VA",
  "washington": "WA",
  "west virginia": "WV",
  "wisconsin": "WI",
  "wyoming": "WY",
  "district of columbia": "DC",
};

/**
 * Extrae o normaliza una abreviatura de estado a 2 caracteres.
 * - Si ya es 2 letras, la normaliza a mayúsculas
 * - Si contiene paréntesis con la abreviatura (ej. "Florida (FL)") la extrae
 * - Si el último token es 2 letras las toma
 * - Si coincide con un nombre completo en el mapa, devuelve la abreviatura
 * - En último recurso devuelve los primeros dos caracteres en mayúsculas
 */
export function extractStateAbbreviation(state?: string | null, strict = false): string | null {
  if (!state) return null;
  const raw = state.trim();
  if (raw.length === 0) return null;

  const upper = raw.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) return upper;

  const paren = raw.match(/\(([A-Za-z]{2})\)/);
  if (paren && paren[1]) return paren[1].toUpperCase();

  const tokens = raw.split(/[\s,]+/);
  const last = tokens[tokens.length - 1];
  if (last && /^[A-Za-z]{2}$/.test(last)) return last.toUpperCase();

  const normalized = raw.toLowerCase();
  // intentar coincidencia exacta con nombres compuestos (ej "new york")
  if (US_STATE_ABBREVIATIONS[normalized]) return US_STATE_ABBREVIATIONS[normalized];

  // intentar reemplazar espacios múltiples por uno y volver a comprobar
  const collapsed = normalized.replace(/\s+/g, " ");
  if (US_STATE_ABBREVIATIONS[collapsed]) return US_STATE_ABBREVIATIONS[collapsed];

  if (strict) return null;

  // fallback: tomar los primeros 2 caracteres
  return raw.slice(0, 2).toUpperCase();
}

export function getAllowedStateAbbreviations(): string[] {
  const set = new Set<string>(Object.values(US_STATE_ABBREVIATIONS).map((s) => s.toUpperCase()));
  return Array.from(set).sort();
}

/**
 * Obtiene el color de prioridad con descripción
 * @param color - Color de prioridad
 * @returns Objeto con color y descripción
 */
export function getLogisticsPriorityInfo(color: "green" | "yellow" | "orange" | "red" | null) {
  const info: Record<string, { label: string; description: string; bgColor: string; textColor: string }> = {
    green: {
      label: "Económica",
      description: "0 - 500 millas",
      bgColor: "bg-green-900/20",
      textColor: "text-green-400",
    },
    yellow: {
      label: "Media",
      description: "501 - 1000 millas",
      bgColor: "bg-yellow-900/20",
      textColor: "text-yellow-400",
    },
    orange: {
      label: "Costosa",
      description: "1001 - 1500 millas",
      bgColor: "bg-orange-900/20",
      textColor: "text-orange-400",
    },
    red: {
      label: "Muy Costosa",
      description: "1500+ millas",
      bgColor: "bg-red-900/20",
      textColor: "text-red-400",
    },
  };

  return info[color || "green"] || info.green;
}
