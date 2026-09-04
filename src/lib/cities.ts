/**
 * Major cities per country, keyed by the same ISO codes as COUNTRIES
 * (src/lib/countries.ts). Purely a display convenience on the profile —
 * unlike country_code, city has no effect on Global Case Exchange tagging
 * or anything else, so this list can be as loose or as tight as is useful
 * for the picker without touching any other logic. A country with no entry
 * here (or a city not listed) just means the picker shows only "Prefer not
 * to say" — city is optional everywhere it's used.
 */
export const CITIES: Record<string, string[]> = {
  US: [
    "New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia",
    "San Antonio", "San Diego", "Dallas", "Austin", "San Jose", "Boston",
    "Seattle", "Denver", "Washington", "Miami", "Atlanta", "San Francisco",
    "Nashville", "Baltimore",
  ],
  CA: [
    "Toronto", "Montreal", "Vancouver", "Calgary", "Edmonton", "Ottawa",
    "Winnipeg", "Quebec City", "Hamilton", "Halifax",
  ],
  MX: [
    "Mexico City", "Guadalajara", "Monterrey", "Puebla", "Tijuana",
    "León", "Juárez", "Mérida", "Cancún", "Querétaro",
  ],
  BR: [
    "São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza",
    "Belo Horizonte", "Manaus", "Curitiba", "Recife", "Porto Alegre",
  ],
  AR: [
    "Buenos Aires", "Córdoba", "Rosario", "Mendoza", "La Plata", "Mar del Plata",
  ],
  GB: [
    "London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Liverpool",
    "Edinburgh", "Bristol", "Sheffield", "Newcastle", "Cardiff", "Belfast",
  ],
  IE: ["Dublin", "Cork", "Limerick", "Galway", "Waterford"],
  FR: [
    "Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes",
    "Strasbourg", "Montpellier", "Bordeaux", "Lille",
  ],
  DE: [
    "Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart",
    "Düsseldorf", "Leipzig", "Dortmund", "Dresden",
  ],
  ES: [
    "Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Málaga",
    "Bilbao", "Palma", "Las Palmas",
  ],
  PT: ["Lisbon", "Porto", "Braga", "Coimbra", "Faro"],
  IT: [
    "Rome", "Milan", "Naples", "Turin", "Palermo", "Bologna",
    "Florence", "Venice", "Genoa", "Bari",
  ],
  NL: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven"],
  BE: ["Brussels", "Antwerp", "Ghent", "Bruges", "Liège"],
  CH: ["Zurich", "Geneva", "Basel", "Bern", "Lausanne"],
  AT: ["Vienna", "Graz", "Linz", "Salzburg", "Innsbruck"],
  SE: ["Stockholm", "Gothenburg", "Malmö", "Uppsala"],
  NO: ["Oslo", "Bergen", "Trondheim", "Stavanger"],
  DK: ["Copenhagen", "Aarhus", "Odense", "Aalborg"],
  FI: ["Helsinki", "Espoo", "Tampere", "Turku"],
  PL: ["Warsaw", "Kraków", "Łódź", "Wrocław", "Poznań", "Gdańsk"],
  GR: ["Athens", "Thessaloniki", "Patras", "Heraklion"],
  TR: ["Istanbul", "Ankara", "Izmir", "Bursa", "Antalya"],
  SA: [
    "Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar",
    "Taif", "Abha", "Tabuk", "Jubail",
  ],
  AE: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Al Ain", "Ras Al Khaimah"],
  QA: ["Doha", "Al Rayyan", "Al Wakrah"],
  KW: ["Kuwait City", "Hawalli", "Salmiya"],
  BH: ["Manama", "Muharraq", "Riffa"],
  OM: ["Muscat", "Salalah", "Sohar"],
  JO: ["Amman", "Zarqa", "Irbid"],
  LB: ["Beirut", "Tripoli", "Sidon"],
  EG: ["Cairo", "Alexandria", "Giza", "Luxor", "Aswan"],
  IL: ["Jerusalem", "Tel Aviv", "Haifa", "Beersheba"],
  ZA: [
    "Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth",
    "Bloemfontein",
  ],
  NG: ["Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt"],
  KE: ["Nairobi", "Mombasa", "Kisumu", "Nakuru"],
  IN: [
    "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata",
    "Pune", "Ahmedabad", "Jaipur", "Lucknow",
  ],
  PK: ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad"],
  BD: ["Dhaka", "Chittagong", "Khulna", "Sylhet"],
  CN: [
    "Beijing", "Shanghai", "Guangzhou", "Shenzhen", "Chengdu", "Wuhan",
    "Xi'an", "Hangzhou", "Nanjing",
  ],
  JP: ["Tokyo", "Osaka", "Yokohama", "Nagoya", "Sapporo", "Fukuoka", "Kyoto"],
  KR: ["Seoul", "Busan", "Incheon", "Daegu", "Daejeon"],
  SG: ["Singapore"],
  MY: ["Kuala Lumpur", "George Town", "Johor Bahru", "Ipoh", "Kota Kinabalu"],
  TH: ["Bangkok", "Chiang Mai", "Phuket", "Pattaya", "Nonthaburi"],
  PH: ["Manila", "Quezon City", "Davao City", "Cebu City", "Makati"],
  ID: ["Jakarta", "Surabaya", "Bandung", "Medan", "Semarang"],
  VN: ["Ho Chi Minh City", "Hanoi", "Da Nang", "Can Tho"],
  AU: [
    "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Canberra",
    "Gold Coast", "Hobart",
  ],
  NZ: ["Auckland", "Wellington", "Christchurch", "Hamilton", "Dunedin"],
};

export function citiesForCountry(code: string | null | undefined): string[] {
  if (!code) return [];
  return CITIES[code] ?? [];
}
