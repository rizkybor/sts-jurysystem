import connectDB from '@/config/database'
import TeamsRegistered from '@/models/TeamsRegistered'

export async function GET(req, { params }) {
  try {
    await connectDB()

    const { eventId } = params

    console.log('🔍 [GET] Fetching all teams for eventId:', eventId)

    const eventDocs = await TeamsRegistered.find({ eventId })

    if (!eventDocs || eventDocs.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Teams not found for this event',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Format teams
    const formattedTeams = eventDocs.flatMap(doc =>
      doc.teams.map(team => ({
        _id: team._id.toString(),
        nameTeam: team.nameTeam,
        bibTeam: team.bibTeam,
        eventId: doc.eventId?.toString(),
        eventCatId: doc._id?.toString(),
        initialId: doc.initialId?.toString() || '',
        raceId: doc.raceId?.toString() || '',
        divisionId: doc.divisionId?.toString() || '',
        result: {
          penaltyTime: Number(team.result?.penaltyTime || 0),
          score: Number(team.result?.score || 0),
        },
      }))
    )

    const eventMetadata = eventDocs.map(doc => ({
      eventCatId: doc._id?.toString(),
      initialId: doc.initialId,
      raceId: doc.raceId,
      divisionId: doc.divisionId,
      eventName: doc.eventName,
      initialName: doc.initialName,
      raceName: doc.raceName,
      divisionName: doc.divisionName,
    }))

    // Hitung total peserta unik berdasarkan nameTeam
    const uniqueTeamNames = new Set()
    eventDocs.forEach(doc => {
      doc.teams.forEach(team => {
        if (team.nameTeam) uniqueTeamNames.add(team.nameTeam.trim())
      })
    })
    const totalUniqueParticipants = uniqueTeamNames.size

    return new Response(
      JSON.stringify({
        success: true,
        teams: formattedTeams,
        eventMetadata,
        totalUniqueParticipants,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('❌ [GET] Error fetching teams:', err)
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Error fetching teams',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
