import connectDB from "@/config/database";
import Event from "@/models/Event";

// Generate /sitemap.xml otomatis (konvensi App Router). Sebelumnya tidak
// ada sitemap sama sekali — mesin pencari cuma bisa menemukan halaman
// /matches/[id] & /live/[id] lewat link internal, bukan didaftarkan
// langsung. Query event query langsung ke DB (pola sama dgn
// HomeMatches.jsx), fallback ke rute statis saja kalau query gagal.
export default async function sitemap() {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ).replace(/\/$/, "");

  const staticRoutes = [
    "",
    "/matches",
    "/live",
    "/about",
    "/privacy",
    "/terms",
    "/cookies",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));

  let eventRoutes = [];
  try {
    await connectDB();
    const events = await Event.find(
      { statusEvent: "Activated" },
      { updatedAt: 1 }
    ).lean();

    eventRoutes = events.flatMap((ev) => {
      const id = String(ev._id);
      const lastModified = ev.updatedAt || new Date();
      return [
        { url: `${base}/matches/${id}`, lastModified },
        { url: `${base}/live/${id}`, lastModified },
      ];
    });
  } catch (err) {
    console.error("❌ [sitemap] Failed to load events:", err);
  }

  return [...staticRoutes, ...eventRoutes];
}
