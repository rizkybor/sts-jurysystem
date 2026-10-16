import connectDB from "@/config/database";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// Detail event Orienteering utk halaman /matches/orienteering/[id]: info
// event + jenis + Type Event (dgn kategori) + daftar peserta PUBLIK.
// Peserta yang ikut beberapa jenis (Sprint & Middle = 2 dokumen) digabung
// jadi 1 baris (kunci sama dgn personKey() sts-timingsystem). Nomor SI
// Card & IOF ID sengaja tidak dikirim. Hanya event liveVisible.
function personKey(p) {
  const iof = String(p.iofId || "").trim();
  if (iof) return `I:${iof}`;
  const bib = String(p.bib || "").trim();
  if (bib) return `B:${bib.toUpperCase()}`;
  return `N:${String(p.name || "").trim().toUpperCase()}|${p.classId || ""}`;
}

export async function GET(_request, context) {
  try {
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(String(id || ""))) {
      return Response.json({ error: "Event tidak valid" }, { status: 400 });
    }
    await connectDB();
    const db = mongoose.connection.db;
    const e = await db
      .collection("orienteeringEvents")
      .findOne({ _id: new mongoose.Types.ObjectId(String(id)), liveVisible: { $ne: false } });
    if (!e) return Response.json({ error: "Event tidak ditemukan" }, { status: 404 });

    const eventId = String(e._id);
    const races = (e.races || []).map((r) => ({ id: r.id, name: r.name, location: r.location || "" }));
    const raceName = new Map(races.map((r) => [r.id, r.name]));
    const types = (e.types || []).map((t) => ({ id: t.id, name: t.name, raceIds: Array.isArray(t.raceIds) ? t.raceIds : [] }));
    const typeName = new Map(types.map((t) => [t.id, t.name]));
    const classes = (e.classes || []).map((c) => ({ id: c.id, name: c.name, typeId: c.typeId || "" }));
    const classById = new Map(classes.map((c) => [c.id, c]));

    const ps = await db
      .collection("orienteeringParticipants")
      .find(
        { eventId },
        { projection: { raceId: 1, name: 1, classId: 1, bib: 1, iofId: 1, club: 1, nationality: 1, startNo: 1, scheduledStart: 1 } }
      )
      .toArray();

    const people = new Map();
    const raceCount = new Map();
    const classCount = new Map();
    // Hitungan per jenis (race): "raceId|classId" -> Set personKey, dan
    // "raceId|typeId" -> Set personKey — dipakai rincian Type Event per jenis.
    const raceClassCount = new Map();
    const raceTypeCount = new Map();
    const addTo = (map, k, v) => {
      if (!map.has(k)) map.set(k, new Set());
      map.get(k).add(v);
    };
    for (const p of ps) {
      raceCount.set(p.raceId || "", (raceCount.get(p.raceId || "") || 0) + 1);
      const key = personKey(p);
      if (p.classId) {
        addTo(raceClassCount, `${p.raceId || ""}|${p.classId}`, key);
        const tid = classById.get(p.classId)?.typeId;
        if (tid) addTo(raceTypeCount, `${p.raceId || ""}|${tid}`, key);
      }
      if (!people.has(key)) {
        people.set(key, {
          key,
          name: p.name || "",
          bib: p.bib || "",
          club: p.club || "",
          nationality: p.nationality || "",
          classIds: [],
          races: [],
        });
      }
      const row = people.get(key);
      if (!row.club && p.club) row.club = p.club;
      if (!row.nationality && p.nationality) row.nationality = p.nationality;
      if (p.classId && !row.classIds.includes(p.classId)) row.classIds.push(p.classId);
      row.races.push({
        raceId: p.raceId || "",
        raceName: raceName.get(p.raceId) || "",
        classId: p.classId || "",
        startNo: p.startNo || null,
        start: /^\d{1,2}:\d{2}/.test(String(p.scheduledStart || "")) ? String(p.scheduledStart).slice(0, 5) : "",
      });
    }
    const participants = Array.from(people.values()).map((row) => {
      row.classIds.forEach((cid) => {
        if (!classCount.has(cid)) classCount.set(cid, new Set());
        classCount.get(cid).add(row.key);
      });
      const cls = row.classIds.map((cid) => classById.get(cid)).filter(Boolean);
      return {
        ...row,
        categories: cls.map((c) => ({ id: c.id, name: c.name, typeId: c.typeId, typeName: typeName.get(c.typeId) || "" })),
        races: row.races.sort((a, b) => races.findIndex((r) => r.id === a.raceId) - races.findIndex((r) => r.id === b.raceId)),
      };
    });
    participants.sort((a, b) => {
      const ca = a.categories[0]?.name || "~";
      const cb = b.categories[0]?.name || "~";
      return ca.localeCompare(cb, "id", { numeric: true }) || a.name.localeCompare(b.name, "id");
    });

    return Response.json({
      event: {
        id: eventId,
        name: e.name || "Untitled",
        location: e.location || "",
        startDate: e.startDate || e.date || null,
        endDate: e.endDate || e.startDate || e.date || null,
        image: e.image?.url || null,
        logo: e.logo?.url || null,
      },
      races: races.map((r) => ({ ...r, participantCount: raceCount.get(r.id) || 0 })),
      types: types.map((t) => ({
        ...t,
        raceNames: t.raceIds.length ? t.raceIds.map((rid) => raceName.get(rid)).filter(Boolean) : races.map((r) => r.name),
        // Rincian per jenis: kategori + jumlah peserta di jenis tsb.
        raceBreakdown: (t.raceIds.length ? races.filter((r) => t.raceIds.includes(r.id)) : races).map((r) => ({
          raceId: r.id,
          raceName: r.name,
          participants: (raceTypeCount.get(`${r.id}|${t.id}`) || new Set()).size,
          categories: classes
            .filter((c) => c.typeId === t.id)
            .map((c) => ({ id: c.id, name: c.name, participants: (raceClassCount.get(`${r.id}|${c.id}`) || new Set()).size })),
        })),
        categories: classes
          .filter((c) => c.typeId === t.id)
          .map((c) => ({ id: c.id, name: c.name, participants: (classCount.get(c.id) || new Set()).size })),
        participants: new Set(
          participants.filter((p) => p.categories.some((c) => c.typeId === t.id)).map((p) => p.key)
        ).size,
      })),
      participantCount: participants.length,
      // kunci internal (bisa berisi IOF ID / BIB) diganti id buram sebelum ke publik
      participants: participants.map(({ key: _k, classIds: _c, ...p }, i) => ({ ...p, key: `p${i + 1}` })),
    });
  } catch (error) {
    console.error("[orienteering/events/:id/participants]", error);
    return Response.json({ error: "Gagal memuat detail event" }, { status: 500 });
  }
}
