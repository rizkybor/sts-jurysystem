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

    const { team, penalty, section, eventId, initialId, divisionId, raceId } =
      await req.json()

    // ✅ VALIDASI
    if (
      !team ||
      penalty === null ||
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

    console.log('🔍 [DRR DEBUG] Received payload:', {
      team,
      penalty,
      section,
      eventId,
      initialId,
      divisionId,
      raceId,
    })

    // ✅ **1️⃣ Ambil User Data**
    const user = await User.findById(sessionUser.userId)
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: 'User not found' }),
        { status: 404 }
      )
    }

    const username = user.username

    // ✅ **2️⃣ Ambil Race Setting untuk total sections**
    const raceSetting = await RaceSetting.findOne({
      eventId: eventId,
    })

    console.log('🔍 [DRR DEBUG] Race setting search result:', {
      found: !!raceSetting,
      totalSections: raceSetting?.settings?.drr?.totalSection,
    })

    // ✅ **3️⃣ Tentukan total sections**
    let totalSections = 6 // default fallback
    if (raceSetting && raceSetting.settings?.drr?.totalSection) {
      totalSections = raceSetting.settings.drr.totalSection
      console.log(`🎯 Total sections from setting: ${totalSections}`)
    } else {
      console.log('⚠️ Race setting not found, using default 6 sections')
    }

    // ✅ **4️⃣ Cari team document dan CONVERT KE PLAIN OBJECT**
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

    // ✅ CONVERT MONGOOSE DOCUMENT KE PLAIN OBJECT
    const teamDocPlain = teamDoc.toObject()
    const teamIndex = teamDocPlain.teams.findIndex(t => t.teamId === team)
    const resultData = teamDocPlain.teams[teamIndex]?.result
    const isResultArray = Array.isArray(resultData)
    const resultIndex = isResultArray ? 0 : null

    // ✅ **DEBUG STRUCTURE DARI PLAIN OBJECT**
    console.log(
      '🔍 [STRUCTURE DEBUG] Full team document (plain):',
      JSON.stringify(
        {
          _id: teamDocPlain._id,
          eventId: teamDocPlain.eventId,
          eventName: teamDocPlain.eventName,
          teams: teamDocPlain.teams.map(team => ({
            teamId: team.teamId,
            nameTeam: team.nameTeam,
            bibTeam: team.bibTeam,
            result: team.result,
            resultType: typeof team.result,
            resultIsArray: Array.isArray(team.result),
            resultLength: Array.isArray(team.result)
              ? team.result.length
              : 'N/A',
          })),
        },
        null,
        2
      )
    )

    const targetTeam = teamDocPlain.teams[teamIndex]
    console.log('🔍 [STRUCTURE DEBUG] Target team details (plain):', {
      teamId: targetTeam?.teamId,
      nameTeam: targetTeam?.nameTeam,
      hasResult: !!targetTeam?.result,
      resultType: typeof targetTeam?.result,
      resultIsArray: Array.isArray(targetTeam?.result),
    })

    // ✅ **DEBUG RESULT DETAILS DARI PLAIN OBJECT**
    if (targetTeam?.result) {
      if (Array.isArray(targetTeam.result)) {
        console.log('🔍 [STRUCTURE DEBUG] Result array details (plain):')
        targetTeam.result.forEach((resultItem, index) => {
          console.log(`  [${index}]:`, {
            type: typeof resultItem,
            keys: resultItem ? Object.keys(resultItem) : 'null/undefined',
            hasSectionPenalty: resultItem
              ? 'sectionPenalty' in resultItem
              : false,
            sectionPenaltyType: resultItem?.sectionPenalty
              ? typeof resultItem.sectionPenalty
              : 'none',
            sectionPenaltyIsArray: Array.isArray(resultItem?.sectionPenalty),
            sectionPenaltyValue: resultItem?.sectionPenalty,
            hasStartPenalty: resultItem ? 'startPenalty' in resultItem : false,
            startPenaltyValue: resultItem?.startPenalty,
            hasFinishPenalty: resultItem
              ? 'finishPenalty' in resultItem
              : false,
            finishPenaltyValue: resultItem?.finishPenalty,
          })
        })
      } else {
        console.log('🔍 [STRUCTURE DEBUG] Result object details (plain):', {
          keys: Object.keys(targetTeam.result),
          hasSectionPenalty: 'sectionPenalty' in targetTeam.result,
          sectionPenaltyType: typeof targetTeam.result.sectionPenalty,
          sectionPenaltyIsArray: Array.isArray(
            targetTeam.result.sectionPenalty
          ),
          sectionPenaltyValue: targetTeam.result.sectionPenalty,
          hasStartPenalty: 'startPenalty' in targetTeam.result,
          startPenaltyValue: targetTeam.result.startPenalty,
          hasFinishPenalty: 'finishPenalty' in targetTeam.result,
          finishPenaltyValue: targetTeam.result.finishPenalty,
        })
      }
    }

    console.log('🔍 [DRR DEBUG] Team document analysis:', {
      teamName: targetTeam?.nameTeam,
      isResultArray: isResultArray,
      resultType: isResultArray ? 'array' : 'object',
    })

    // ✅ **5️⃣ Tentukan section index dan field path**
    let sectionIndex
    let fieldPath

    if (typeof section === 'number') {
      sectionIndex = section - 1
      fieldPath = `sectionPenalty.${sectionIndex}`
    } else if (section === 'Start') {
      fieldPath = 'startPenalty'
    } else if (section === 'Finish') {
      fieldPath = 'finishPenalty'
    } else if (section.startsWith('Section ')) {
      sectionIndex = parseInt(section.replace('Section ', '')) - 1
      fieldPath = `sectionPenalty.${sectionIndex}`
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid section format',
        }),
        { status: 400 }
      )
    }

    console.log('🔍 [DRR DEBUG] Update details:', {
      originalSection: section,
      sectionIndex: sectionIndex,
      fieldPath: fieldPath,
      isResultArray: isResultArray,
      resultIndex: resultIndex,
    })

    // ✅ **6️⃣ CHECK CURRENT SECTION PENALTY DARI PLAIN OBJECT**
    if (fieldPath.startsWith('sectionPenalty.')) {
      const currentSectionPenalty = isResultArray
        ? targetTeam.result[resultIndex]?.sectionPenalty
        : targetTeam.result?.sectionPenalty

      console.log('🔍 [SECTION DEBUG] Current sectionPenalty (from plain):', {
        currentSectionPenalty,
        exists: !!currentSectionPenalty,
        isArray: Array.isArray(currentSectionPenalty),
        length: Array.isArray(currentSectionPenalty)
          ? currentSectionPenalty.length
          : 'N/A',
      })
    }

    // ✅ **7️⃣ BUILD UPDATE PATH BERDASARKAN STRUCTURE**
    let judgesByPath, judgesTimePath, penaltyPath

    if (isResultArray) {
      // ✅ JIKA RESULT ARRAY: teams.$.result.0.fieldName
      judgesByPath = `teams.$.result.${resultIndex}.judgesBy`
      judgesTimePath = `teams.$.result.${resultIndex}.judgesTime`
      penaltyPath = `teams.$.result.${resultIndex}.${fieldPath}`
    } else {
      // ✅ JIKA RESULT OBJECT: teams.$.result.fieldName
      judgesByPath = `teams.$.result.judgesBy`
      judgesTimePath = `teams.$.result.judgesTime`
      penaltyPath = `teams.$.result.${fieldPath}`
    }

    // ✅ **8️⃣ UPDATE TeamsRegistered - HANDLE KEDUA STRUCTURE**

    // Build update object
    const updateFields = {
      [judgesByPath]: username,
      [judgesTimePath]: new Date().toISOString(),
    }

    // Handle sectionPenalty array initialization jika needed
    if (fieldPath.startsWith('sectionPenalty.')) {
      const currentSectionPenalty = isResultArray
        ? targetTeam.result[resultIndex]?.sectionPenalty
        : targetTeam.result?.sectionPenalty

      console.log('🔍 [SECTION DEBUG] Current sectionPenalty (for update):', {
        currentSectionPenalty,
        exists: !!currentSectionPenalty,
        isArray: Array.isArray(currentSectionPenalty),
        length: Array.isArray(currentSectionPenalty)
          ? currentSectionPenalty.length
          : 'N/A',
      })

      if (!currentSectionPenalty || !Array.isArray(currentSectionPenalty)) {
        // Initialize sectionPenalty array
        const sectionPenaltyPath = isResultArray
          ? `teams.$.result.${resultIndex}.sectionPenalty`
          : `teams.$.result.sectionPenalty`

        console.log(
          `🔄 Initializing sectionPenalty array at path: ${sectionPenaltyPath}`
        )

        await TeamsRegistered.findOneAndUpdate(
          {
            eventId,
            eventName: 'DRR',
            'teams.teamId': team,
          },
          {
            $set: {
              [sectionPenaltyPath]: Array(totalSections).fill(null),
            },
          }
        )
        console.log(
          `✅ Initialized sectionPenalty array with ${totalSections} sections`
        )
      }
    }

    // Add penalty to update
    updateFields[penaltyPath] = penalty

    console.log('🔍 [DRR DEBUG] Final update fields:', updateFields)

    const updateTeamsRegistered = await TeamsRegistered.findOneAndUpdate(
      {
        eventId,
        eventName: 'DRR',
        'teams.teamId': team,
      },
      {
        $set: updateFields,
      },
      { new: true }
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

    // ✅ **9️⃣ DEBUG: Verifikasi update**
    const verifyDoc = await TeamsRegistered.findOne({
      eventId,
      eventName: 'DRR',
      'teams.teamId': team,
    })

    const verifiedTeamIndex = verifyDoc.teams.findIndex(t => t.teamId === team)
    const verifiedResult = verifyDoc.teams[verifiedTeamIndex]?.result

    console.log('🔍 [DRR DEBUG] VERIFIED result after update:', {
      judgesBy: isResultArray
        ? verifiedResult?.[0]?.judgesBy
        : verifiedResult?.judgesBy,
      judgesTime: isResultArray
        ? verifiedResult?.[0]?.judgesTime
        : verifiedResult?.judgesTime,
      sectionPenalty: isResultArray
        ? verifiedResult?.[0]?.sectionPenalty
        : verifiedResult?.sectionPenalty,
      startPenalty: isResultArray
        ? verifiedResult?.[0]?.startPenalty
        : verifiedResult?.startPenalty,
      finishPenalty: isResultArray
        ? verifiedResult?.[0]?.finishPenalty
        : verifiedResult?.finishPenalty,
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: `DRR penalty added successfully - ${section}: ${penalty} points`,
        teamsRegistered: {
          eventId: updateTeamsRegistered.eventId,
          teamId: team,
          section: section,
          penaltyValue: penalty,
          totalSections: totalSections,
        },
      }),
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ Error saving DRR report:', error)
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

// ✅ GET endpoint untuk ambil data DRR results
export const GET = async req => {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Event ID is required' }),
        { status: 400 }
      )
    }

    const teams = await TeamsRegistered.find({
      eventId,
      eventName: 'DRR',
    })

    const results = teams.flatMap(teamDoc =>
      teamDoc.teams.map(team => ({
        teamId: team.teamId,
        teamName: team.nameTeam,
        bibNumber: team.bibTeam,
        result: team.result,
      }))
    )

    return new Response(
      JSON.stringify({
        success: true,
        data: results,
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Error fetching DRR results:', error)
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
