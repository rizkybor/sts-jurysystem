// utils/timezone.js

export const DEFAULT_TZ = process.env.APP_TIMEZONE || "Asia/Jakarta";

/** Validasi IANA timezone */
export function isValidTimeZone(tz) {
  try {
    new Intl.DateTimeFormat("id-ID", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Ambil TZ dari req: ?tz= / header x-timezone / APP_TIMEZONE / default */
export function getTimeZoneFromRequest(req, fallback = DEFAULT_TZ) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("tz");
    const h = req.headers.get("x-timezone");
    const cand = q || h || fallback;
    return isValidTimeZone(cand) ? cand : fallback;
  } catch {
    return fallback;
  }
}

/** Format tanggal ke string lokal sesuai TZ */
export function formatDateByZone(date, timeZone = DEFAULT_TZ, opts = {}) {
  if (!date) return "-";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (Number.isNaN(d?.getTime?.())) return "-";
  const base = {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    ...opts,
  };
  return new Intl.DateTimeFormat("id-ID", base).format(d);
}

/**
 * Satu pintu bikin stempel waktu untuk penyimpanan:
 * - createdAt: Date UTC (untuk DB)
 * - createdAtLocal: string lokal rapi (untuk tampilan/audit)
 * - createdAtTz: TZ yang dipakai (jejak konteks)
 */
export function buildCreatedAtMeta(reqOrTz) {
  const tz =
    typeof reqOrTz === "string"
      ? (isValidTimeZone(reqOrTz) ? reqOrTz : DEFAULT_TZ)
      : getTimeZoneFromRequest(reqOrTz, DEFAULT_TZ);

  const nowUtc = new Date(); // simpan ini ke DB
  const localStr = formatDateByZone(nowUtc, tz); // opsional: simpan atau kirim balik

  return {
    createdAt: nowUtc,
    createdAtLocal: localStr,
    createdAtTz: tz,
  };
}