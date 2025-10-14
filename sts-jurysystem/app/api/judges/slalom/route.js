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

    // ✅ Parse request body
    const requestBody = await req.json()
    console.log('🔍 [DEBUG] Request body:', requestBody)

    const {
      runNumber,
      team,
      penalty,
      gateNumber, // ✅ Bisa ada (GATES) atau tidak (START/FINISH)
      eventId,
      initialId,
      divisionId,
      raceId,
      operationType, // ✅ Opsional: 'start', 'gate', 'finish'
    } = requestBody

    // ✅ VALIDASI DASAR
    if (
      !runNumber ||
      !team ||
      penalty === null ||
      penalty === undefined ||
      !eventId ||
      !initialId ||
      !divisionId ||
      !raceId
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'Missing required fields: runNumber, team, penalty, eventId, initialId, divisionId, raceId',
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
      operationType,
    })

    // ✅ **1️⃣ Tentukan Jenis Operasi**
    let operation = ''
    if (gateNumber === undefined || gateNumber === null || gateNumber === '') {
      // START atau FINISH
      operation = operationType === 'finish' ? 'FINISH' : 'START'
    } else {
      // GATES
      operation = 'GATES'
    }

    console.log(`🎯 Detected operation: ${operation}`)

    // ✅ **2️⃣ Ambil User Data**
    const user = await User.findById(sessionUser.userId)
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: 'User not found' }),
        { status: 404 }
      )
    }

    const username = user.username

    // ✅ **3️⃣ Cari team document**
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

    // ✅ **4️⃣ LOGIC BERDASARKAN OPERASI**
    let updateQuery = { $set: {} }
    let message = ''

    if (operation === 'START') {
      // 🚀 START OPERATION
      updateQuery.$set[`teams.$.result.${runIndex}.startPenalty`] = penalty
      message = `Start penalty recorded - Run ${runNumber}: ${penalty} seconds`
    } else if (operation === 'FINISH') {
      // 🏁 FINISH OPERATION
      updateQuery.$set[`teams.$.result.${runIndex}.finishPenalty`] = penalty
      message = `Finish penalty recorded - Run ${runNumber}: ${penalty} seconds`
    } else if (operation === 'GATES') {
      // 🎯 GATES OPERATION
      const numericGateNumber = Number(gateNumber)
      const gateIndex = numericGateNumber - 1

      // ✅ Ambil Race Setting untuk totalGates
      const raceSetting = await RaceSetting.findOne({ eventId })
      const totalGates = raceSetting?.settings?.slalom?.totalGate || 14

      // ✅ Validasi gateNumber
      if (numericGateNumber < 1 || numericGateNumber > totalGates) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Gate number ${numericGateNumber} is invalid. Must be between 1 and ${totalGates}`,
          }),
          { status: 400 }
        )
      }

      // ✅ Check current gates data
      const currentGates =
        teamDoc.teams[0]?.result[runIndex]?.penaltyTotal?.gates
      console.log('🔍 [DEBUG] Current gates before update:', currentGates)

      // ✅ Logic update gates
      if (!currentGates) {
        // CASE 1: Belum ada gates array - BUAT BARU
        const newGatesArray = Array(totalGates).fill(0)
        newGatesArray[gateIndex] = penalty
        updateQuery.$set[`teams.$.result.${runIndex}.penaltyTotal.gates`] =
          newGatesArray
        console.log(`🔄 Creating NEW gates array with ${totalGates} gates`)
      } else if (currentGates.length !== totalGates) {
        // CASE 2: Length tidak match - RESIZE
        const resizedGatesArray = Array(totalGates).fill(0)
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
        // CASE 3: Length sudah match - UPDATE GATE TERTENTU
        updateQuery.$set[
          `teams.$.result.${runIndex}.penaltyTotal.gates.${gateIndex}`
        ] = penalty
        console.log(`✅ Updating only gate ${gateNumber} (index ${gateIndex})`)
      }

      // ✅ Update total penalty (increment)
      updateQuery.$inc = {
        [`teams.$.result.${runIndex}.penaltyTotal.total`]: penalty,
      }

      message = `Gate penalty added - Run ${runNumber} Gate ${gateNumber}: ${penalty} seconds`
    }

    console.log('🔍 [DEBUG] Final update query:', updateQuery)

    // ✅ **5️⃣ UPDATE TeamsRegistered**
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
          message: 'Failed to update team data',
        }),
        { status: 500 }
      )
    }

    // ✅ **6️⃣ DEBUG: Cek hasil update**
    const updatedData = updateTeamsRegistered.teams[0]?.result[runIndex]
    console.log('🔍 [DEBUG] Data after update:', updatedData)

    return new Response(
      JSON.stringify({
        success: true,
        message: message,
        data: {
          eventId: updateTeamsRegistered.eventId,
          teamId: team,
          updatedRun: runNumber,
          operation: operation,
          penalty: penalty,
          gateNumber: operation === 'GATES' ? gateNumber : undefined,
        },
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Error in slalom API:', error)
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
