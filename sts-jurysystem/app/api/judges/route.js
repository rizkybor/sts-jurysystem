import connectDB from '@/config/database'
import User from '@/models/User'
import Event from '@/models/Event'
import { getSessionUser } from '@/utils/getSessionUser'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectDB()

    const sessionUser = await getSessionUser()
    if (!sessionUser?.userId) {
      return new Response('User ID is required', { status: 401 })
    }

    const userId = sessionUser.userId
    const user = await User.findById(userId).lean()
    if (!user) {
      return new Response('User not found', { status: 404 })
    }

    const events = await Event.find({
      _id: { $in: user.mainEvents || [] },
    }).lean()

    return new Response(
      JSON.stringify({
        user,
        events,
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ GET /api/judges error:', error)
    return new Response('Something went wrong', { status: 500 })
  }
}
