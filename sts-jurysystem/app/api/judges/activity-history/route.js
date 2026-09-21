import connectDB from "@/config/database";
import JudgeReportDetail from "@/models/JudgeReportDetail";
import H2HFoulsReport from "@/models/H2HFoulsReport";
import TeamsRegistered from "@/models/TeamsRegistered";
import User from "@/models/User";
import { getSessionUser } from "@/utils/getSessionUser";

export const dynamic = "force-dynamic";

/* ============================================================
 🟢 GET — Riwayat Aktivitas LENGKAP satu juri pada satu event
    (by id), LINTAS SEMUA kategori (Sprint/H2H/Slalom/DRR/RX) DAN
    lintas jenis tindakan (penalty + Fouls Report H2H) dalam SATU
    daftar, diurut waktu terbaru dulu.

    Beda dari /api/judges/judge-reports/detail?fromReport=true yang
    dipakai modal Riwayat per-kategori (Sprint/Slalom/DRR/H2H masing-
    masing) — endpoint itu WAJIB eventType (cuma 1 kategori per
    panggilan) dan TIDAK PERNAH menyertakan Fouls Report (koleksi
    terpisah, h2hFoulsReports, ditulis LANGSUNG oleh sts-timingsystem
    lewat relay socket — bukan lewat JudgeReportDetail). Endpoint ini
    menggabungkan KEDUANYA jadi satu "Riwayat Aktivitas Saya" per event.

    Query: eventId (wajib), page, limit
============================================================ */
export const GET = async (req) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId") || undefined;
    if (!eventId) {
      return new Response(
        JSON.stringify({ success: false, message: "eventId is required" }),
        { status: 400 }
      );
    }

    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "50", 10), 1),
      200
    );

    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ success: false, message: "Not authenticated" }),
        { status: 401 }
      );
    }
    const user = await User.findById(sessionUser.userId).lean();
    if (!user?.username) {
      return new Response(
        JSON.stringify({ success: false, message: "User not found" }),
        { status: 404 }
      );
    }
    const username = user.username;

    // === Ambil SEMUA penalty (lintas kategori — dibedakan field
    // eventType tiap dokumen) yang genuinely tersimpan (bukan percobaan
    // gagal) milik juri ini di event ini. ===
    const penaltyDetails = await JudgeReportDetail.find({
      eventId,
      judge: username,
      status: { $ne: "failed" },
    }).lean();

    // === Ambil SEMUA Fouls Report H2H milik juri ini di event ini. ===
    const foulsReports = await H2HFoulsReport.find({
      eventId,
      judge: username,
    }).lean();

    // === Normalisasi keduanya ke bentuk yang SAMA supaya bisa
    // digabung & diurut bareng di satu daftar. ===
    const penaltyItems = penaltyDetails.map((d) => ({
      _id: String(d._id),
      activityType: "penalty",
      eventType: d.eventType,
      team: d.team,
      position: d.position,
      operationType: d.operationType,
      runNumber: d.runNumber,
      gateNumber: d.gateNumber,
      section: d.section,
      roundId: d.roundId,
      penalty: d.penalty,
      remarks: d.remarks,
      initialId: d.initialId,
      divisionId: d.divisionId,
      raceId: d.raceId,
      createdAt: d.createdAt,
    }));

    const foulsItems = foulsReports.map((f) => ({
      _id: String(f._id),
      activityType: "fouls",
      eventType: "H2H",
      team: f.foulTeam?.teamId || "",
      teamInfo: f.foulTeam?.nameTeam
        ? { nameTeam: f.foulTeam.nameTeam, bibTeam: f.foulTeam.bibTeam }
        : undefined,
      unfoulTeamInfo: f.unfoulTeam?.nameTeam
        ? { nameTeam: f.unfoulTeam.nameTeam, bibTeam: f.unfoulTeam.bibTeam }
        : undefined,
      positionLabel: f.positionLabel || f.position,
      detailLabel: f.detailLabel || f.detail,
      penaltySecondsLabel: f.penaltySecondsLabel,
      remarks: f.remarks,
      roundId: f.roundId,
      roundName: f.roundName,
      initialId: f.initialId,
      divisionId: f.divisionId,
      raceId: f.raceId,
      createdAt: f.receivedAt,
    }));

    // === Gabung + urut TERBARU dulu ===
    const merged = [...penaltyItems, ...foulsItems].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const total = merged.length;
    const start = (page - 1) * limit;
    const pageItems = merged.slice(start, start + limit);

    // === Enrich info tim (kalau belum ada — Fouls Report sudah bawa
    // teamInfo sendiri dari foulTeam, penalty items masih perlu lookup). ===
    const enriched = await Promise.all(
      pageItems.map(async (item) => {
        if (item.teamInfo) return item; // Fouls Report sudah lengkap
        try {
          const teamDoc = await TeamsRegistered.findOne(
            { eventId, "teams.teamId": item.team },
            { "teams.$": 1 }
          ).lean();
          const t = teamDoc?.teams?.[0];
          return {
            ...item,
            teamInfo: t
              ? {
                  nameTeam: t.nameTeam,
                  bibTeam: t.bibTeam,
                  division: t.divisionName || "N/A",
                }
              : { nameTeam: "Unknown Team", bibTeam: "N/A" },
          };
        } catch {
          return {
            ...item,
            teamInfo: { nameTeam: "Error loading team", bibTeam: "N/A" },
          };
        }
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          totalPenalty: penaltyItems.length,
          totalFouls: foulsItems.length,
        },
        data: enriched,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error fetching activity history:", err);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Internal Server Error",
        error: err.message,
      }),
      { status: 500 }
    );
  }
};
