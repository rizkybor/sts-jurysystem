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

    const {
      runNumber,
      team,
      penalty,
      gateNumber,
      eventId,
      initialId,
      divisionId,
      raceId,
    } = await req.json()

    // ✅ VALIDASI
    if (
      !runNumber ||
      !team ||
      penalty === null ||
      !gateNumber ||
      !eventId ||
      !initialId ||
      !divisionId ||
      !raceId
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'Missing required fields: runNumber, team, penalty, gateNumber, eventId, initialId, divisionId, raceId',
        }),
        { status: 400 }
      )
    }

    console.log('🔍 [DEBUG] Received payload:', {
      runNumber,
      team,
      penalty,
      gateNumber,
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

    // ✅ **2️⃣ Ambil Race Setting**
    const raceSetting = await RaceSetting.findOne({
      eventId: eventId,
    })

    console.log('🔍 [DEBUG] Race setting search result:', {
      found: !!raceSetting,
      raceSetting: raceSetting
        ? {
            _id: raceSetting._id,
            eventId: raceSetting.eventId,
            totalGates: raceSetting.settings?.slalom?.totalGate,
            fullSettings: raceSetting.settings,
          }
        : 'NOT FOUND',
    })

    // ✅ **3️⃣ Tentukan Total Gates**
    let totalGates = 14 // default fallback

    if (raceSetting && raceSetting.settings?.slalom?.totalGate) {
      totalGates = raceSetting.settings.slalom.totalGate
      console.log(`🎯 Total gates from setting: ${totalGates}`)
    } else {
      console.log(
        '⚠️ Race setting not found or missing totalGate, using default 14 gates'
      )
    }

    // ✅ Validasi gateNumber tidak melebihi total gates
    if (gateNumber > totalGates) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Gate number ${gateNumber} exceeds total gates (${totalGates})`,
        }),
        { status: 400 }
      )
    }

    // ✅ **4️⃣ Cari team document**
    const teamDoc = await TeamsRegistered.findOne({
      eventId,
      eventName: 'SLALOM',
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

    const runIndex = runNumber - 1
    const gateIndex = gateNumber - 1

    // ✅ **5️⃣ Check current gates data**
    const currentGates = teamDoc.teams[0]?.result[runIndex]?.penaltyTotal?.gates
    console.log('🔍 [DEBUG] Current gates before update:', currentGates)

    let updateQuery = {
      $set: {
        [`teams.$.result.${runIndex}.judgesBy`]: username,
        [`teams.$.result.${runIndex}.judgesTime`]: new Date().toISOString(),
      },
    }

    // ✅ **6️⃣ LOGIC UPDATE YANG BENAR:**
    if (!currentGates) {
      // ❌ CASE 1: Belum ada gates array sama sekali - BUAT BARU
      const newGatesArray = Array(totalGates).fill(0)
      newGatesArray[gateIndex] = penalty
      updateQuery.$set[`teams.$.result.${runIndex}.penaltyTotal.gates`] =
        newGatesArray
      console.log(`🔄 Creating NEW gates array with ${totalGates} gates`)
    } else if (currentGates.length !== totalGates) {
      // ❌ CASE 2: Length tidak match - RESIZE DENGAN RESET (karena structure berubah)
      const resizedGatesArray = Array(totalGates).fill(0)
      // Copy existing values yang masih within range
      const copyLength = Math.min(currentGates.length, totalGates)
      for (let i = 0; i < copyLength; i++) {
        resizedGatesArray[i] = currentGates[i]
      }
      resizedGatesArray[gateIndex] = penalty
      updateQuery.$set[`teams.$.result.${runIndex}.penaltyTotal.gates`] =
        resizedGatesArray
      console.log(
        `🔄 Resizing gates array from ${currentGates.length} to ${totalGates} gates`
      )
    } else {
      // ✅ CASE 3: Length sudah match - UPDATE HANYA GATE TERTENTU
      updateQuery.$set[
        `teams.$.result.${runIndex}.penaltyTotal.gates.${gateIndex}`
      ] = penalty
      console.log(`✅ Updating only gate ${gateNumber} (index ${gateIndex})`)
    }

    // ✅ **7️⃣ UPDATE TeamsRegistered**
    const updateTeamsRegistered = await TeamsRegistered.findOneAndUpdate(
      {
        eventId,
        eventName: 'SLALOM',
        'teams.teamId': team,
      },
      updateQuery,
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

    // ✅ **8️⃣ DEBUG: Cek hasil update**
    const updatedGates =
      updateTeamsRegistered.teams[0]?.result[runIndex]?.penaltyTotal?.gates
    console.log('🔍 [DEBUG] Gates after update:', updatedGates)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Slalom penalty added successfully - Run ${runNumber} Gate ${gateNumber}: ${penalty} detik`,
        teamsRegistered: {
          eventId: updateTeamsRegistered.eventId,
          teamId: team,
          updatedRun: runNumber,
          gateNumber: gateNumber,
          penaltyValue: penalty,
          totalGates: totalGates,
        },
      }),
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ Error saving slalom report:', error)
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
