// utils/orienteeringEvents.js — SERVER ONLY.
//
// Event modul Orienteering (koleksi `orienteeringEvents`, ditulis
// sts-timingsystem; di sini HANYA dibaca) dalam bentuk ringkas untuk kartu
// event publik (New Events di homepage, /matches). Hanya event yang
// "Tampil di Live Result" (liveVisible !== false) — sama dgn /live.
import mongoose from "mongoose";

// Orang yang ikut Sprint & Middle terdaftar di 2 start list -> dihitung 1x.
// Kunci sama dgn personKey() di sts-timingsystem (IOF ID -> BIB -> nama+kategori).
function personKey(p) {
  const iof = String(p.iofId || "").trim();
  if (iof) return `I:${iof}`;
  const bib = String(p.bib || "").trim();
  if (bib) return `B:${bib.toUpperCase()}`;
  return `N:${String(p.name || "").trim().toUpperCase()}|${p.classId || ""}`;
}

// Tanggal "YYYY-MM-DD" (zona WIB) -> Date
export function wibDate(s, endOfDay = false) {
  if (!s) return null;
  const d = new Date(`${s}T${endOfDay ? "23:59:59" : "00:00:00"}+07:00`);
  return isNaN(d) ? null : d;
}

export async function listPublicOrienteeringEvents({ q = "" } = {}) {
  const db = mongoose.connection.db;
  const filter = { liveVisible: { $ne: false } };
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { location: rx }, { "races.location": rx }];
  }
  const events = await db
    .collection("orienteeringEvents")
    .find(filter, {
      projection: { name: 1, location: 1, startDate: 1, endDate: 1, date: 1, image: 1, logo: 1, races: 1, types: 1, classes: 1, createdAt: 1 },
    })
    .toArray();
  if (!events.length) return [];

  const ids = events.map((e) => String(e._id));
  const ps = await db
    .collection("orienteeringParticipants")
    .find({ eventId: { $in: ids } }, { projection: { eventId: 1, iofId: 1, bib: 1, name: 1, classId: 1 } })
    .toArray();
  const people = new Map();
  for (const p of ps) {
    if (!people.has(p.eventId)) people.set(p.eventId, new Set());
    people.get(p.eventId).add(personKey(p));
  }

  return events.map((e) => {
    const startDate = e.startDate || e.date || null;
    return {
      kind: "orienteering",
      id: String(e._id),
      name: e.name || "Untitled",
      location: e.location || "",
      startDate,
      endDate: e.endDate || startDate,
      image: e.image?.url || null,
      logo: e.logo?.url || null,
      races: (e.races || []).map((r) => ({ id: r.id, name: r.name, location: r.location || "" })),
      types: (e.types || []).map((t) => t.name),
      categoryCount: (e.classes || []).length,
      participantCount: (people.get(String(e._id)) || new Set()).size,
      createdAt: e.createdAt || null,
      // utk pengurutan bersama event rafting
      _start: wibDate(startDate),
    };
  });
}
