import connectDB from "@/config/database";
import DrrLivePreview from "@/models/DrrLivePreview";
import { getSessionUser } from "@/utils/getSessionUser";

export const dynamic = "force-dynamic";

// POST — dipanggil oleh browser juri saat menerima socket
// `drr:team-finished` dari sts-timingsystem (lihat useJudgeSocket usage di
// app/judges/downriverrace/page.jsx). Upsert pratinjau hasil satu tim
// supaya GET /api/events/[eventId]/live-results bisa menggabungkannya
// dgn hasil resmi utk Live Result — pola sama persis dgn
// app/api/judges/sprint/live-preview/route.js.
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
      sectionPenaltyTime,
      penaltyTime,
      totalTime,
    } = body || {};

    if (!eventId || !initialId || !divisionId || !raceId || !teamId) {
      return Response.json(
        {
          success: false,
          message: "eventId, initialId, divisionId, raceId, teamId are required",
        },
        { status: 400 }
      );
    }

    await DrrLivePreview.findOneAndUpdate(
      {
        eventId: String(eventId),
        initialId: String(initialId),
        raceId: String(raceId),
        divisionId: String(divisionId),
        teamId: String(teamId),
      },
      {
        $set: {
          bibTeam: bibTeam ? String(bibTeam) : undefined,
          nameTeam: nameTeam ? String(nameTeam) : undefined,
          startTime: startTime ? String(startTime) : undefined,
          finishTime: finishTime ? String(finishTime) : undefined,
          raceTime: raceTime ? String(raceTime) : undefined,
          startPenalty: Number.isFinite(Number(startPenalty)) ? Number(startPenalty) : 0,
          finishPenalty: Number.isFinite(Number(finishPenalty)) ? Number(finishPenalty) : 0,
          sectionPenaltyTime: Array.isArray(sectionPenaltyTime)
            ? sectionPenaltyTime.map((v) => String(v || ""))
            : [],
          penaltyTime: penaltyTime ? String(penaltyTime) : undefined,
          totalTime: totalTime ? String(totalTime) : undefined,
        },
      },
      { upsert: true, new: true }
    );

    return Response.json({ success: true });
  } catch (err) {
    console.error("❌ [drr/live-preview] POST error:", err);
    return Response.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
