import connectDB from '@/config/database'
import TeamsRegistered from '@/models/TeamsRegistered'
import User from '@/models/User'
import RaceSetting from '@/models/RaceSetting'
import { getSessionUser } from '@/utils/getSessionUser'

export const dynamic = 'force-dynamic'

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

    const requestBody = await req.json()
    console.log('🔍 [DRR DEBUG] Received payload:', requestBody)

    const { team, penalty, section, eventId, initialId, divisionId, raceId } =
      requestBody

    // ✅ VALIDASI
    if (
      !team ||
      penalty === null ||
      penalty === undefined ||
      !section ||
      !eventId ||
      !initialId ||
      !divisionId ||
      !raceId
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'Missing required fields: team, penalty, section, eventId, initialId, divisionId, raceId',
        }),
        { status: 400 }
      )
    }

    // ✅ **Ambil User Data**
    const user = await User.findById(sessionUser.userId)
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: 'User not found' }),
        { status: 404 }
      )
    }

    const username = user.username

    // ✅ **Ambil Race Setting untuk totalSections**
    const raceSetting = await RaceSetting.findOne({ eventId })
    const totalSections = raceSetting?.settings?.drr?.totalSection || 6

    console.log('🔍 [DRR DEBUG] Race setting search result:', {
      found: !!raceSetting,
      totalSections,
    })

    // ✅ **Cari team document**
    const teamDoc = await TeamsRegistered.findOne({
      eventId,
      eventName: 'DRR',
      'teams.teamId': team,
    })

    if (!teamDoc) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Team not found in TeamsRegistered collection',
        }),
        { status: 404 }
      )
    }

    // 🎯 **DEBUG 1: Lihat struktur lengkap document sebelum update**
    console.log(
      '🔍 [DEBUG 1] FULL DOCUMENT STRUCTURE:',
      JSON.stringify(
        {
          _id: teamDoc._id,
          eventId: teamDoc.eventId,
          eventName: teamDoc.eventName,
          teams: teamDoc.teams.map(t => ({
            teamId: t.teamId,
            nameTeam: t.nameTeam,
            result: t.result?.map(r => ({
              judgesBy: r.judgesBy,
              judgesTime: r.judgesTime,
              sectionPenalty: r.sectionPenalty,
              sectionPenaltyType: typeof r.sectionPenalty,
              isSectionPenaltyArray: Array.isArray(r.sectionPenalty),
              sectionPenaltyLength: Array.isArray(r.sectionPenalty)
                ? r.sectionPenalty.length
                : 'N/A',
              // Tampilkan semua field yang ada
              allFields: Object.keys(r),
            })),
          })),
        },
        null,
        2
      )
    )

    const sectionIndex = section - 1

    // ✅ **Debug structure sebelum update**
    const targetTeam = teamDoc.teams.find(t => t.teamId === team)
    console.log('🔍 [STRUCTURE DEBUG] Target team before update:', {
      teamId: targetTeam.teamId,
      teamName: targetTeam.nameTeam,
      hasResult: !!targetTeam.result,
      resultLength: targetTeam.result?.length || 0,
      currentSectionPenalty: targetTeam.result?.[0]?.sectionPenalty,
      sectionPenaltyType: typeof targetTeam.result?.[0]?.sectionPenalty,
      isSectionPenaltyArray: Array.isArray(
        targetTeam.result?.[0]?.sectionPenalty
      ),
    })

    // 🎯 **DEBUG 2: Cek Mongoose schema untuk field sectionPenalty**
    try {
      const schemaPath = TeamsRegistered.schema.path(
        'teams.0.result.0.sectionPenalty'
      )
      console.log('🔍 [DEBUG 2] SCHEMA INFO - sectionPenalty:', {
        exists: !!schemaPath,
        instance: schemaPath?.instance,
        isArray: schemaPath?.$isMongooseArray,
        options: schemaPath?.options,
      })
    } catch (schemaError) {
      console.log('🔍 [DEBUG 2] SCHEMA INFO - sectionPenalty path not found')
    }

    // ✅ **PREPARE UPDATE QUERY**
    let updateQuery = {
      $set: {
        [`teams.$.result.0.judgesBy`]: username,
        [`teams.$.result.0.judgesTime`]: new Date().toISOString(),
      },
    }

    const currentSectionPenalty = targetTeam.result?.[0]?.sectionPenalty

    // ✅ **LOGIC UNTUK SECTION PENALTY ARRAY**
    if (!currentSectionPenalty || !Array.isArray(currentSectionPenalty)) {
      // ❌ CASE 1: Belum ada array sectionPenalty - BUAT BARU
      const newSectionArray = Array(totalSections).fill(null)
      newSectionArray[sectionIndex] = penalty
      updateQuery.$set[`teams.$.result.0.sectionPenalty`] = newSectionArray
      console.log(
        `🔄 Creating NEW sectionPenalty array with ${totalSections} sections`
      )
      console.log('🔍 [ARRAY DEBUG] New array will be:', newSectionArray)
    } else if (currentSectionPenalty.length !== totalSections) {
      // ❌ CASE 2: Length tidak match - RESIZE ARRAY
      const resizedArray = Array(totalSections).fill(null)
      const copyLength = Math.min(currentSectionPenalty.length, totalSections)
      for (let i = 0; i < copyLength; i++) {
        resizedArray[i] = currentSectionPenalty[i]
      }
      resizedArray[sectionIndex] = penalty
      updateQuery.$set[`teams.$.result.0.sectionPenalty`] = resizedArray
      console.log(
        `🔄 Resizing sectionPenalty array from ${currentSectionPenalty.length} to ${totalSections} sections`
      )
    } else {
      // ✅ CASE 3: Array sudah benar - UPDATE SECTION TERTENTU
      updateQuery.$set[`teams.$.result.0.sectionPenalty.${sectionIndex}`] =
        penalty
      console.log(`✅ Updating only section ${section} (index ${sectionIndex})`)
    }

    console.log('🔍 [DRR DEBUG] Final update query:', updateQuery)

    // 🎯 **DEBUG 3: Coba update dengan approach berbeda jika perlu**
    console.log(
      '🔍 [DEBUG 3] Attempting update with query:',
      JSON.stringify(updateQuery, null, 2)
    )

    // ✅ **UPDATE DATABASE**
    const updateTeamsRegistered = await TeamsRegistered.findOneAndUpdate(
      {
        eventId,
        eventName: 'DRR',
        'teams.teamId': team,
      },
      updateQuery,
      {
        new: true,
        runValidators: true,
      }
    )

    if (!updateTeamsRegistered) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to update team penalty',
        }),
        { status: 500 }
      )
    }

    // ✅ **VERIFY UPDATE - Ambil data yang benar-benar terupdate**
    const updatedTeam = updateTeamsRegistered.teams.find(t => t.teamId === team)
    const updatedResult = updatedTeam?.result?.[0]

    console.log('🔍 [DRR DEBUG] VERIFIED result after update:', {
      judgesBy: updatedResult?.judgesBy,
      judgesTime: updatedResult?.judgesTime,
      sectionPenalty: updatedResult?.sectionPenalty,
      startPenalty: updatedResult?.startPenalty,
      finishPenalty: updatedResult?.finishPenalty,
    })

    // 🎯 **DEBUG 4: Query ulang untuk memastikan data tersimpan**
    const freshCheck = await TeamsRegistered.findOne({
      eventId,
      eventName: 'DRR',
      'teams.teamId': team,
    })
    const freshTeam = freshCheck?.teams?.find(t => t.teamId === team)
    const freshResult = freshTeam?.result?.[0]

    console.log('🔍 [DEBUG 4] FRESH QUERY - sectionPenalty:', {
      exists: !!freshResult?.sectionPenalty,
      value: freshResult?.sectionPenalty,
      type: typeof freshResult?.sectionPenalty,
      isArray: Array.isArray(freshResult?.sectionPenalty),
      length: freshResult?.sectionPenalty?.length,
    })

    // ✅ **DEBUG DETAIL: Lihat seluruh structure**
    console.log('🔍 [FULL DEBUG] Complete updated team structure:', {
      teamId: updatedTeam.teamId,
      teamName: updatedTeam.nameTeam,
      result: updatedResult,
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: `DRR penalty added successfully - Section ${section}: ${penalty} detik`,
        data: {
          eventId: updateTeamsRegistered.eventId,
          teamId: team,
          section: section,
          penaltyValue: penalty,
          totalSections: totalSections,
          sectionPenalty: updatedResult?.sectionPenalty,
          judgesBy: username,
          // 🎯 Tambahkan debug info di response
          debug: {
            freshSectionPenalty: freshResult?.sectionPenalty,
            isArray: Array.isArray(freshResult?.sectionPenalty),
            length: freshResult?.sectionPenalty?.length,
          },
        },
      }),
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ Error saving DRR report:', error)

    // 🎯 **DEBUG 5: Tangani error dengan detail**
    console.error('🔍 [DEBUG 5] ERROR DETAILS:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue,
    })

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
