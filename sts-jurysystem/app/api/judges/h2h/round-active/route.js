import connectDB from "@/config/database";
import H2HActiveRound from "@/models/H2HActiveRound";
import { getSessionUser } from "@/utils/getSessionUser";

export const dynamic = "force-dynamic";

// POST — dipanggil browser juri saat menerima socket `h2h:round-active`
// dari sts-timingsystem (lihat useJudgeSocket usage di
// app/judges/headtohead/page.jsx). Upsert (replace) babak aktif +
// daftar tim utk kategori ini.
export async function POST(req) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return Response.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    await connectDB();
    const body = await req.json();
    const {
      eventId,
      initialId,
      divisionId,
      raceId,
      roundId,
      roundName,
      teams,
    } = body || {};

    if (!eventId || !divisionId || !raceId) {
      return Response.json(
        { success: false, message: "eventId, divisionId, raceId are required" },
        { status: 400 }
      );
    }

    await H2HActiveRound.findOneAndUpdate(
      {
        eventId: String(eventId),
        raceId: String(raceId),
        divisionId: String(divisionId),
      },
      {
        $set: {
          initialId: initialId ? String(initialId) : undefined,
          roundId: roundId ? String(roundId) : "",
          roundName: roundName ? String(roundName) : "",
          teams: Array.isArray(teams)
            ? teams.map((t) => ({
                teamId: t?.teamId ? String(t.teamId) : "",
                bibTeam: t?.bibTeam ? String(t.bibTeam) : "",
                nameTeam: t?.nameTeam ? String(t.nameTeam) : "",
              }))
            : [],
        },
      },
      { upsert: true, new: true }
    );

    return Response.json({ success: true });
  } catch (err) {
    console.error("❌ [h2h/round-active] POST error:", err);
    return Response.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// GET — baca babak aktif + daftar tim utk satu kategori, dipakai halaman
// Head to Head utk label babak aktif + filter dropdown Team.
export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const divisionId = searchParams.get("divisionId");
    const raceId = searchParams.get("raceId");

    if (!eventId || !divisionId || !raceId) {
      return Response.json(
        { success: false, message: "eventId, divisionId, raceId are required" },
        { status: 400 }
      );
    }

    const doc = await H2HActiveRound.findOne({
      eventId: String(eventId),
      raceId: String(raceId),
      divisionId: String(divisionId),
    }).lean();

    return Response.json({
      success: true,
      roundId: doc?.roundId || null,
      roundName: doc?.roundName || null,
      teams: doc?.teams || [],
    });
  } catch (err) {
    console.error("❌ [h2h/round-active] GET error:", err);
    return Response.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
