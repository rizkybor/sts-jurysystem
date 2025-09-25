// app/api/events/[eventId]/route.js
import connectDB from '@/config/database'
import Event from '@/models/Event'

// ✅ GET detail event
export async function GET(req, { params }) {
  try {
    await connectDB()
    const { eventId } = params

    console.log('🔍 [GET] Fetching event detail for:', eventId)

    const event = await Event.findById(eventId).lean()
    if (!event) {
      return Response.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      )
    }

    return Response.json(
      {
        success: true,
        event: {
          id: event._id.toString(),
          eventName: event.eventName,
          levelName: event.levelName,
          riverName: event.riverName,

          // alamat
          addressDistrict: event.addressDistrict,
          addressSubDistrict: event.addressSubDistrict,
          addressVillage: event.addressVillage,
          addressCity: event.addressCity,
          addressProvince: event.addressProvince,
          addressZipCode: event.addressZipCode,
          addressState: event.addressState,

          // tanggal
          startDateEvent: event.startDateEvent,
          endDateEvent: event.endDateEvent,

          // kategori
          categoriesEvent: event.categoriesEvent,
          categoriesDivision: event.categoriesDivision,
          categoriesRace: event.categoriesRace,
          categoriesInitial: event.categoriesInitial,

          // penanggung jawab
          chiefJudge: event.chiefJudge,
          raceDirector: event.raceDirector,
          safetyDirector: event.safetyDirector,
          eventDirector: event.eventDirector,

          // status
          statusEvent: event.statusEvent,

          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ [GET] Error fetching event detail:', error)
    return Response.json(
      { success: false, message: 'Error fetching event detail' },
      { status: 500 }
    )
  }
}

// ✅ PATCH update metadata event
export async function PATCH(req, { params }) {
  try {
    await connectDB()
    const { eventId } = params
    const updates = await req.json()

    console.log('✏️ [PATCH] Updating event:', eventId, updates)

    const updatedEvent = await Event.findByIdAndUpdate(eventId, updates, {
      new: true,
      runValidators: true,
    }).lean()

    if (!updatedEvent) {
      return Response.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      )
    }

    return Response.json(
      { success: true, event: updatedEvent },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ [PATCH] Error updating event:', error)
    return Response.json(
      { success: false, message: 'Error updating event' },
      { status: 500 }
    )
  }
}

// ✅ DELETE event (opsional)
export async function DELETE(req, { params }) {
  try {
    await connectDB()
    const { eventId } = params

    const deleted = await Event.findByIdAndDelete(eventId)
    if (!deleted) {
      return Response.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      )
    }

    return Response.json(
      { success: true, message: 'Event deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ [DELETE] Error deleting event:', error)
    return Response.json(
      { success: false, message: 'Error deleting event' },
      { status: 500 }
    )
  }
}
