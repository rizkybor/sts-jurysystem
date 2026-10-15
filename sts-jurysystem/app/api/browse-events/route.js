import connectDB from "@/config/database";
import Event from "@/models/Event";
import TeamsRegistered from "@/models/TeamsRegistered";
import { listPublicOrienteeringEvents } from "@/utils/orienteeringEvents";

export const dynamic = "force-dynamic";

// Penjelajahan event publik (/matches) lintas cabang: Rafting (koleksi
// events) + Orienteering (orienteeringEvents). Endpoint TERPISAH dari
// /api/matches supaya konsumen lama /api/matches (judges, profile, /live)
// tidak berubah perilakunya.
//
// GET ?sport=all|rafting|orienteering&q=&level=&page=&pageSize=
// - level (Classification - A..I) hanya berlaku utk Rafting; kalau diisi,
//   Orienteering otomatis tidak ikut.
// - Urutan "nearest": event mendatang dulu (yang paling cepat mulai), lalu
//   yang sudah lewat (yang paling baru lewat) — sama dgn /api/matches.
async function raftingParticipantCounts(eventIds) {
  const counts = new Map();
  if (!eventIds.length) return counts;
  const docs = await TeamsRegistered.find({ eventId: { $in: eventIds } }, { eventId: 1, teams: 1 }).lean();
  const keys = new Map();
  for (const doc of docs) {
    const id = String(doc.eventId);
    if (!keys.has(id)) keys.set(id, new Set());
    for (const t of doc.teams || []) {
      keys.get(id).add(`${String(t?.nameTeam || "").trim().toUpperCase()}|${String(t?.bibTeam || "").trim()}`);
    }
  }
  for (const [id, set] of keys) counts.set(id, set.size);
  return counts;
}

export async function GET(request) {
  try {
    await connectDB();
    const sp = request.nextUrl.searchParams;
    const sport = ["rafting", "orienteering"].includes(sp.get("sport")) ? sp.get("sport") : "all";
    const q = (sp.get("q") || "").trim();
    const level = sp.get("level") || "All";
    const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(sp.get("pageSize") || "6", 10)));

    const items = [];
    if (sport !== "orienteering") {
      const filter = { statusEvent: /^activated$/i };
      if (q) {
        const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        filter.$or = [{ eventName: rx }, { riverName: rx }, { addressCity: rx }, { addressProvince: rx }];
      }
      if (level && level !== "All") filter.levelName = new RegExp(`^\\s*${level.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i");
      const rafting = await Event.find(filter).lean();
      rafting.forEach((e) => {
        const d = new Date(e.startDateEvent);
        items.push({ ...e, _id: String(e._id), kind: "rafting", _start: isNaN(d) ? null : d });
      });
    }
    if (sport !== "rafting" && (!level || level === "All")) {
      items.push(...(await listPublicOrienteeringEvents({ q })));
    }

    const now = Date.now();
    items.sort((a, b) => {
      const ta = a._start ? a._start.getTime() : 0;
      const tb = b._start ? b._start.getTime() : 0;
      const pa = ta < now ? 1 : 0;
      const pb = tb < now ? 1 : 0;
      return pa - pb || Math.abs(ta - now) - Math.abs(tb - now);
    });

    const total = items.length;
    const pageItems = items.slice((page - 1) * pageSize, page * pageSize).map(({ _start, ...rest }) => rest);
    const counts = await raftingParticipantCounts(pageItems.filter((e) => e.kind === "rafting").map((e) => e._id));
    const events = pageItems.map((e) => (e.kind === "rafting" ? { ...e, participantCount: counts.get(e._id) || 0 } : e));

    return Response.json({ success: true, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)), events });
  } catch (error) {
    console.error("❌ [GET /api/browse-events]", error);
    return Response.json({ success: false, message: "Failed to fetch events" }, { status: 500 });
  }
}
