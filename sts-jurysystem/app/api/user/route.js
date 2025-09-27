import connectDB from '@/config/database'
import User from '@/models/User'
import { getSessionUser } from '@/utils/getSessionUser'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/user
export const GET = async () => {
  try {
    await connectDB()

    const sessionUser = await getSessionUser()
    if (!sessionUser || !sessionUser.userId) {
      return new Response('User ID is required', { status: 401 })
    }

    const { userId } = sessionUser

    // Find user by ID and exclude sensitive fields
    const user = await User.findById(userId).select('-password -__v').lean()
    if (!user) {
      return new Response('User not found', { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('❌ GET /api/user error:', error)
    return new Response('Something went wrong', { status: 500 })
  }
}
