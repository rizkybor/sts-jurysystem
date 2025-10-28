import connectDB from '@/config/database'
import JudgeReportDetail from '@/models/JudgeReportDetail'
import TeamsRegistered from '@/models/TeamsRegistered'
import User from '@/models/User'
import RaceSetting from '@/models/RaceSetting'
import { getSessionUser } from '@/utils/getSessionUser'

export const dynamic = 'force-dynamic'

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
    await connectDB()

    const { searchParams } = new URL(req.url)

    // 🔎 Filters dasar
    const eventId = searchParams.get('eventId') || undefined
    const eventType = searchParams.get('eventType') || undefined // SPRINT | SLALOM | H2H | DRR
    const team = searchParams.get('team') || undefined

    // 👤 Filters judge
    const judge = searchParams.get('judge') || undefined            // exact username
    const judgesParam = searchParams.get('judges') || undefined      // "alice,bob"
    const judgeLike = searchParams.get('judgeLike') || undefined     // partial (regex)
    const mine = searchParams.get('mine') === 'true'                 // use session user

    // 🗓️ Rentang tanggal (createdAt)
    const createdFrom = searchParams.get('createdFrom') || undefined // ISO e.g. 2025-10-01T00:00:00.000Z
    const createdTo = searchParams.get('createdTo') || undefined

    // 📄 Pagination & sorting
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200)
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = (searchParams.get('sort') || 'desc').toLowerCase() === 'asc' ? 1 : -1
    const skip = (page - 1) * limit

    // 🧱 Bangun filter query
    const filter = {}
    if (eventId) filter.eventId = eventId
    if (eventType) filter.eventType = eventType.toUpperCase()
    if (team) filter.team = team

    // 👤 Resolve "mine" → username dari session
    let mineUsername
    if (mine) {
      const sessionUser = await getSessionUser()
      if (!sessionUser?.userId) {
        return new Response(JSON.stringify({ success: false, message: 'Not authenticated' }), { status: 401 })
      }
      const user = await User.findById(sessionUser.userId).lean()
      mineUsername = user?.username
      if (!mineUsername) {
        return new Response(JSON.stringify({ success: false, message: 'User not found' }), { status: 404 })
      }
      filter.judge = mineUsername
    }

    // 🎯 Filter judge lain (hanya dipakai jika bukan "mine")
    if (!mine) {
      if (judge) {
        filter.judge = judge
      } else if (judgesParam) {
        const arr = judgesParam.split(',').map(s => s.trim()).filter(Boolean)
        if (arr.length > 0) filter.judge = { $in: arr }
      } else if (judgeLike) {
        filter.judge = { $regex: judgeLike, $options: 'i' }
      }
    }

    // 🗓️ Filter tanggal
    if (createdFrom || createdTo) {
      filter.createdAt = {}
      if (createdFrom) filter.createdAt.$gte = new Date(createdFrom)
      if (createdTo) filter.createdAt.$lte = new Date(createdTo)
    }

    // 📊 Query + pagination
    const [items, total] = await Promise.all([
      JudgeReportDetail.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      JudgeReportDetail.countDocuments(filter),
    ])

    if (!items.length) {
      return new Response(
        JSON.stringify({
          success: true,
          meta: { page, limit, total, totalPages: 0, sortBy, sort: sortOrder === 1 ? 'asc' : 'desc' },
          data: [],
          message: 'No report details found for the given filter',
        }),
        { status: 200 }
      )
    }

    // 🧩 Enrich info tim dari TeamsRegistered (opsional)
    const enriched = await Promise.all(
      items.map(async (d) => {
        try {
          const teamDoc = await TeamsRegistered.findOne(
            { eventId: d.eventId, 'teams.teamId': d.team },
            { 'teams.$': 1 }
          ).lean()
          const t = teamDoc?.teams?.[0]
          return {
            ...d,
            teamInfo: t
              ? { nameTeam: t.nameTeam, bibTeam: t.bibTeam, division: t.divisionName || 'N/A' }
              : { nameTeam: 'Unknown Team', bibTeam: 'N/A' },
          }
        } catch {
          return { ...d, teamInfo: { nameTeam: 'Error loading team', bibTeam: 'N/A' } }
        }
      })
    )

    return new Response(
      JSON.stringify({
        success: true,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          sortBy,
          sort: sortOrder === 1 ? 'asc' : 'desc',
          appliedJudge: mine ? mineUsername : (judge || judgesParam || judgeLike || null),
        },
        data: enriched,
      }),
      { status: 200 }
    )
  } catch (err) {
    console.error('❌ Error fetching JudgeReportDetail:', err)
    return new Response(
      JSON.stringify({ success: false, message: 'Internal Server Error', error: err.message }),
      { status: 500 }
    )
  }
}

/* ============================================================
 🔵 POST — Simpan Data Dinamis (SPRINT, SLALOM, H2H, DRR)
   - SPRINT: position=Start/Finish → result.startPenalty / finishPenalty
   - SLALOM: operationType=start|finish|gate (+ runNumber, gateNumber)
============================================================ */
export const POST = async (req) => {
  try {
    await connectDB()

    const sessionUser = await getSessionUser()
    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ success: false, message: 'User not authenticated' }),
        { status: 401 }
      )
    }

    const body = await req.json()
    const {
      eventType,   // 'SPRINT' | 'SLALOM' | 'H2H' | 'DRR'
      eventId,
      team,        // teamId
      position,    // 'Start' | 'Finish'  (SPRINT)
      penalty,     // number
      gateNumber,  // SLALOM only
      runNumber,   // SLALOM only (1-based)
      raceId,
      divisionId,
      operationType, // SLALOM: 'start' | 'finish' | 'gate'
      remarks,
    } = body

    if (!eventType || !eventId || !team) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing core fields: eventType, eventId, team' }),
        { status: 400 }
      )
    }

    // Pastikan penalty numeric
    const numericPenalty = penalty === undefined || penalty === null ? null : Number(penalty)
    if (numericPenalty === null || Number.isNaN(numericPenalty)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid penalty: must be a number' }),
        { status: 400 }
      )
    }

    // Ambil username judge
    const user = await User.findById(sessionUser.userId)
    if (!user) throw new Error('User not found')
    const username = user.username

    let message = ''
    let updateQuery = { $set: {} }

    /* =========================
       STEP 0: VALIDASI KHUSUS
    ==========================*/
    if (eventType === 'SPRINT') {
      if (!position || (position !== 'Start' && position !== 'Finish')) {
        return new Response(
          JSON.stringify({ success: false, message: 'SPRINT requires position: "Start" or "Finish"' }),
          { status: 400 }
        )
      }

      // Guard: jangan dobel Start/Finish untuk tim yang sama (sesuai versi lama)
      const existing = await JudgeReportDetail.find({ eventId, eventType: 'SPRINT', team }).lean()
      const hasStart = existing.some(r => r.position === 'Start')
      const hasFinish = existing.some(r => r.position === 'Finish')

      if (hasStart && hasFinish) {
        return new Response(
          JSON.stringify({ success: false, message: `Team ${team} sudah memiliki Start dan Finish. Tidak bisa submit lagi.` }),
          { status: 400 }
        )
      }
      if ((position === 'Start' && hasStart) || (position === 'Finish' && hasFinish)) {
        return new Response(
          JSON.stringify({ success: false, message: `Team ${team} sudah memiliki posisi ${position}. Pilih posisi yang belum ada.` }),
          { status: 400 }
        )
      }
    }

    if (eventType === 'SLALOM') {
      const runIdx = (runNumber || 1) - 1
      if (runIdx < 0) {
        return new Response(
          JSON.stringify({ success: false, message: 'runNumber must be >= 1 for SLALOM' }),
          { status: 400 }
        )
      }
      // Validasi tim exist untuk SLALOM
      const teamDoc = await TeamsRegistered.findOne({
        eventId,
        eventName: 'SLALOM',
        'teams.teamId': team,
      })
      if (!teamDoc) {
        return new Response(
          JSON.stringify({ success: false, message: 'Team not found in TeamsRegistered for SLALOM' }),
          { status: 404 }
        )
      }
      // Cek setting gate
      const raceSetting = await RaceSetting.findOne({ eventId })
      const totalGates = raceSetting?.settings?.slalom?.totalGate || 14

      if (operationType === 'gate') {
        const gateIdx = Number(gateNumber) - 1
        if (!gateNumber || gateIdx < 0 || gateIdx >= totalGates) {
          return new Response(
            JSON.stringify({
              success: false,
              message: `Invalid gateNumber. Must be between 1 and ${totalGates}`,
            }),
            { status: 400 }
          )
        }
      }
    }

    /* ===================================
       STEP 1: UPDATE TeamsRegistered
    ====================================*/
    if (eventType === 'SPRINT') {
      const penaltyField = position === 'Start' ? 'result.startPenalty' : 'result.finishPenalty'
      updateQuery.$set[`teams.$.${penaltyField}`] = numericPenalty.toString()
      updateQuery.$set['teams.$.result.judgesBy'] = username
      updateQuery.$set['teams.$.result.judgesTime'] = new Date().toISOString()
      message = `Sprint ${position} penalty recorded - ${numericPenalty}s`
    }

    if (eventType === 'SLALOM') {
      const runIdx = (runNumber || 1) - 1
      if (operationType === 'start') {
        updateQuery.$set[`teams.$.result.${runIdx}.startPenalty`] = numericPenalty
        message = `Slalom start penalty recorded - Run ${runIdx + 1}: ${numericPenalty}s`
      } else if (operationType === 'finish') {
        updateQuery.$set[`teams.$.result.${runIdx}.finishPenalty`] = numericPenalty
        message = `Slalom finish penalty recorded - Run ${runIdx + 1}: ${numericPenalty}s`
      } else if (operationType === 'gate') {
        const gateIdx = Number(gateNumber) - 1
        updateQuery.$set[`teams.$.result.${runIdx}.penaltyTotal.gates.${gateIdx}`] = numericPenalty
        updateQuery.$inc = { [`teams.$.result.${runIdx}.penaltyTotal.total`]: numericPenalty }
        message = `Slalom gate penalty recorded - Run ${runIdx + 1} Gate ${gateIdx + 1}: ${numericPenalty}s`
      } else {
        return new Response(
          JSON.stringify({ success: false, message: 'SLALOM requires operationType: start | finish | gate' }),
          { status: 400 }
        )
      }
    }

    const updatedTeam = await TeamsRegistered.findOneAndUpdate(
      { eventId, eventName: eventType, 'teams.teamId': team },
      updateQuery,
      { new: true }
    )
    if (!updatedTeam) {
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to update team data (TeamsRegistered not found)' }),
        { status: 404 }
      )
    }

    /* ===================================
       STEP 2: UPSERT JudgeReport (Wajib duluan)
    ====================================*/
    // Cari report juri untuk event ini
    let judgeReport = await JudgeReport.findOne({
      eventId,
      juryId: sessionUser.userId,
    })

    // Jika tidak ada → buat baru
    if (!judgeReport) {
      judgeReport = await JudgeReport.create({
        eventId,
        juryId: sessionUser.userId,
        createdBy: username,
        reportSprint: [],
        reportHeadToHead: [],
        reportSlalom: [],
        reportDrr: [],
        createdAt: new Date().toISOString(),
      })
    }

    /* ===================================
       STEP 3: CREATE JudgeReportDetail
    ====================================*/
    const detail = await JudgeReportDetail.create({
      eventId,
      eventType: eventType.toUpperCase(),
      team,
      position,      // Sprint (Start/Finish), opsional Slalom
      runNumber,     // Slalom
      gateNumber,    // Slalom
      penalty: numericPenalty,
      judge: username,
      remarks,
      divisionId,
      raceId,
      createdAt: new Date(),
    })

    if (!detail) {
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to create JudgeReportDetail' }),
        { status: 500 }
      )
    }

    /* ===================================
       STEP 4: PUSH reference ke JudgeReport
    ====================================*/
    const pushMap = {
      'SPRINT': 'reportSprint',
      'SLALOM': 'reportSlalom',
      'H2H': 'reportHeadToHead',
      'DRR': 'reportDrr',
    }
    const arrayField = pushMap[eventType.toUpperCase()] || 'reportSprint'

    judgeReport[arrayField].push(detail._id)
    await judgeReport.save()

    return new Response(
      JSON.stringify({
        success: true,
        message,
        data: detail,
        judgeReportId: judgeReport._id,
        updatedTeam: {
          eventId: updatedTeam.eventId,
          teamId: team,
          documentId: updatedTeam._id,
        },
      }),
      { status: 201 }
    )
  } catch (err) {
    console.error('❌ Error saving JudgeReportDetail (dynamic):', err)
    return new Response(
      JSON.stringify({ success: false, message: 'Internal Server Error', error: err.message }),
      { status: 500 }
    )
  }
}

// parameter GET :
// GET /api/judge-report/detail
//   ?eventType=SPRINT
//   &createdFrom=2025-10-01T00:00:00.000Z
//   &createdTo=2025-10-28T23:59:59.999Z
//   &page=2&limit=20&sortBy=createdAt&sort=desc

// payload POST :
// {
//   "eventType": "SPRINT",
//   "eventId": "E-2025-01",
//   "team": "TEAM-07",
//   "position": "Start",
//   "penalty": 2.5,
//   "raceId": "R-01",
//   "divisionId": "DIV-A",
//   "remarks": "jump start light"
// }
// {
//   "eventType": "SPRINT",
//   "eventId": "E-2025-01",
//   "team": "TEAM-07",
//   "position": "Finish",
//   "penalty": 1,
//   "raceId": "R-01",
//   "divisionId": "DIV-A"
// }
// {
//   "eventType": "SLALOM",
//   "eventId": "E-2025-02",
//   "team": "TEAM-21",
//   "operationType": "start",
//   "runNumber": 1,
//   "penalty": 2
// }
// {
//   "eventType": "SLALOM",
//   "eventId": "E-2025-02",
//   "team": "TEAM-21",
//   "operationType": "finish",
//   "runNumber": 2,
//   "penalty": 3
// }
// {
//   "eventType": "SLALOM",
//   "eventId": "E-2025-02",
//   "team": "TEAM-21",
//   "operationType": "gate",
//   "runNumber": 1,
//   "gateNumber": 5,
//   "penalty": 50,
//   "remarks": "touch"
// }