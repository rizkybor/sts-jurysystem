import connectDB from '@/config/database'
import JudgeReport from '@/models/JudgeReport'
import JudgeReportSprintDetail from '@/models/JudgeReportSprintDetail'
import TeamsRegistered from '@/models/TeamsRegistered'
import User from '@/models/User'
import { getSessionUser } from '@/utils/getSessionUser'

export const dynamic = 'force-dynamic'

// ✅ **GET: Ambil Sprint Reports**
export const GET = async () => {
  try {
    await connectDB()

    // Ambil semua data sprint
    const sprintResults = await JudgeReportSprintDetail.find().sort({
      createdAt: -1,
    })

    return new Response(
      JSON.stringify({ success: true, data: sprintResults }),
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Error fetching sprint results:', error)
    return new Response(
      JSON.stringify({ success: false, message: 'Internal Server Error' }),
      { status: 500 }
    )
  }
}

// ✅ **POST: Tambah Sprint Report & Update TeamsRegistered**
export const POST = async req => {
  try {
    await connectDB()

    const sessionUser = await getSessionUser()

    if (!sessionUser || !sessionUser.userId) {
      return new Response(
        JSON.stringify({ success: false, message: 'User ID is required' }),
        { status: 401 }
      )
    }

    const { position, team, penalty, eventId, initialId, divisionId, raceId } =
      await req.json()

    // ✅ VALIDASI LENGKAP
    if (!position || !team || penalty === null || !eventId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required fields: position, team, penalty, eventId',
        }),
        { status: 400 }
      )
    }

    // ✅ **1️⃣ Ambil User Data untuk mendapatkan username**
    const user = await User.findById(sessionUser.userId)
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: 'User not found' }),
        { status: 404 }
      )
    }

    const username = user.username

    // ✅ **2️⃣ UPDATE TeamsRegistered: Cari teamId di SEMUA document event ini**
    const penaltyField =
      position === 'Start' ? 'result.startPenalty' : 'result.finishPenalty'

    // ✅ DEBUG: Log pencarian
    console.log('🔍 Searching for team:', {
      eventId,
      team,
      position,
      penaltyField,
    })

    const updateTeamsRegistered = await TeamsRegistered.findOneAndUpdate(
      {
        eventId,
        eventName: 'SPRINT',
        'teams.teamId': team, // ✅ CARI DI SEMUA KATEGORI EVENT INI
      },
      {
        $set: {
          [`teams.$.${penaltyField}`]: penalty.toString(),
          'teams.$.result.judgesBy': username,
          'teams.$.result.judgesTime': new Date().toISOString(),
        },
      },
      { new: true }
    )

    if (!updateTeamsRegistered) {
      // ✅ DEBUG DETAILED ERROR
      console.log('❌ Team not found. Checking available teams...')
      const availableDocs = await TeamsRegistered.find({
        eventId,
        eventName: 'SPRINT',
      })
      console.log('🔍 Available documents:', availableDocs.length)

      if (availableDocs.length > 0) {
        const allTeams = availableDocs.flatMap(doc => doc.teams)
        console.log(
          '🔍 All teams in event:',
          allTeams.map(t => ({
            teamId: t.teamId,
            nameTeam: t.nameTeam,
          }))
        )
      }

      return new Response(
        JSON.stringify({
          success: false,
          message: `Team ${team} not found in TeamsRegistered collection for event ${eventId}`,
        }),
        { status: 404 }
      )
    }

    // ✅ **3️⃣ Periksa apakah ada JudgeReport yang sesuai dengan eventId & sessionUser.userId**
    let judgeReport = await JudgeReport.findOne({
      eventId,
      juryId: sessionUser.userId,
    })

    // ✅ **4️⃣ Jika tidak ada, buat JudgeReport baru dengan username**
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

    // ✅ **5️⃣ Cek apakah tim sudah memiliki posisi Start atau Finish**
    const existingReports = await JudgeReportSprintDetail.find({ team })

    const hasStart = existingReports.some(report => report.position === 'Start')
    const hasFinish = existingReports.some(
      report => report.position === 'Finish'
    )

    // ✅ **6️⃣ Blokir jika tim sudah memiliki keduanya**
    if (hasStart && hasFinish) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Team ${team} sudah memiliki Start dan Finish. Tidak bisa submit lagi.`,
        }),
        { status: 400 }
      )
    }

    // ✅ **7️⃣ Pastikan tim hanya bisa submit posisi yang belum ada**
    if (
      (position === 'Start' && hasStart) ||
      (position === 'Finish' && hasFinish)
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Team ${team} sudah memiliki posisi ${position}. Pilih posisi yang belum ada.`,
        }),
        { status: 400 }
      )
    }

    // ✅ **8️⃣ Simpan ke judgeReportSprintDetails (LOG HISTORY)**
    const sprintDetail = await JudgeReportSprintDetail.create({
      position,
      team,
      penalty,
      judge: username,
      eventId,
      createdAt: new Date().toISOString(),
    })

    if (!sprintDetail) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to create sprint detail',
        }),
        { status: 500 }
      )
    }

    // ✅ **9️⃣ Tambahkan sprintDetail ke reportSprint di JudgeReport**
    judgeReport.reportSprint.push(sprintDetail._id)
    await judgeReport.save()

    // ✅ DEBUG SUCCESS
    console.log('✅ Sprint report created successfully:', {
      team,
      position,
      penalty,
      document: updateTeamsRegistered._id,
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sprint report added successfully - ${position} Penalty: ${penalty}`,
        sprintDetail,
        judgeReport,
        teamsRegistered: {
          eventId: updateTeamsRegistered.eventId,
          teamId: team,
          updatedField: penaltyField,
          updatedValue: penalty.toString(),
          documentId: updateTeamsRegistered._id,
        },
      }),
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ Error saving sprint report:', error)
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal Server Error',
        error: error.message,
      }),
      { status: 500 }
    )
  }
}
