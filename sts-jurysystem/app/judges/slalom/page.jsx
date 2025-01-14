"use client";
import { useState } from "react";
import Link from "next/link";
import ResultSlalom from "@/components/ResultSlalom";

const JudgesSlalomPage = () => {
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedGate, setSelectedGate] = useState("");
  const [selectedPenalty, setSelectedPenalty] = useState(null);
  const [clickedCircles, setClickedCircles] = useState({
    P1: false,
    P2: false,
    P3: false,
    P4: false,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resultData, setResultData] = useState({});

  const teamOptions = ["Team A", "Team B", "Team C"];
  const gateOptions = ["Gate 1", "Gate 2", "Gate 3"];

  // ✅ Handle Submit: Menampilkan JSON di Alert
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedTeam || !selectedGate || selectedPenalty === null) {
      alert("⚠️ Please complete all selections.");
      return;
    }

    const formData = {
      team: selectedTeam,
      gate: selectedGate,
      selectedPenalty,
      penaltiesDetail: clickedCircles,
    };

    // 🔥 Tampilkan data dalam alert
    alert("📊 Submitted Data:\n\n" + JSON.stringify(formData, null, 2));
  };

  // ✅ Handle Klik Posisi di Boat
  const handleClick = (position) => {
    setClickedCircles((prev) => ({
      ...prev,
      [position]: !prev[position],
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-5xl bg-white p-6 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Slalom Feature
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Flexbox Responsif */}
          <div className="flex flex-col-reverse md:flex-row gap-8">
            
            {/* Kiri: Form */}
            <div className="w-full md:w-1/2 space-y-6">
              <div>
                <label className="block text-gray-700 mb-2">Section:</label>
                <input
                  type="text"
                  value="Section 1"
                  readOnly
                  className="w-full px-4 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Select Team:</label>
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
                <label className="block text-gray-700 mb-2">Select Gate:</label>
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

              {/* Penalty Buttons */}
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

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold shadow-md hover:bg-blue-600 transition duration-300"
              >
                Submit →
              </button>

               {/* Button View Result */}
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-blue-500 hover:underline"
          >
            View Result
          </button>
        </div>

              <div className="text-center mt-4">
                <Link href="/judges">
                  <button className="text-blue-500 hover:underline">← Back</button>
                </Link>
              </div>
            </div>

            {/* Kanan/Mobile Bawah: BoatView */}
            <div className="w-full md:w-1/2 flex flex-col items-center">
              <h2 className="text-lg font-semibold mb-4">Penalties Detail</h2>

              <div className="relative w-64 h-96 bg-green-300 rounded-full shadow-inner border-8 border-green-600">
                {["P1", "P2", "P3", "P4"].map((pos, index) => (
                  <div
                    key={index}
                    onClick={() => handleClick(pos)}
                    className={`absolute w-14 h-14 flex items-center justify-center rounded-full cursor-pointer font-bold ${
                      clickedCircles[pos] ? "bg-red-500" : "bg-yellow-300"
                    } hover:scale-105 transition`}
                    style={{
                      top: index < 2 ? "10%" : "70%",
                      left: index % 2 === 0 ? "20%" : "60%",
                    }}
                  >
                    {pos}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Modal Result */}
      <ResultSlalom
        isOpen={isModalOpen}
        closeModal={() => setIsModalOpen(false)}
        resultData={{
          team: selectedTeam,
          gate: selectedGate,
          selectedPenalty,
          penaltiesDetail: clickedCircles,
        }}
      />
    </div>
  );
};

export default JudgesSlalomPage;