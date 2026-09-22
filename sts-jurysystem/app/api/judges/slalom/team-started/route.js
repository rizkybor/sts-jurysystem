import connectDB from "@/config/database";
import SlalomTeamStatus from "@/models/SlalomTeamStatus";
import { getSessionUser } from "@/utils/getSessionUser";

export const dynamic = "force-dynamic";

// POST — dipanggil oleh browser juri saat menerima socket
// `slalom:team-started` dari sts-timingsystem (lihat useJudgeSocket
// usage di app/judges/slalom/page.jsx). Upsert flag "team sudah Start"
// utk run tertentu supaya validasi submit penalty di
// judge-reports/detail/route.js bisa membacanya kembali.
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
      teamId,
      bibTeam,
      runNumber,
      startTime,
    } = body || {};

    if (!eventId || !divisionId || !raceId || !teamId || !runNumber || !startTime) {
      return Response.json(
        {
          success: false,
          message:
            "eventId, divisionId, raceId, teamId, runNumber, startTime are required",
        },
        { status: 400 }
      );
    }

    // BUG FIX: filter upsert sebelumnya TIDAK ikutkan initialId — lihat
    // catatan di models/SlalomTeamStatus.js.
    await SlalomTeamStatus.findOneAndUpdate(
      {
        eventId: String(eventId),
        initialId: String(initialId || ""),
        raceId: String(raceId),
        divisionId: String(divisionId),
        teamId: String(teamId),
        runNumber: Number(runNumber),
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
    console.error("❌ [slalom/team-started] POST error:", err);
    return Response.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// GET — cek status "sudah Start" untuk satu team+run, dipakai judge-
// reports/detail/route.js saat validasi submit (dipanggil server-side,
// tapi disediakan juga di sini utk konsistensi/keperluan debug manual).
export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const initialId = searchParams.get("initialId");
    const divisionId = searchParams.get("divisionId");
    const raceId = searchParams.get("raceId");
    const teamId = searchParams.get("teamId");
    const runNumber = searchParams.get("runNumber");

    if (!eventId || !divisionId || !raceId || !teamId || !runNumber) {
      return Response.json(
        {
          success: false,
          message: "eventId, divisionId, raceId, teamId, runNumber are required",
        },
        { status: 400 }
      );
    }

    const doc = await SlalomTeamStatus.findOne({
      eventId: String(eventId),
      initialId: String(initialId || ""),
      raceId: String(raceId),
      divisionId: String(divisionId),
      teamId: String(teamId),
      runNumber: Number(runNumber),
    }).lean();

    return Response.json({
      success: true,
      started: !!doc,
      startTime: doc?.startTime || null,
    });
  } catch (err) {
    console.error("❌ [slalom/team-started] GET error:", err);
    return Response.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
