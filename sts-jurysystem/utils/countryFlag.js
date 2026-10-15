// utils/countryFlag.js — nama/kode negara (bebas format) -> kode ISO 3166-1
// alpha-2 utk gambar bendera. Data Nationality Orienteering bisa berupa
// nama Indonesia/Inggris ("Indonesia", "Malaysia"), kode IOC ("INA", "MAS",
// "SGP" — dipakai di start list IOF) atau ISO2/ISO3 ("ID", "IDN").
const C = {
  ID: ["indonesia", "ina", "idn"],
  MY: ["malaysia", "mas", "mys"],
  SG: ["singapore", "singapura", "sgp", "sin"],
  TH: ["thailand", "tha"],
  PH: ["philippines", "filipina", "phi", "phl"],
  VN: ["vietnam", "viet nam", "vie", "vnm"],
  BN: ["brunei", "brunei darussalam", "bru", "brn"],
  KH: ["cambodia", "kamboja", "cam", "khm"],
  LA: ["laos", "lao"],
  MM: ["myanmar", "mya", "mmr"],
  TL: ["timor leste", "timor-leste", "tls"],
  JP: ["japan", "jepang", "jpn"],
  KR: ["korea", "south korea", "korea selatan", "kor"],
  CN: ["china", "tiongkok", "chn"],
  TW: ["taiwan", "chinese taipei", "tpe", "twn"],
  HK: ["hong kong", "hkg"],
  IN: ["india", "ind"],
  AU: ["australia", "aus"],
  NZ: ["new zealand", "selandia baru", "nzl"],
  US: ["united states", "usa", "amerika serikat", "amerika"],
  CA: ["canada", "kanada", "can"],
  GB: ["united kingdom", "great britain", "inggris", "gbr", "uk"],
  IE: ["ireland", "irlandia", "irl"],
  DE: ["germany", "jerman", "ger", "deu"],
  FR: ["france", "prancis", "perancis", "fra"],
  NL: ["netherlands", "belanda", "ned", "nld"],
  BE: ["belgium", "belgia", "bel"],
  CH: ["switzerland", "swiss", "sui", "che"],
  AT: ["austria", "aut"],
  IT: ["italy", "italia", "ita"],
  ES: ["spain", "spanyol", "esp"],
  PT: ["portugal", "por", "prt"],
  SE: ["sweden", "swedia", "swe"],
  NO: ["norway", "norwegia", "nor"],
  FI: ["finland", "finlandia", "fin"],
  DK: ["denmark", "den", "dnk"],
  EE: ["estonia", "est"],
  LV: ["latvia", "lat", "lva"],
  LT: ["lithuania", "lituania", "ltu"],
  PL: ["poland", "polandia", "pol"],
  CZ: ["czech republic", "czechia", "ceko", "cze"],
  SK: ["slovakia", "svk"],
  HU: ["hungary", "hongaria", "hun"],
  RU: ["russia", "rusia", "rus"],
  UA: ["ukraine", "ukraina", "ukr"],
  TR: ["turkey", "turki", "turkiye", "tur"],
  IL: ["israel", "isr"],
  ZA: ["south africa", "afrika selatan", "rsa", "zaf"],
  BR: ["brazil", "brasil", "bra"],
  AR: ["argentina", "arg"],
  CL: ["chile", "chi", "chl"],
  MX: ["mexico", "meksiko", "mex"],
};
const LOOKUP = new Map();
Object.entries(C).forEach(([iso2, names]) => {
  LOOKUP.set(iso2.toLowerCase(), iso2);
  names.forEach((n) => LOOKUP.set(n, iso2));
});

export function countryCode(nationality) {
  const k = String(nationality || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!k) return "";
  return LOOKUP.get(k) || "";
}

export function flagUrl(nationality, width = 40) {
  const cc = countryCode(nationality);
  return cc ? `https://flagcdn.com/w${width}/${cc.toLowerCase()}.png` : "";
}
