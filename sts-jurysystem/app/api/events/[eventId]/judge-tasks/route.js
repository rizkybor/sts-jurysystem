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

    // teamsRegisteredCollection kadang memakai ejaan berbeda untuk
    // kategori yang sama — Head to Head disimpan sebagai "HEAD2HEAD" saat
    // registrasi tim di sts-timingsystem, walau halaman judge di sini
    // (dan hasil race) memakai "HEADTOHEAD" (lihat
    // views/TeamDetail/index.vue:CATEGORY_KEY_ALIASES di sts-timingsystem
    // — komentarnya menjelaskan inkonsistensi yang sama). Tanpa alias ini,
    // query exact-match selalu 404 dan dropdown Team di halaman H2H selalu
    // kosong.
    const EVENT_NAME_ALIASES = {
      HEADTOHEAD: ['HEADTOHEAD', 'HEAD2HEAD'],
      HEAD2HEAD: ['HEADTOHEAD', 'HEAD2HEAD'],
    }
    const eventNameUpper = String(eventName).toUpperCase()
    const eventNameQuery = EVENT_NAME_ALIASES[eventNameUpper]
      ? { $in: EVENT_NAME_ALIASES[eventNameUpper] }
      : eventName

    const docs = await TeamsRegistered.find({
      eventId,
      initialId,
      divisionId,
      raceId,
      eventName: eventNameQuery,
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

        // 🔹 Pastikan result selalu berupa array
        const results = Array.isArray(team.result) ? team.result : [team.result]

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
          results, // 🟢 kirim array hasil run
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
