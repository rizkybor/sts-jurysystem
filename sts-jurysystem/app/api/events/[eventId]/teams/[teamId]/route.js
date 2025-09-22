// app/api/events/[eventId]/teams/[teamId]/route.js
import connectDB from '@/config/database'
import TeamRegistered from '@/models/TeamRegistered' // model dari teamsRegisteredCollection

export async function PATCH(req, { params }) {
  try {
    await connectDB()

    const { eventId, teamId } = params
    const { penalty } = await req.json()

    const updated = await TeamRegistered.findOneAndUpdate(
      { _id: eventId, 'teams.teamId': teamId },
      { $set: { 'teams.$.result.penalty': penalty } },
      { new: true }
    )

    if (!updated) {
      return new Response(
        JSON.stringify({ success: false, message: 'Team not found' }),
        { status: 404 }
      )
    }

    return new Response(JSON.stringify({ success: true, data: updated }), {
      status: 200,
    })
  } catch (err) {
    console.error('❌ Error updating penalty:', err)
    return new Response(
      JSON.stringify({ success: false, message: 'Internal Server Error' }),
      { status: 500 }
    )
  }
}
