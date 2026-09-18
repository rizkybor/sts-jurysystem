import connectDB from '@/config/database';
import Event from '@/models/Event';

export async function GET(request, context) {
  try {
    await connectDB();

    // ⬇️ WAJIB: await params
    const { id } = await context.params;

    if (!id) {
      return new Response('Missing param: id', { status: 400 });
    }

    // BUG FIX: `.findById()` tanpa `.lean()` mengembalikan Mongoose
    // document instance — field yang TIDAK dideklarasikan di schema
    // (mis. `resultsOfficialByCategory`, ditulis sts-timingsystem lewat
    // raw MongoDB driver) ikut ke-strip saat di-serialize, karena schema
    // ini strict secara default. `.lean()` mengembalikan objek plain
    // apa adanya dari MongoDB, jadi field manapun yang ditulis
    // timingsystem (walau tidak ada di models/Event.js) tetap ikut
    // terbawa ke response — pola sama dgn race-settings/route.js.
    const event = await Event.findById(id).lean();
    if (!event) return new Response('Event Not Found', { status: 404 });

    return new Response(JSON.stringify(event), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Something Went Wrong', { status: 500 });
  }
}