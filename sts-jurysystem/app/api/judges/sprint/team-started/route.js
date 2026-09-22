import connectDB from "@/config/database";
import SprintTeamStatus from "@/models/SprintTeamStatus";
import { getSessionUser } from "@/utils/getSessionUser";

export const dynamic = "force-dynamic";

// POST — dipanggil oleh browser juri saat menerima socket
// `sprint:team-started` dari sts-timingsystem (lihat useJudgeSocket usage
// di app/judges/sprint/page.jsx). Upsert flag "team sudah Start" supaya
// validasi submit penalty di judge-reports/detail/route.js bisa
// membacanya kembali.
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
    const { eventId, initialId, divisionId, raceId, teamId, bibTeam, startTime } =
      body || {};

    if (!eventId || !divisionId || !raceId || !teamId || !startTime) {
      return Response.json(
        {
          success: false,
          message:
            "eventId, divisionId, raceId, teamId, startTime are required",
        },
        { status: 400 }
      );
    }

    // BUG FIX: filter upsert sebelumnya TIDAK ikutkan initialId — satu
    // teamId+raceId+divisionId yang KEBETULAN sama bisa dipakai ulang
    // di Initial berbeda (mis. "SENIOR" & "U23"), bikin flag "sudah
    // Start" salah nyasar antar-Initial. Lihat catatan di
    // models/SprintTeamStatus.js.
    await SprintTeamStatus.findOneAndUpdate(
      {
        eventId: String(eventId),
        initialId: String(initialId || ""),
        raceId: String(raceId),
        divisionId: String(divisionId),
        teamId: String(teamId),
      },
      {
        $set: {
          bibTeam: bibTeam ? String(bibTeam) : undefined,
          startTime: String(startTime),
        },
      },
      { upsert: true, new: true }
    );

    return Response.json({ success: true });
  } catch (err) {
    console.error("❌ [sprint/team-started] POST error:", err);
    return Response.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// GET — cek status "sudah Start" untuk satu team+race, dipakai
// judge-reports/detail/route.js saat validasi submit.
export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const initialId = searchParams.get("initialId");
    const divisionId = searchParams.get("divisionId");
    const raceId = searchParams.get("raceId");
    const teamId = searchParams.get("teamId");

    if (!eventId || !divisionId || !raceId || !teamId) {
      return Response.json(
        { success: false, message: "eventId, divisionId, raceId, teamId are required" },
        { status: 400 }
      );
    }

    const doc = await SprintTeamStatus.findOne({
      eventId: String(eventId),
      initialId: String(initialId || ""),
      raceId: String(raceId),
      divisionId: String(divisionId),
      teamId: String(teamId),
    }).lean();

    return Response.json({
      success: true,
      started: !!doc,
      startTime: doc?.startTime || null,
    });
  } catch (err) {
    console.error("❌ [sprint/team-started] GET error:", err);
    return Response.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
