import connectDB from '@/config/database'
import Event from '@/models/Event'
import Category from '@/models/Category'
import Division from '@/models/Division'
import Type from '@/models/Type'
import Initial from '@/models/Initial'
import { getSessionUser } from '@/utils/getSessionUser'
import cloudinary from '@/config/cloudinary'
import mongoose from 'mongoose'

// GET /api/events
export const GET = async request => {
  try {
    await connectDB()

    const page = Math.max(
      1,
      parseInt(request.nextUrl.searchParams.get('page') || '1', 10)
    )
    const pageSize = Math.max(
      1,
      parseInt(request.nextUrl.searchParams.get('pageSize') || '10', 10)
    )
    const skip = (page - 1) * pageSize

    const [total, events] = await Promise.all([
      Event.countDocuments({}),
      Event.find({})
        .sort({ startDateEvent: 1, createdAt: -1 }) // optional: urutkan yang terdekat dulu
        .skip(skip)
        .limit(pageSize)
        .lean(), // kirim plain JSON, lebih ringan & cepat
    ])

    const result = {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
      events, // sudah berisi categoriesEvent/Division/Race/Initial (embedded), jadi tak perlu populate
    }
    // console.log('[GET /api/events] result:', result)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[GET /api/events]', error)
    return new Response(JSON.stringify({ message: 'Failed to fetch events' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const POST = async request => {
  try {
    await connectDB()

    // Mendapatkan data pengguna saat ini
    const sessionUser = await getSessionUser()
    if (!sessionUser || !sessionUser.userId) {
      return new Response('User ID is required', { status: 401 })
    }

    const { userId } = sessionUser

    // Mengambil data dari FormData
    const formData = await request.formData()

    // Ambil kategori event dan jadwal
    const eventCategories = formData
      .getAll('eventCategories')
      .map(id => ({ $oid: id }))
    const divisionCategories = formData
      .getAll('divisionCategories')
      .map(id => ({ $oid: id }))
    const raceCategories = formData
      .getAll('raceCategories')
      .map(id => ({ $oid: id }))
    const initialCategories = formData
      .getAll('initialCategories')
      .map(id => ({ $oid: id }))

    const schedule = JSON.parse(formData.get('schedule') || '[]') // Jadwal dikirim dalam bentuk JSON

    // Data dasar event
    const eventData = {
      eventName: formData.get('eventName'),
      description: formData.get('description'),
      levelName: formData.get('levelName'),
      riverName: formData.get('riverName'),
      location: {
        street: formData.get('location.street'),
        city: formData.get('location.city'),
        state: formData.get('location.state'),
        zipcode: formData.get('location.zipcode'),
      },
      schedule,
      eventCategories,
      divisionCategories,
      raceCategories,
      initialCategories,
      chiefJudge: {
        name: formData.get('chiefJudge.name'),
        sign: formData.get('chiefJudge.sign') || '',
      },
      raceDirector: {
        name: formData.get('raceDirector.name'),
        sign: formData.get('raceDirector.sign') || '',
      },
      safetyDirector: {
        name: formData.get('safetyDirector.name'),
        sign: formData.get('safetyDirector.sign') || '',
      },
      eventDirector: {
        name: formData.get('eventDirector.name'),
        sign: formData.get('eventDirector.sign') || '',
      },
      tags: formData.getAll('tags'),
      statusEvent: formData.get('statusEvent') || 'Activated',
      logoSupport: [],
      logoEvent: '',
      owner: userId,
    }

    // Proses upload gambar ke Cloudinary
    const logoEvent = formData.get('logoEvent')
    const logoSupportImages = formData.getAll('logoSupport')

    if (logoEvent && logoEvent.name !== '') {
      const logoBuffer = await logoEvent.arrayBuffer()
      const logoArray = Array.from(new Uint8Array(logoBuffer))
      const logoBase64 = Buffer.from(logoArray).toString('base64')

      const uploadLogo = await cloudinary.uploader.upload(
        `data:image/png;base64,${logoBase64}`,
        { folder: 'event_images' }
      )

      eventData.logoEvent = uploadLogo.secure_url
    }

    const logoUploadPromises = logoSupportImages.map(async image => {
      const imageBuffer = await image.arrayBuffer()
      const imageArray = Array.from(new Uint8Array(imageBuffer))
      const imageBase64 = Buffer.from(imageArray).toString('base64')

      const uploadResult = await cloudinary.uploader.upload(
        `data:image/png;base64,${imageBase64}`,
        { folder: 'event_images' }
      )

      return uploadResult.secure_url
    })

    eventData.logoSupport = await Promise.all(logoUploadPromises)

    // Simpan data event ke database
    const newEvent = new Event(eventData)
    await newEvent.save()

    return new Response(
      JSON.stringify({ message: 'Event created successfully', newEvent }),
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(error)
    return new Response('Failed to create event', { status: 500 })
  }
}
