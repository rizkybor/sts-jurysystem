"use client";
import { useState } from "react";
import Link from "next/link";
import ResultDRR from "@/components/ResultDRR";  // Import Modal

const JudgesDRRPages = () => {
  const [selectedPenalty, setSelectedPenalty] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);  // State Modal
  const [resultData, setResultData] = useState({});       // State Data Modal

  const penalties = [0, -10, 10, 50];
  const teams = ["Team A", "Team B", "Team C"];
  const positions = ["Start", "Finish"];

  // ✅ Handle Submit hanya untuk alert JSON
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedPosition || !selectedTeam || selectedPenalty === null) {
      alert("⚠️ Please select all options before submitting.");
      return;
    }

    const formData = {
      position: selectedPosition,
      team: selectedTeam,
      penalty: selectedPenalty,
    };

    alert("📊 Submitted Data:\n\n" + JSON.stringify(formData, null, 2));
  };

  // ✅ Handle untuk buka modal
  const handleViewResult = () => {
    const formData = {
      position: selectedPosition,
      team: selectedTeam,
      penalty: selectedPenalty,
    };
    setResultData(formData);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-lg relative">
        {/* Title */}
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          DRR Feature
        </h1>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Position Penalties */}
          <div>
            <label className="block text-gray-700 mb-2">
              Position Penalties:
            </label>
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            >
              <option value="" disabled>Select Position</option>
              {positions.map((position, index) => (
                <option key={index} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </div>

          {/* Teams */}
          <div>
            <label className="block text-gray-700 mb-2">Teams:</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            >
              <option value="" disabled>Select Team</option>
              {teams.map((team, index) => (
                <option key={index} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>

          {/* Penalties */}
          <div className="space-y-2">
            {penalties.map((penalty, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedPenalty(penalty)}
                className={`w-full py-3 rounded-lg border ${
                  selectedPenalty === penalty
                    ? "bg-blue-100 border-blue-500 text-blue-700 font-semibold"
                    : "bg-white border-gray-300 text-gray-700"
                } hover:bg-blue-50 transition duration-300`}
              >
                {penalty}
              </button>
            ))}
          </div>

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
            onClick={handleViewResult}
            className="text-blue-500 hover:underline"
          >
            View Result
          </button>
        </div>

        {/* 🔙 Button Back */}
        <div className="text-center mt-4">
          <Link href="/judges">
            <button className="text-blue-500 hover:underline">← Back</button>
          </Link>
        </div>

        {/* Modal Result DRR */}
        <ResultDRR
          isOpen={isModalOpen}
          closeModal={() => setIsModalOpen(false)}
          resultData={resultData}
        />
      </div>
    </div>
  );
};

export default JudgesDRRPages;