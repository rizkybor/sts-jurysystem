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

    const {
      team,
      penalty,
      section,
      eventId,
      initialId,
      divisionId,
      raceId,
      operationType, // ✅ start | finish | section
    } = requestBody

    // ✅ VALIDASI DASAR
    if (
      !team ||
      penalty == null ||
      !eventId ||
      !initialId ||
      !divisionId ||
      !raceId
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'Missing required fields: team, penalty, eventId, initialId, divisionId, raceId',
        }),
        { status: 400 }
      )
    }

    const user = await User.findById(sessionUser.userId)
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: 'User not found' }),
        { status: 404 }
      )
    }

    const username = user.username

    // ✅ Ambil totalSections dari RaceSetting
    const raceSetting = await RaceSetting.findOne({ eventId })
    const totalSections = raceSetting?.settings?.drr?.totalSection || 6

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

    const targetTeam = teamDoc.teams.find(t => t.teamId === team)
    if (!targetTeam?.result?.[0]) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Team result not found or not initialized',
        }),
        { status: 404 }
      )
    }

    const sectionIndex = section ? section - 1 : null
    const currentSectionPenalty = targetTeam.result[0].sectionPenalty

    // ✅ Siapkan query dasar
    const updateQuery = {
      $set: {
        'teams.$.result.0.judgesBy': username,
        'teams.$.result.0.judgesTime': new Date().toISOString(),
      },
    }

    // ✅ Handle sesuai operationType
    switch (operationType) {
      case 'start':
        updateQuery.$set['teams.$.result.0.startPenalty'] = penalty
        updateQuery.$set['teams.$.result.0.startTime'] =
          new Date().toISOString()
        break

      case 'finish':
        updateQuery.$set['teams.$.result.0.finishPenalty'] = penalty
        updateQuery.$set['teams.$.result.0.finishTime'] =
          new Date().toISOString()
        break

      case 'section':
        if (sectionIndex === null || sectionIndex < 0) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Section number is required for operationType=section',
            }),
            { status: 400 }
          )
        }

        if (!Array.isArray(currentSectionPenalty)) {
          const newSectionArray = Array(totalSections).fill(null)
          newSectionArray[sectionIndex] = penalty
          updateQuery.$set['teams.$.result.0.sectionPenalty'] = newSectionArray
        } else {
          const resized = [...currentSectionPenalty]
          resized[sectionIndex] = penalty
          updateQuery.$set[`teams.$.result.0.sectionPenalty`] = resized
        }
        break

      default:
        return new Response(
          JSON.stringify({
            success: false,
            message: `Invalid operationType: ${operationType}`,
          }),
          { status: 400 }
        )
    }

    console.log('🔧 [DRR DEBUG] Final updateQuery:', updateQuery)

    const updatedDoc = await TeamsRegistered.findOneAndUpdate(
      { eventId, eventName: 'DRR', 'teams.teamId': team },
      updateQuery,
      { new: true, runValidators: true }
    )

    if (!updatedDoc) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to update team data',
        }),
        { status: 500 }
      )
    }

    const updatedTeam = updatedDoc.teams.find(t => t.teamId === team)
    const updatedResult = updatedTeam.result[0]

    // ✅ Response siap dikirim ke frontend realtime
    return new Response(
      JSON.stringify({
        success: true,
        message: `DRR ${operationType.toUpperCase()} updated successfully`,
        data: {
          eventId,
          teamId: team,
          teamName: updatedTeam.nameTeam,
          operationType,
          section,
          penalty,
          judgesBy: username,
          judgesTime: updatedResult.judgesTime,
          startPenalty: updatedResult.startPenalty,
          finishPenalty: updatedResult.finishPenalty,
          sectionPenalty: updatedResult.sectionPenalty,
        },
      }),
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ [DRR ERROR]', error)
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
