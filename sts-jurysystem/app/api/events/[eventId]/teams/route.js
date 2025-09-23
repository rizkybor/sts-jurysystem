// app/api/events/[eventId]/teams/route.js
import connectDB from '@/config/database'
import TeamsRegistered from '@/models/TeamsRegistered'
import { ObjectId } from 'mongodb'

// ✅ GET - Ambil semua teams termasuk metadata
export async function GET(req, { params }) {
  try {
    await connectDB()
    const { eventId } = await params

    console.log('🔍 [GET] Fetching event data for:', eventId)

    // ✅ AMBIL SEMUA DATA EVENT, BUKAN HANYA TEAMS
    const eventData = await TeamsRegistered.findOne({ eventId })
    if (!eventData) {
      return Response.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      )
    }

    console.log('📊 [GET] Event metadata found:', {
      initialId: eventData.initialId,
      raceId: eventData.raceId,
      divisionId: eventData.divisionId,
      eventName: eventData.eventName,
    })

    // ✅ FORMAT TEAMS DAN INCLUDE METADATA
    const formattedTeams = eventData.teams.map(team => ({
      _id: team.teamId?.toString() || team._id.toString(),
      nameTeam: team.nameTeam,
      bibTeam: team.bibTeam,
      result: {
        penalty: team.result?.penaltyTime || 0,
        score: team.result?.score || 0,
      },
      teamId: team.teamId?.toString(),
    }))

    // ✅ KEMBALIKAN JUGA METADATA EVENT
    return Response.json(
      {
        success: true,
        teams: formattedTeams,
        eventMetadata: {
          initialId: eventData.initialId,
          raceId: eventData.raceId,
          divisionId: eventData.divisionId,
          eventName: eventData.eventName,
          initialName: eventData.initialName,
          raceName: eventData.raceName,
          divisionName: eventData.divisionName,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Error fetching teams:', error)
    return Response.json(
      { success: false, message: 'Error fetching teams' },
      { status: 500 }
    )
  }
}

// app/api/events/[eventId]/teams/route.js - PATCH function
export async function PATCH(req, { params }) {
  try {
    await connectDB()
    const { eventId } = await params
    const {
      teamId,
      penalty,
      initialId,
      raceId,
      divisionId,
      position,
      updateBy,
    } = await req.json()

    console.log('🔍 [PATCH] Received request:', {
      eventId,
      teamId,
      penalty,
      initialId,
      raceId,
      divisionId,
      position,
      updateBy, // ✅ Terima updateBy dari frontend
    })

    // Validasi input wajib
    if (!teamId || penalty === undefined || penalty === null) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required fields: teamId and penalty',
        }),
        { status: 400 }
      )
    }

    // Buat query yang spesifik dengan metadata
    let query = { eventId }
    if (initialId) query.initialId = initialId
    if (raceId) query.raceId = raceId
    if (divisionId) query.divisionId = divisionId

    // Cari document event dengan query spesifik
    const eventData = await TeamsRegistered.findOne(query)
    if (!eventData) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Event not found with provided criteria',
        }),
        { status: 404 }
      )
    }

    // Cari index team berdasarkan teamId
    const teamIndex = eventData.teams.findIndex(
      team => team.teamId?.toString() === teamId
    )

    if (teamIndex === -1) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Team not found. Available teamIds: ${
            eventData.teams
              .map(t => t.teamId?.toString())
              .filter(Boolean)
              .join(', ') || 'None'
          }`,
        }),
        { status: 404 }
      )
    }

    // ✅ UPDATE PENALTY DENGAN UPDATEBY INFORMATION
    const teamToUpdate = eventData.teams[teamIndex]

    // Pastikan result object exists
    if (!teamToUpdate.result) {
      teamToUpdate.result = {}
    }

    // Simpan nilai lama untuk logging
    const oldPenalty = teamToUpdate.result.penaltyTime || 0

    // Update penalty dan tambahkan updateBy information
    teamToUpdate.result.penaltyTime = Number(penalty)
    teamToUpdate.result.updatedAt = new Date()
    teamToUpdate.result.updatedBy = updateBy || 'Unknown' // ✅ Simpan username
    teamToUpdate.result.position = position || 'Unknown' // ✅ Simpan position juga

    // Simpan perubahan ke database
    await eventData.save()

    console.log('✅ [PATCH] Update successful:', {
      teamName: teamToUpdate.nameTeam,
      oldPenalty: oldPenalty,
      newPenalty: teamToUpdate.result.penaltyTime,
      updatedBy: teamToUpdate.result.updatedBy,
      position: teamToUpdate.result.position,
    })

    // Kembalikan response sukses
    return new Response(
      JSON.stringify({
        success: true,
        message: `Penalty updated successfully for ${teamToUpdate.nameTeam}`,
        data: {
          teamName: teamToUpdate.nameTeam,
          penalty: teamToUpdate.result.penaltyTime,
          updatedAt: teamToUpdate.result.updatedAt,
          updatedBy: teamToUpdate.result.updatedBy,
          position: teamToUpdate.result.position,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (err) {
    console.error('❌ [PATCH] Error updating penalty:', err)
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error: ' + err.message,
      }),
      { status: 500 }
    )
  }
}
