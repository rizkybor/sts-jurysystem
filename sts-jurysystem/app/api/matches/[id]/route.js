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

    const event = await Event.findById(id);
    if (!event) return new Response('Event Not Found', { status: 404 });

    return new Response(JSON.stringify(event), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Something Went Wrong', { status: 500 });
  }
}