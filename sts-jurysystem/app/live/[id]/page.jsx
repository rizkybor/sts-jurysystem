"use client";
import { useParams } from "next/navigation";
import { useState } from "react";

const EventDetailPage = () => {
  const { id } = useParams();

  const [activeTab, setActiveTab] = useState("Sprint");

  const tabs = ["Sprint", "Head To Head", "Slalom", "DRR", "Overall"];

  const dummyResults = [
    { no: 1, team: "Team A", bib: "101", time: "02:15", rank: 1 },
    { no: 2, team: "Team B", bib: "102", time: "02:45", rank: 2 },
  ];

  return (
    <section className="min-h-screen bg-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Event Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-6">
          📊 Live Result
        </h1>

        {/* Event Info */}
        <div className="bg-white shadow-md rounded-lg p-4 sm:p-6 mb-6">
          <h2 className="text-lg sm:text-2xl font-semibold mb-1">Nama Event {id}</h2>
          <p className="text-sm sm:text-base">Class Events: Sprint</p>
          <p className="text-sm sm:text-base">Total Participants: 20</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 sm:gap-4 overflow-x-auto scrollbar-hide mb-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-md text-sm sm:text-base ${
                activeTab === tab
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700"
              } whitespace-nowrap`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Result Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow-md rounded-lg">
            <thead className="bg-gray-200">
              <tr>
                <th className="py-2 px-3 sm:px-4 text-xs sm:text-sm">No</th>
                <th className="py-2 px-3 sm:px-4 text-xs sm:text-sm">Nama Team</th>
                <th className="py-2 px-3 sm:px-4 text-xs sm:text-sm">BIB</th>
                <th className="py-2 px-3 sm:px-4 text-xs sm:text-sm">Total Time</th>
                <th className="py-2 px-3 sm:px-4 text-xs sm:text-sm">Ranked</th>
              </tr>
            </thead>
            <tbody>
              {dummyResults.map((result) => (
                <tr key={result.no} className="text-center">
                  <td className="py-2 px-3 sm:px-4 text-xs sm:text-sm">{result.no}</td>
                  <td className="py-2 px-3 sm:px-4 text-xs sm:text-sm">{result.team}</td>
                  <td className="py-2 px-3 sm:px-4 text-xs sm:text-sm">{result.bib}</td>
                  <td className="py-2 px-3 sm:px-4 text-xs sm:text-sm">{result.time}</td>
                  <td className="py-2 px-3 sm:px-4 text-xs sm:text-sm font-bold">
                    {result.rank}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default EventDetailPage;