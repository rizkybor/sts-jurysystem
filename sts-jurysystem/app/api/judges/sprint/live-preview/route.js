import connectDB from "@/config/database";
import SprintLivePreview from "@/models/SprintLivePreview";
import { getSessionUser } from "@/utils/getSessionUser";

export const dynamic = "force-dynamic";

// POST — dipanggil oleh browser juri saat menerima socket
// `sprint:team-finished` dari sts-timingsystem (lihat useJudgeSocket
// usage di app/judges/sprint/page.jsx). Upsert pratinjau hasil satu tim
// supaya GET /api/events/[eventId]/live-results bisa menggabungkannya
// dgn hasil resmi utk Live Result.
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
      nameTeam,
      startTime,
      finishTime,
      raceTime,
      startPenalty,
      finishPenalty,
      penaltyTime,
      totalTime,
    } = body || {};

    if (!eventId || !divisionId || !raceId || !teamId) {
      return Response.json(
        { success: false, message: "eventId, divisionId, raceId, teamId are required" },
        { status: 400 }
      );
    }

    await SprintLivePreview.findOneAndUpdate(
      {
        eventId: String(eventId),
        raceId: String(raceId),
        divisionId: String(divisionId),
        teamId: String(teamId),
      },
      {
        $set: {
          initialId: initialId ? String(initialId) : undefined,
          bibTeam: bibTeam ? String(bibTeam) : undefined,
          nameTeam: nameTeam ? String(nameTeam) : undefined,
          startTime: startTime ? String(startTime) : undefined,
          finishTime: finishTime ? String(finishTime) : undefined,
          raceTime: raceTime ? String(raceTime) : undefined,
          startPenalty: Number.isFinite(Number(startPenalty)) ? Number(startPenalty) : 0,
          finishPenalty: Number.isFinite(Number(finishPenalty)) ? Number(finishPenalty) : 0,
          penaltyTime: penaltyTime ? String(penaltyTime) : undefined,
          totalTime: totalTime ? String(totalTime) : undefined,
        },
      },
      { upsert: true, new: true }
    );

    return Response.json({ success: true });
  } catch (err) {
    console.error("❌ [sprint/live-preview] POST error:", err);
    return Response.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
