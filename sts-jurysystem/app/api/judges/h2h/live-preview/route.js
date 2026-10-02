import connectDB from "@/config/database";
import H2HLivePreview from "@/models/H2HLivePreview";
import { getSessionUser } from "@/utils/getSessionUser";

export const dynamic = "force-dynamic";

// POST — dipanggil oleh browser juri saat menerima socket
// `h2h:team-finished` dari sts-timingsystem (lihat useJudgeSocket usage di
// app/judges/headtohead/page.jsx). Upsert pratinjau hasil satu tim di
// babak berjalan supaya GET /api/events/[eventId]/live-results bisa
// menggabungkannya dgn hasil resmi utk Live Result — pola sama persis
// dgn app/api/judges/sprint/live-preview/route.js, TAPI di-key jg by
// roundId (satu tim bisa py hasil di beberapa babak).
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
      roundId,
      roundName,
      bibTeam,
      nameTeam,
      startTime,
      finishTime,
      raceTime,
    } = body || {};

    if (!eventId || !initialId || !divisionId || !raceId || !teamId || !roundId) {
      return Response.json(
        {
          success: false,
          message:
            "eventId, initialId, divisionId, raceId, teamId, roundId are required",
        },
        { status: 400 }
      );
    }

    await H2HLivePreview.findOneAndUpdate(
      {
        eventId: String(eventId),
        initialId: String(initialId),
        raceId: String(raceId),
        divisionId: String(divisionId),
        teamId: String(teamId),
        roundId: String(roundId),
      },
      {
        $set: {
          roundName: roundName ? String(roundName) : undefined,
          bibTeam: bibTeam ? String(bibTeam) : undefined,
          nameTeam: nameTeam ? String(nameTeam) : undefined,
          startTime: startTime ? String(startTime) : undefined,
          finishTime: finishTime ? String(finishTime) : undefined,
          raceTime: raceTime ? String(raceTime) : undefined,
        },
      },
      { upsert: true, new: true }
    );

    return Response.json({ success: true });
  } catch (err) {
    console.error("❌ [h2h/live-preview] POST error:", err);
    return Response.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
