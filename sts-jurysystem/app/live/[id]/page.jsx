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
    <section className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">📊 Live Result</h1>

        {/* Event Info */}
        <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-2">Nama Event {id}</h2>
          <p>Class Events: Sprint</p>
          <p>Total Participants: 20</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md ${
                activeTab === tab
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
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
                <th className="py-2 px-4">No</th>
                <th className="py-2 px-4">Nama Team</th>
                <th className="py-2 px-4">BIB</th>
                <th className="py-2 px-4">Total Time</th>
                <th className="py-2 px-4">Ranked</th>
              </tr>
            </thead>
            <tbody>
              {dummyResults.map((result) => (
                <tr key={result.no} className="text-center">
                  <td className="py-2 px-4">{result.no}</td>
                  <td className="py-2 px-4">{result.team}</td>
                  <td className="py-2 px-4">{result.bib}</td>
                  <td className="py-2 px-4">{result.time}</td>
                  <td className="py-2 px-4 font-bold">{result.rank}</td>
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