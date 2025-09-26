import connectDB from '@/config/database'
import User from '@/models/User'
import UserJudgeAssignment from '@/models/UserJudgeAssignments'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  try {
    await connectDB()
    console.log(req, 'updatedbeksiiiiiiiiiiiii')
    const payload = req.nextUrl.searchParams.get('email')
    if (!payload) {
      return new Response('Email is required', { status: 400 })
    }

    console.log('Email query:', payload)

    // const user = await User.findOne({ email }).lean()
    // if (!user) {
    //   console.log('User not found:', email)
    //   return new Response(JSON.stringify({ assignments: [] }), { status: 200 })
    // }
    console.log(await UserJudgeAssignment.find({}).lean())

    // console.log('✅ Found user:', payload)
    // const user = await UserJudgeAssignment.findOne({ email: payload })
    // console.log('User Data: beksiiiiiiiii', user)
    // const assignments = await UserJudgeAssignment.findOne({
    //   userId: user._id,
    //   active: true,
    // })
    // .populate('eventId')
    // .lean()

    // console.log('📄 Assignments Data:', assignments)

    // return new Response(JSON.stringify({ assignments }), { status: 200 })
    return []
  } catch (error) {
    console.error('❌ GET /api/assignments error:', error)
    return new Response('Something went wrong', { status: 500 })
  }
}
