// app/api/events/[id]/teams/route.js
import connectDB from '@/config/database'
import TeamsRegistered from '@/models/TeamsRegistered'

export async function GET(req, { params }) {
  try {
    await connectDB()
    const { id } = params

    // cari berdasarkan eventId
    const eventTeams = await TeamsRegistered.findOne({ eventId: id }).select(
      'teams'
    )

    if (!eventTeams) {
      return new Response(
        JSON.stringify({ success: false, message: 'No teams found' }),
        { status: 404 }
      )
    }

    return new Response(
      JSON.stringify({ success: true, teams: eventTeams.teams }),
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Error fetching teams:', error)
    return new Response(
      JSON.stringify({ success: false, message: 'Error fetching teams' }),
      { status: 500 }
    )
  }
}
