import connectDB from "@/config/database";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// Detail 1 event Orienteering + snapshot hasil per jenis (Sprint/Middle
// Distance, ...) dari orienteeringLiveResults. Snapshot dihitung & ditulis
// ulang oleh sts-timingsystem tiap kartu SI dibaca / data berubah.
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

    const snaps = await db.collection("orienteeringLiveResults").find({ eventId: String(e._id) }).toArray();
    const byRace = new Map(snaps.map((s) => [s.raceId || "", s]));
    const raceList = (e.races || []).length ? e.races : [{ id: "", name: "Hasil", location: e.location || "" }];

    return Response.json({
      event: {
        id: String(e._id),
        name: e.name || "Untitled",
        location: e.location || "",
        startDate: e.startDate || e.date || null,
        endDate: e.endDate || e.startDate || e.date || null,
        image: e.image?.url || null,
        logo: e.logo?.url || null,
        types: (e.types || []).map((t) => ({ id: t.id, name: t.name })),
      },
      races: raceList.map((r) => {
        const s = byRace.get(r.id || "");
        return {
          id: r.id || "",
          name: r.name,
          location: r.location || "",
          updatedAt: s?.updatedAt || null,
          classes: s?.classes || [],
        };
      }),
    });
  } catch (error) {
    console.error("[orienteering/events/:id]", error);
    return Response.json({ error: "Gagal memuat hasil" }, { status: 500 });
  }
}
