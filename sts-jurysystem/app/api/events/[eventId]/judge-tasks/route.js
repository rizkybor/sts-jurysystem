import connectDB from '@/config/database'
import TeamsRegistered from '@/models/TeamsRegistered'

export async function GET(req, context) {
  try {
    await connectDB()

    const { eventId } = await context.params
    const { searchParams } = new URL(req.url)

    const initialId = searchParams.get('initialId')
    const divisionId = searchParams.get('divisionId')
    const raceId = searchParams.get('raceId')
    const eventName = searchParams.get('eventName')

    if (!eventId || !initialId || !divisionId || !raceId || !eventName) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'eventId, initialId, divisionId, raceId, eventName are required',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const docs = await TeamsRegistered.find({
      eventId,
      initialId,
      divisionId,
      raceId,
      eventName,
    }).lean()

    if (!docs || docs.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Teams not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const teams = docs.flatMap(doc => {
      return doc.teams.map(team => {
        const actualTeamId = team.teamId
        const mongoId = team._id?.toString()

        const finalId = actualTeamId || mongoId

        return {
          _id: finalId,
          nameTeam: team.nameTeam,
          bibTeam: team.bibTeam,
          eventId: doc.eventId?.toString(),
          initialId: doc.initialId?.toString() || '',
          divisionId: doc.divisionId?.toString() || '',
          raceId: doc.raceId?.toString() || '',
          eventName: doc.eventName || '',
          teamId: actualTeamId,
          hasValidTeamId: !!actualTeamId,
          startPenalty: team.result?.startPenalty || '',
          finishPenalty: team.result?.finishPenalty || '',
          judgesBy: team.result?.judgesBy || '',
          judgesTime: team.result?.judgesTime || '',
        }
      })
    })

    return new Response(JSON.stringify({ success: true, teams }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('❌ [GET] Error:', err)
    return new Response(
      JSON.stringify({ success: false, message: 'Error fetching teams' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
