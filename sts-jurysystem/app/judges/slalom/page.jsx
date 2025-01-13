"use client";
import { useState } from "react";
import Link from "next/link";
import BoatModal from "@/components/BoatModal";

const JudgesSlalomPage = () => {
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedGate, setSelectedGate] = useState("");
  const [selectedPenalty, setSelectedPenalty] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false); // State untuk Modal

  const teamOptions = ["Team A", "Team B", "Team C"];
  const gateOptions = ["Gate 1", "Gate 2", "Gate 3"];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedTeam || !selectedGate || selectedPenalty === null) {
      alert("Please complete all selections.");
      return;
    }

    console.log({
      team: selectedTeam,
      gate: selectedGate,
      penalty: selectedPenalty,
    });

    alert("Penalties submitted successfully!");
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-lg relative">

        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Slalom Feature
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 mb-2">Section:</label>
            <input
              type="text"
              value="Section 1"
              readOnly
              className="w-full px-4 py-2 border rounded-lg bg-gray-100 focus:outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Pilih Team:</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            >
              <option value="" disabled>Select Team</option>
              {teamOptions.map((team, index) => (
                <option key={index} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Pilih Gawang:</label>
            <select
              value={selectedGate}
              onChange={(e) => setSelectedGate(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            >
              <option value="" disabled>Select Gate</option>
              {gateOptions.map((gate, index) => (
                <option key={index} value={gate}>
                  {gate}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            {[0, 5, 50].map((penalty, index) => (
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

          {/* Ganti Alert jadi Modal */}
          <button
            type="button"
            onClick={openModal}
            className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition duration-300"
          >
            Penalties Detail
          </button>

          <button
            type="submit"
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold shadow-md hover:bg-blue-600 transition duration-300"
          >
            Submit →
          </button>
        </form>

        <div className="text-center mt-4">
          <Link href="/judges">
            <button className="text-blue-500 hover:underline">← Back</button>
          </Link>
        </div>
      </div>

      {/* Modal Penalties Detail */}
      <BoatModal isOpen={isModalOpen} closeModal={closeModal} />
    </div>
  );
};

export default JudgesSlalomPage;