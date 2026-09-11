// Logo event = elemen pertama `eventFiles[]` (string url ATAU {url}) —
// field yang sama dipakai eventLogoUrl() di sts-timingsystem
// (views/DetailEvent/Details/index.vue). Bukan field "eventLogo" yang
// sebenarnya tidak pernah ditulis oleh timingsystem.
export function firstEventFileUrl(eventFiles) {
  if (!Array.isArray(eventFiles) || !eventFiles.length) return "";
  const first = eventFiles[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && typeof first.url === "string") {
    return first.url;
  }
  return "";
}
