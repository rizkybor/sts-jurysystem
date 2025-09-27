import connectDB from '@/config/database'
import User from '@/models/User'
import UserJudgeAssignment from '@/models/UserJudgeAssignments'
import { NextResponse } from 'next/server'


export const dynamic = 'force-dynamic'

export async function GET(req) {
  try {
    await connectDB()
    const payload = req.nextUrl.searchParams.get('email')
    if (!payload) {
      return new Response('Email is required', { status: 400 })
    }
    const judgesByMail = await UserJudgeAssignment.find({ email: payload })
    return NextResponse.json({ data: judgesByMail }, { status: 200 })
  } catch (error) {
    console.error('❌ GET /api/assignments error:', error)
    return new Response('Something went wrong', { status: 500 })
  }
}
