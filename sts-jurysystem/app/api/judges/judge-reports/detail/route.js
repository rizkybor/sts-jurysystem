import connectDB from "@/config/database";
import JudgeReport from "@/models/JudgeReport";
import JudgeReportDetail from "@/models/JudgeReportDetail";
import TeamsRegistered from "@/models/TeamsRegistered";
import User from "@/models/User";
import RaceSetting from "@/models/RaceSetting";
import { getSessionUser } from "@/utils/getSessionUser";
import {
  buildCreatedAtMeta,
  getTimeZoneFromRequest,
  formatDateByZone,
} from "@/utils/timezone";

export const dynamic = "force-dynamic";

/* ============================================================
 🟢 GET — Ambil Data Judge Report Detail (Semua EventType)
   - Filter: eventId, eventType, team
   - Filter judge: judge (exact), judges (list), judgeLike (partial), mine (session)
   - Date range: createdFrom, createdTo (ISO string)
   - Pagination: page, limit
   - Sorting: sortBy, sort=asc|desc
============================================================ */
export const GET = async (req) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    // 🔎 Filters dasar
    const eventId = searchParams.get("eventId") || undefined;
    const eventType =
      (searchParams.get("eventType") || "").toUpperCase() || undefined; // SPRINT | SLALOM | H2H | DRR
    const team = searchParams.get("team") || undefined;
    const fromReport =
      (searchParams.get("fromReport") || "false").toLowerCase() === "true";

    // 👤 Filters judge (Mode A saja; Mode B implicit by session)
    const judge = searchParams.get("judge") || undefined; // exact username
    const judgesParam = searchParams.get("judges") || undefined; // "alice,bob"
    const judgeLike = searchParams.get("judgeLike") || undefined; // partial (regex)
    const mine = searchParams.get("mine") === "true"; // use session user

    // 🗓️ Rentang tanggal (createdAt)
    const createdFrom = searchParams.get("createdFrom") || undefined; // ISO e.g. 2025-10-01T00:00:00.000Z
    const createdTo = searchParams.get("createdTo") || undefined;

    // 📄 Pagination & sorting
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "50", 10), 1),
      200
    );
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder =
      (searchParams.get("sort") || "desc").toLowerCase() === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;

    // =========================================================
    // MODE B — dari JudgeReport (fromReport=true)
    // =========================================================
    if (fromReport) {
      if (!eventId) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "eventId is required for fromReport=true",
          }),
          { status: 400 }
        );
      }
      if (!eventType) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "eventType is required for fromReport=true",
          }),
          { status: 400 }
        );
      }

      // Ambil session user
      const sessionUser = await getSessionUser();
      if (!sessionUser?.userId) {
        return new Response(
          JSON.stringify({ success: false, message: "Not authenticated" }),
          {
            status: 401,
          }
        );
      }

      // Tentukan nama field array di JudgeReport
      const pushMap = {
        SPRINT: "reportSprint",
        SLALOM: "reportSlalom",
        H2H: "reportHeadToHead",
        DRR: "reportDrr",
      };
      const arrayField = pushMap[eventType] || "reportSprint";

      // 1) Ambil JudgeReport milik user untuk eventId
      const jr = await JudgeReport.findOne({
        eventId,
        juryId: sessionUser.userId,
      })
        .select(arrayField)
        .lean();

      if (
        !jr ||
        !Array.isArray(jr[arrayField]) ||
        jr[arrayField].length === 0
      ) {
        return new Response(
          JSON.stringify({
            success: true,
            meta: {
              page,
              limit,
              total: 0,
              totalPages: 0,
              sortBy,
              sort: sortOrder === 1 ? "asc" : "desc",
            },
            data: [],
            message: "No details in JudgeReport",
          }),
          { status: 200 }
        );
      }

      // 2) Siapkan filter ke JudgeReportDetail berdasar id di array + filter tambahan
      const filterDetails = {
        _id: { $in: jr[arrayField] },
        eventId,
        eventType,
      };
      if (team) filterDetails.team = team;
      if (createdFrom || createdTo) {
        filterDetails.createdAt = {};
        if (createdFrom) filterDetails.createdAt.$gte = new Date(createdFrom);
        if (createdTo) filterDetails.createdAt.$lte = new Date(createdTo);
      }

      // 3) Query + pagination
      const [items, total] = await Promise.all([
        JudgeReportDetail.find(filterDetails)
          .sort({ [sortBy]: sortOrder })
          .skip(skip)
          .limit(limit)
          .lean(),
        JudgeReportDetail.countDocuments(filterDetails),
      ]);

      // 4) Enrich info tim (opsional, seperti sebelumnya)
      const enriched = await Promise.all(
        items.map(async (d) => {
          try {
            const teamDoc = await TeamsRegistered.findOne(
              { eventId: d.eventId, "teams.teamId": d.team },
              { "teams.$": 1 }
            ).lean();
            const t = teamDoc?.teams?.[0];
            return {
              ...d,
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
              ...d,
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
            sortBy,
            sort: sortOrder === 1 ? "asc" : "desc",
            mode: "fromReport",
          },
          data: enriched,
        }),
        { status: 200 }
      );
    }

    // =========================================================
    // MODE A — perilaku lama (filter langsung ke JudgeReportDetail)
    // =========================================================

    // 🧱 Bangun filter query (lama)
    const filter = {};
    if (eventId) filter.eventId = eventId;
    if (eventType) filter.eventType = eventType;
    if (team) filter.team = team;

    // 👤 Resolve "mine" → username dari session
    let mineUsername;
    if (mine) {
      const sessionUser = await getSessionUser();
      if (!sessionUser?.userId) {
        return new Response(
          JSON.stringify({ success: false, message: "Not authenticated" }),
          {
            status: 401,
          }
        );
      }
      const user = await User.findById(sessionUser.userId).lean();
      mineUsername = user?.username;
      if (!mineUsername) {
        return new Response(
          JSON.stringify({ success: false, message: "User not found" }),
          {
            status: 404,
          }
        );
      }
      filter.judge = mineUsername;
    }

    // 🎯 Filter judge lain (jika bukan "mine")
    if (!mine) {
      if (judge) {
        filter.judge = judge;
      } else if (judgesParam) {
        const arr = judgesParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (arr.length > 0) filter.judge = { $in: arr };
      } else if (judgeLike) {
        filter.judge = { $regex: judgeLike, $options: "i" };
      }
    }

    // 🗓️ Filter tanggal
    if (createdFrom || createdTo) {
      filter.createdAt = {};
      if (createdFrom) filter.createdAt.$gte = new Date(createdFrom);
      if (createdTo) filter.createdAt.$lte = new Date(createdTo);
    }

    // 📊 Query + pagination
    const [items, total] = await Promise.all([
      JudgeReportDetail.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      JudgeReportDetail.countDocuments(filter),
    ]);

    if (!items.length) {
      return new Response(
        JSON.stringify({
          success: true,
          meta: {
            page,
            limit,
            total,
            totalPages: 0,
            sortBy,
            sort: sortOrder === 1 ? "asc" : "desc",
          },
          data: [],
          message: "No report details found for the given filter",
        }),
        { status: 200 }
      );
    }

    // 🧩 Enrich info tim (opsional)
    const enriched = await Promise.all(
      items.map(async (d) => {
        try {
          const teamDoc = await TeamsRegistered.findOne(
            { eventId: d.eventId, "teams.teamId": d.team },
            { "teams.$": 1 }
          ).lean();
          const t = teamDoc?.teams?.[0];
          return {
            ...d,
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
            ...d,
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
          sortBy,
          sort: sortOrder === 1 ? "asc" : "desc",
          appliedJudge: mine
            ? mineUsername
            : judge || judgesParam || judgeLike || null,
          mode: "direct",
        },
        data: enriched,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error fetching JudgeReportDetail:", err);
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

/* ============================================================
 🔵 POST — Simpan Data Dinamis (SPRINT, SLALOM, H2H, DRR)
============================================================ */
export const POST = async (req) => {
  try {
    await connectDB();

    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ success: false, message: "User not authenticated" }),
        { status: 401 }
      );
    }

    const tz = getTimeZoneFromRequest(req);

    const body = await req.json();
    const {
      eventType, // 'SPRINT' | 'SLALOM' | 'H2H' | 'DRR'
      eventId,
      team,
      position,
      penalty,
      gateNumber,
      runNumber,
      raceId,
      divisionId,
      operationType,
      remarks,
    } = body;

    if (!eventType || !eventId || !team) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing core fields: eventType, eventId, team",
        }),
        { status: 400 }
      );
    }

    const normalizedType = eventType.toUpperCase();
    if (penalty === undefined || penalty === null) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing penalty value",
        }),
        { status: 400 }
      );
    }

    const user = await User.findById(sessionUser.userId);
    if (!user) throw new Error("User not found");
    const username = user.username;

    let message = "";
    let updateQuery = { $set: {} };

    /* =========================
       STEP 0: VALIDASI KHUSUS
    ==========================*/
    if (normalizedType === "SPRINT") {
      if (!position || (position !== "Start" && position !== "Finish")) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'SPRINT requires position: "Start" or "Finish"',
          }),
          { status: 400 }
        );
      }

      const existing = await JudgeReportDetail.find({
        eventId,
        eventType: "SPRINT",
        team,
      }).lean();

      const hasStart = existing.some((r) => r.position === "Start");
      const hasFinish = existing.some((r) => r.position === "Finish");

      if (hasStart && hasFinish) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Team ${team} sudah memiliki Start dan Finish.`,
          }),
          { status: 400 }
        );
      }
      if (
        (position === "Start" && hasStart) ||
        (position === "Finish" && hasFinish)
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Team ${team} sudah memiliki posisi ${position}.`,
          }),
          { status: 400 }
        );
      }
    }

    /* ===================================
       STEP 1: UPDATE TeamsRegistered
    ====================================*/
    if (normalizedType === "SPRINT") {
      const penaltyField =
        position === "Start" ? "result.startPenalty" : "result.finishPenalty";

      console.log("🔍 Searching for team:", {
        eventId,
        team,
        position,
        penaltyField,
      });

      // gunakan UTC untuk simpan, dan local string opsional
      const { createdAt, createdAtLocal } = buildCreatedAtMeta(tz);
      updateQuery.$set["teams.$.result.judgesTime"] = createdAt.toISOString();
      // opsional: jika schema menampung
      updateQuery.$set["teams.$.result.judgesTimeLocal"] = createdAtLocal;
      updateQuery.$set["teams.$.result.judgesTimeTz"] = tz;

      message = `Sprint ${position} penalty recorded - ${penalty}s`;
    }

    if (normalizedType === "HEADTOHEAD") {
    }

    if (normalizedType === "SLALOM") {
      const runIdx = (runNumber || 1) - 1;

      // Ambil dokumen tim untuk membaca kondisi saat ini (khusus SLALOM)
      const teamDoc = await TeamsRegistered.findOne(
        { eventId, eventName: "SLALOM", "teams.teamId": team },
        { "teams.$": 1 } // ambil hanya tim yang match
      );

      if (!teamDoc) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Team not found in TeamsRegistered collection",
          }),
          { status: 404 }
        );
      }

      // Ambil total gate dari setting (default 14 jika tidak ada)
      const raceSetting = await RaceSetting.findOne({ eventId });
      const totalGates = raceSetting?.settings?.slalom?.totalGate || 14;

      // Kondisi saat ini
      const currentRun =
        teamDoc.teams?.[0]?.result?.[runIdx]?.penaltyTotal || {};
      const currentGates = Array.isArray(currentRun.gates)
        ? currentRun.gates
        : [];

      // Pastikan kita tidak menimpa updateQuery dari SPRINT
      // (gunakan yang sudah dideklarasi di atas: let updateQuery = { $set: {} })
      // Tambahkan ke $set / $inc yang sama
      if (operationType === "start") {
        // simpan pada penaltyTotal.start
        updateQuery.$set[`teams.$.result.${runIdx}.penaltyTotal.start`] =
          Number(penalty);
        message = `Slalom START penalty - Run ${runIdx + 1}: ${penalty}s`;
      } else if (operationType === "finish") {
        // simpan pada penaltyTotal.finish
        updateQuery.$set[`teams.$.result.${runIdx}.penaltyTotal.finish`] =
          Number(penalty);
        message = `Slalom FINISH penalty - Run ${runIdx + 1}: ${penalty}s`;
      } else if (operationType === "gate") {
        // validasi gate
        const gateIdx = Number(gateNumber) - 1;
        if (
          !Number.isInteger(gateIdx) ||
          gateIdx < 0 ||
          gateIdx >= totalGates
        ) {
          return new Response(
            JSON.stringify({
              success: false,
              message: `Invalid gateNumber ${gateNumber}. Must be between 1 and ${totalGates}`,
            }),
            { status: 400 }
          );
        }

        // 3 skenario update gates:
        if (currentGates.length === 0) {
          // 1) belum ada array → init
          const newGates = Array(totalGates).fill(0);
          newGates[gateIdx] = Number(penalty);
          updateQuery.$set[`teams.$.result.${runIdx}.penaltyTotal.gates`] =
            newGates;
          message = `Slalom GATE init - Run ${runIdx + 1} Gate ${
            gateIdx + 1
          }: ${penalty}s`;
        } else if (currentGates.length !== totalGates) {
          // 2) size tidak match → resize (copy yang ada)
          const resized = Array(totalGates).fill(0);
          for (let i = 0; i < Math.min(currentGates.length, totalGates); i++) {
            resized[i] = currentGates[i];
          }
          resized[gateIdx] = Number(penalty);
          updateQuery.$set[`teams.$.result.${runIdx}.penaltyTotal.gates`] =
            resized;
          message = `Slalom GATE resized - Run ${runIdx + 1} Gate ${
            gateIdx + 1
          }: ${penalty}s`;
        } else {
          // 3) array sudah sesuai → update 1 index
          updateQuery.$set[
            `teams.$.result.${runIdx}.penaltyTotal.gates.${gateIdx}`
          ] = Number(penalty);
          message = `Slalom GATE update - Run ${runIdx + 1} Gate ${
            gateIdx + 1
          }: ${penalty}s`;
        }

        // akumulasi total
        if (!updateQuery.$inc) updateQuery.$inc = {};
        if (
          typeof updateQuery.$inc[
            `teams.$.result.${runIdx}.penaltyTotal.total`
          ] !== "number"
        ) {
          updateQuery.$inc[`teams.$.result.${runIdx}.penaltyTotal.total`] = 0;
        }
        updateQuery.$inc[`teams.$.result.${runIdx}.penaltyTotal.total`] +=
          Number(penalty);
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            message: "SLALOM requires operationType: start | finish | gate",
          }),
          { status: 400 }
        );
      }

      // Common metadata untuk run tsb
      updateQuery.$set[`teams.$.result.${runIdx}.judgesBy`] = username;
      updateQuery.$set[`teams.$.result.${runIdx}.judgesTime`] =
        new Date().toISOString();
    }

    if (normalizedType === "DRR") {
    }

    const updatedTeam = await TeamsRegistered.findOneAndUpdate(
      { eventId, eventName: normalizedType, "teams.teamId": team },
      updateQuery,
      { new: true }
    );

    if (!updatedTeam) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Failed to update team data (TeamsRegistered not found)",
        }),
        { status: 404 }
      );
    }

    /* ===================================
       STEP 2: UPSERT JudgeReport
    ====================================*/
    let judgeReport = await JudgeReport.findOne({
      eventId,
      juryId: sessionUser.userId,
    });

    if (!judgeReport) {
      judgeReport = await JudgeReport.create({
        eventId,
        juryId: sessionUser.userId,
        createdBy: username,
        reportSprint: [],
        reportHeadToHead: [],
        reportSlalom: [],
        reportDrr: [],
      });
    }

    /* ===================================
       STEP 3: CREATE JudgeReportDetail
    ====================================*/
    const stamp = buildCreatedAtMeta(tz);
    const detail = await JudgeReportDetail.create({
      eventId,
      eventType: normalizedType,
      team,
      position,
      runNumber,
      gateNumber,
      penalty: penalty,
      judge: username,
      remarks,
      divisionId,
      raceId,
      createdAt: stamp.createdAt, // UTC untuk DB
      createdAtLocal: stamp.createdAtLocal, // opsional bila schema ada
      createdAtTz: stamp.createdAtTz,
    });

    /* ===================================
       STEP 4: PUSH KE BIDANG SESUAI EVENT TYPE
    ====================================*/
    const pushMap = {
      SPRINT: "reportSprint",
      SLALOM: "reportSlalom",
      H2H: "reportHeadToHead",
      DRR: "reportDrr",
    };
    const arrayField = pushMap[normalizedType] || "reportSprint";

    // pastikan field array ada
    if (!judgeReport[arrayField]) judgeReport[arrayField] = [];
    judgeReport[arrayField].push(detail._id);
    await judgeReport.save();

    return new Response(
      JSON.stringify({
        success: true,
        message,
        timeZone: tz,
        data: detail,
        judgeReportId: judgeReport._id,
        updatedTeam: {
          eventId: updatedTeam.eventId,
          teamId: team,
          documentId: updatedTeam._id,
        },
      }),
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ Error saving JudgeReportDetail:", err);
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
