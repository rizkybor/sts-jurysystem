"use client";
import { useState } from "react";
import Link from "next/link";
import ResultHeadToHead from "@/components/ResultHeadToHead";

const JudgesHeadToHeadPage = () => {
  const [selectedHeat, setSelectedHeat] = useState("");
  const [selectedBooyan, setSelectedBooyan] = useState("");
  const [teamAResult, setTeamAResult] = useState(null);
  const [teamBResult, setTeamBResult] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resultData, setResultData] = useState({});

  const heatOptions = ["Heat 1", "Heat 2", "Final"];
  const booyanOptions = ["R1", "R2", "L1", "L2"];

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedHeat || !selectedBooyan || teamAResult === null || teamBResult === null) {
      alert("⚠️ Please complete all selections before submitting.");
      return;
    }

    const formData = {
      heat: selectedHeat,
      booyan: selectedBooyan,
      teamA: teamAResult ? "Y" : "N",
      teamB: teamBResult ? "Y" : "N",
    };

    alert("📊 Submitted Data:\n\n" + JSON.stringify(formData, null, 2));
    setResultData(formData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-lg relative">

        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Head to Head Feature
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Heat Selection */}
          <div>
            <label className="block text-gray-700 mb-2">Heat:</label>
            <select
              value={selectedHeat}
              onChange={(e) => setSelectedHeat(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            >
              <option value="" disabled>Select Heat</option>
              {heatOptions.map((heat, index) => (
                <option key={index} value={heat}>{heat}</option>
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
                <option key={index} value={booyan}>{booyan}</option>
              ))}
            </select>
          </div>

          {/* Team A */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Team A</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTeamAResult(true)}
                className={`py-3 rounded-lg font-semibold border ${
                  teamAResult === true
                    ? "bg-green-500 text-white border-green-600"
                    : "bg-white border-gray-300 text-gray-700"
                } hover:bg-green-400 transition duration-300`}
              >
                YES
              </button>
              <button
                type="button"
                onClick={() => setTeamAResult(false)}
                className={`py-3 rounded-lg font-semibold border ${
                  teamAResult === false
                    ? "bg-red-500 text-white border-red-600"
                    : "bg-white border-gray-300 text-gray-700"
                } hover:bg-red-400 transition duration-300`}
              >
                NO
              </button>
            </div>
          </div>

          {/* Team B */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Team B</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTeamBResult(true)}
                className={`py-3 rounded-lg font-semibold border ${
                  teamBResult === true
                    ? "bg-green-500 text-white border-green-600"
                    : "bg-white border-gray-300 text-gray-700"
                } hover:bg-green-400 transition duration-300`}
              >
                YES
              </button>
              <button
                type="button"
                onClick={() => setTeamBResult(false)}
                className={`py-3 rounded-lg font-semibold border ${
                  teamBResult === false
                    ? "bg-red-500 text-white border-red-600"
                    : "bg-white border-gray-300 text-gray-700"
                } hover:bg-red-400 transition duration-300`}
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
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-blue-500 hover:underline"
          >
            View Result
          </button>
        </div>

        {/* Button Back */}
        <div className="text-center mt-4">
          <Link href="/judges">
            <button className="text-blue-500 hover:underline">← Back</button>
          </Link>
        </div>

        <ResultHeadToHead
          isOpen={isModalOpen}
          closeModal={() => setIsModalOpen(false)}
          resultData={resultData}
        />
      </div>
    </div>
  );
};

export default JudgesHeadToHeadPage;