import connectDB from "@/config/database";
import RaceSetting from "@/models/RaceSetting";

// GET Race Settings mentah untuk satu event — dipakai judge pages supaya
// pilihan nilai penalty (mis. H2H Start/Cut Line/Finish) mengikuti apa
// yang benar-benar dikustomisasi operator lewat Race Settings di
// sts-timingsystem (settings.h2h.startPenalties/cutLinePenalties/
// finishPenalties dkk — lihat editRaceSettings.js), bukan hardcode.
// Model RaceSetting di jurysystem cuma mendeklarasikan sebagian field,
// tapi `.lean()` tetap mengembalikan dokumen mentah apa adanya, jadi
// field yang ditulis timingsystem walau tidak ada di schema ini tetap ikut.
export async function GET(req, { params }) {
  try {
    await connectDB();
    const { eventId } = await params;

    if (!eventId) {
      return Response.json(
        { success: false, message: "eventId is required" },
        { status: 400 }
      );
    }

    const doc = await RaceSetting.findOne({ eventId: String(eventId) }).lean();

    return Response.json(
      { success: true, settings: doc?.settings || {} },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ [GET /api/events/[eventId]/race-settings]", error);
    return Response.json(
      { success: false, message: "Failed to fetch race settings" },
      { status: 500 }
    );
  }
}
