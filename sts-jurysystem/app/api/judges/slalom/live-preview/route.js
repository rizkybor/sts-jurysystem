import connectDB from "@/config/database";
import SlalomLivePreview from "@/models/SlalomLivePreview";
import { getSessionUser } from "@/utils/getSessionUser";

export const dynamic = "force-dynamic";

// POST — dipanggil oleh browser juri saat menerima socket
// `slalom:team-finished` dari sts-timingsystem (lihat useJudgeSocket usage
// di app/judges/slalom/page.jsx). Upsert pratinjau hasil satu Run tim
// supaya GET /api/events/[eventId]/live-results bisa menggabungkannya
// dgn hasil resmi utk Live Result — pola sama persis dgn
// app/api/judges/sprint/live-preview/route.js, TAPI di-key jg by
// runNumber (satu tim bisa py Run 1 & Run 2 sekaligus).
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
      runNumber,
      bibTeam,
      nameTeam,
      startTime,
      finishTime,
      raceTime,
      startPenalty,
      finishPenalty,
      gatePenalties,
      penaltyTime,
      totalTime,
    } = body || {};

    if (
      !eventId ||
      !initialId ||
      !divisionId ||
      !raceId ||
      !teamId ||
      !runNumber
    ) {
      return Response.json(
        {
          success: false,
          message:
            "eventId, initialId, divisionId, raceId, teamId, runNumber are required",
        },
        { status: 400 }
      );
    }

    await SlalomLivePreview.findOneAndUpdate(
      {
        eventId: String(eventId),
        initialId: String(initialId),
        raceId: String(raceId),
        divisionId: String(divisionId),
        teamId: String(teamId),
        runNumber: Number(runNumber),
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
          gatePenalties: Array.isArray(gatePenalties)
            ? gatePenalties.map((v) => Number(v) || 0)
            : [],
          penaltyTime: penaltyTime ? String(penaltyTime) : undefined,
          totalTime: totalTime ? String(totalTime) : undefined,
        },
      },
      { upsert: true, new: true }
    );

    return Response.json({ success: true });
  } catch (err) {
    console.error("❌ [slalom/live-preview] POST error:", err);
    return Response.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
