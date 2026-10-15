import connectDB from "@/config/database";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// Daftar event Orienteering utk Live Result. Datanya ditulis modul
// Orienteering di sts-timingsystem (koleksi orienteeringEvents) — di sini
// HANYA dibaca. Event dgn liveVisible === false disembunyikan operator.
// Orienteering tidak punya juri, jadi tidak ada route tulis apa pun.
export async function GET() {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const events = await db
      .collection("orienteeringEvents")
      .find(
        { liveVisible: { $ne: false } },
        { projection: { name: 1, location: 1, startDate: 1, endDate: 1, date: 1, image: 1, logo: 1, races: 1, types: 1, classes: 1 } }
      )
      .sort({ startDate: -1, date: -1 })
      .limit(100)
      .toArray();

    const ids = events.map((e) => String(e._id));
    const ps = await db
      .collection("orienteeringParticipants")
      .find({ eventId: { $in: ids } }, { projection: { eventId: 1, raceId: 1, iofId: 1, bib: 1, name: 1, classId: 1 } })
      .toArray();
    // per jenis + orang unik per event. Orang yang ikut Sprint & Middle
    // terdaftar di 2 start list -> dihitung 1x (kunci sama dgn
    // personKey() di sts-timingsystem: IOF ID -> BIB -> nama+kategori).
    const personKey = (p) => {
      const iof = String(p.iofId || "").trim();
      if (iof) return `I:${iof}`;
      const bib = String(p.bib || "").trim();
      if (bib) return `B:${bib.toUpperCase()}`;
      return `N:${String(p.name || "").trim().toUpperCase()}|${p.classId || ""}`;
    };
    const byRace = new Map();
    const people = new Map();
    for (const p of ps) {
      const rk = `${p.eventId}|${p.raceId || ""}`;
      byRace.set(rk, (byRace.get(rk) || 0) + 1);
      if (!people.has(p.eventId)) people.set(p.eventId, new Set());
      people.get(p.eventId).add(personKey(p));
    }

    const out = events.map((e) => ({
      id: String(e._id),
      name: e.name || "Untitled",
      location: e.location || "",
      startDate: e.startDate || e.date || null,
      endDate: e.endDate || e.startDate || e.date || null,
      image: e.image?.url || null,
      logo: e.logo?.url || null,
      races: (e.races || []).map((r) => ({
        id: r.id,
        name: r.name,
        location: r.location || "",
        participantCount: byRace.get(`${e._id}|${r.id}`) || 0,
      })),
      types: (e.types || []).map((t) => t.name),
      categoryCount: (e.classes || []).length,
      participantCount: (people.get(String(e._id)) || new Set()).size,
    }));
    return Response.json({ events: out });
  } catch (error) {
    console.error("[orienteering/events]", error);
    return Response.json({ error: "Gagal memuat event Orienteering" }, { status: 500 });
  }
}
