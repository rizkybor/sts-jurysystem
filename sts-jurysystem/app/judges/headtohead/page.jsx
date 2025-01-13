"use client";
import { useState } from "react";
import Link from "next/link";

const JudgesHeadToHeadPage = () => {
  const [selectedHeat, setSelectedHeat] = useState("");
  const [selectedBooyan, setSelectedBooyan] = useState("");
  const [teamAResult, setTeamAResult] = useState(null);
  const [teamBResult, setTeamBResult] = useState(null);

  const heatOptions = ["Heat 1", "Heat 2", "Final"];
  const booyanOptions = ["R1", "R2", "R3"];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedHeat || !selectedBooyan || teamAResult === null || teamBResult === null) {
      alert("Please complete all selections.");
      return;
    }

    // Simulasi pengiriman data
    console.log({
      heat: selectedHeat,
      booyan: selectedBooyan,
      teamA: teamAResult ? "YES" : "NO",
      teamB: teamBResult ? "YES" : "NO",
    });

    alert("Penalties submitted successfully!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-lg relative">

        {/* Title */}
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Head to Head Feature
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Heat Selection */}
          <div>
            <label className="block text-gray-700 mb-2">Position Penalties:</label>
            <select
              value={selectedHeat}
              onChange={(e) => setSelectedHeat(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            >
              <option value="" disabled>Select Heat</option>
              {heatOptions.map((heat, index) => (
                <option key={index} value={heat}>
                  {heat}
                </option>
              ))}
            </select>
          </div>

          {/* Booyan Selection */}
          <div>
            <label className="block text-gray-700 mb-2">Booyan:</label>
            <select
              value={selectedBooyan}
              onChange={(e) => setSelectedBooyan(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            >
              <option value="" disabled>Select Booyan</option>
              {booyanOptions.map((booyan, index) => (
                <option key={index} value={booyan}>
                  {booyan}
                </option>
              ))}
            </select>
          </div>

          {/* Team A */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Team A</h3>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setTeamAResult(true)}
                className={`w-1/2 py-3 rounded-lg border ${
                  teamAResult === true
                    ? "bg-blue-100 border-blue-500 text-blue-700 font-semibold"
                    : "bg-white border-gray-300 text-gray-700"
                } hover:bg-blue-50 transition duration-300`}
              >
                YES
              </button>
              <button
                type="button"
                onClick={() => setTeamAResult(false)}
                className={`w-1/2 py-3 rounded-lg border ${
                  teamAResult === false
                    ? "bg-blue-100 border-blue-500 text-blue-700 font-semibold"
                    : "bg-white border-gray-300 text-gray-700"
                } hover:bg-blue-50 transition duration-300`}
              >
                NO
              </button>
            </div>
          </div>

          {/* Team B */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Team B</h3>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setTeamBResult(true)}
                className={`w-1/2 py-3 rounded-lg border ${
                  teamBResult === true
                    ? "bg-blue-100 border-blue-500 text-blue-700 font-semibold"
                    : "bg-white border-gray-300 text-gray-700"
                } hover:bg-blue-50 transition duration-300`}
              >
                YES
              </button>
              <button
                type="button"
                onClick={() => setTeamBResult(false)}
                className={`w-1/2 py-3 rounded-lg border ${
                  teamBResult === false
                    ? "bg-blue-100 border-blue-500 text-blue-700 font-semibold"
                    : "bg-white border-gray-300 text-gray-700"
                } hover:bg-blue-50 transition duration-300`}
              >
                NO
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold shadow-md hover:bg-blue-600 transition duration-300"
          >
            Submit →
          </button>
        </form>

        {/* View Result */}
        <div className="text-center mt-4">
          <button className="text-blue-500 hover:underline">
            View Result
          </button>
        </div>

        {/* 🔙 Button Back */}
        <div className="text-center mt-4">
        <Link href="/judges">
            <button className="text-blue-500 hover:underline">← Back</button>
        </Link>
        </div>

      </div>
    </div>
  );
};

export default JudgesHeadToHeadPage;