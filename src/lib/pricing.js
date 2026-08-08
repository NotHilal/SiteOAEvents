// Day-based (weekday/weekend) + quantity-tiered material pricing.
// TTC is never stored — always derived from price_*_ht at 20% VAT, since
// that's the exact relationship in the price sheet these numbers come from
// (e.g. 8.67 HT -> 10.40 TTC, 179.55 HT -> 215.46 TTC).
const VAT_RATE = 1.2;

export function ttcFromHt(ht) {
  return Math.round((parseFloat(ht) || 0) * VAT_RATE * 100) / 100;
}

// Meeus/Jones/Butcher algorithm for the Gregorian Easter Sunday.
function computeEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function fmtDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

const holidaysCache = new Map();

// French public holidays for a given year: fixed dates + the Easter-anchored
// moving ones (Easter Monday, Ascension, Whit Monday).
export function getFrenchHolidays(year) {
  if (holidaysCache.has(year)) return holidaysCache.get(year);
  const easter = computeEasterSunday(year);
  const dates = [
    new Date(year, 0, 1),   // Jour de l'an
    addDays(easter, 1),     // Lundi de Pâques
    new Date(year, 4, 1),   // Fête du travail
    new Date(year, 4, 8),   // Victoire 1945
    addDays(easter, 39),    // Ascension
    addDays(easter, 50),    // Lundi de Pentecôte
    new Date(year, 6, 14),  // Fête nationale
    new Date(year, 7, 15),  // Assomption
    new Date(year, 10, 1),  // Toussaint
    new Date(year, 10, 11), // Armistice
    new Date(year, 11, 25), // Noël
  ];
  const set = new Set(dates.map(fmtDate));
  holidaysCache.set(year, set);
  return set;
}

export function isFrenchPublicHoliday(dateStr) {
  const year = parseInt(dateStr.slice(0, 4), 10);
  return getFrenchHolidays(year).has(dateStr);
}

// 'weekend' rate applies Fri/Sat/Sun and public holidays; everything else
// ('weekday' rate) is Mon-Thu — matches the price sheet's "Vendredi au
// dimanche et jours fériés" vs "Du lundi au jeudi" split.
export function getDayType(dateStr) {
  const day = new Date(dateStr + 'T00:00:00').getDay();
  if (day === 0 || day === 5 || day === 6) return 'weekend';
  if (isFrenchPublicHoliday(dateStr)) return 'weekend';
  return 'weekday';
}

// Finds the tier row covering `qty` among a material's price tiers.
export function resolveTier(tiers, qty) {
  if (!tiers || !tiers.length) return null;
  return tiers.find(t => qty >= t.min_qty && (t.max_qty == null || qty <= t.max_qty)) || null;
}

// Resolved TTC unit price for a material at a given day type + quantity.
// Returns 0 if there's no matching tier (e.g. qty below every min_qty).
export function getUnitPriceTtc(tiers, dayType, qty) {
  const tier = resolveTier(tiers, qty);
  if (!tier) return 0;
  const ht = dayType === 'weekend' ? tier.price_weekend_ht : tier.price_weekday_ht;
  return ttcFromHt(ht);
}

// The minimum rentable quantity for a material is just its lowest tier's
// min_qty (e.g. Chaise Napoléon's first band starts at 20) — no separate
// "minimum order" field to keep in sync with the pricing table.
export function getMinOrderQty(tiers) {
  return tiers && tiers.length ? tiers[0].min_qty : 1;
}

export function groupTiersByMaterial(tierRows) {
  const map = {};
  for (const t of tierRows || []) {
    const key = String(t.material_id);
    if (!map[key]) map[key] = [];
    map[key].push(t);
  }
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => a.min_qty - b.min_qty);
  }
  return map;
}
