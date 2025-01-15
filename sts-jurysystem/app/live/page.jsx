"use client";
import Link from "next/link";

const LivePage = () => {
  const dummyEvents = [
    { id: "1", name: "Event A", image: "/images/eventA.jpg" },
    { id: "2", name: "Event B", image: "/images/eventB.jpg" },
    { id: "3", name: "Event C", image: "/images/eventC.jpg" },
  ];

  return (
    <section className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">📊 All Events</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dummyEvents.map((event) => (
            <Link href={`/live/${event.id}`} key={event.id}>
              <div className="cursor-pointer bg-white shadow-lg rounded-lg overflow-hidden hover:scale-105 transition">
                <img
                  src={event.image}
                  alt={event.name}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-gray-800">{event.name}</h2>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Pagination Placeholder */}
        <div className="mt-8 flex justify-center">
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600">
            Load More
          </button>
        </div>
      </div>
    </section>
  );
};

export default LivePage;