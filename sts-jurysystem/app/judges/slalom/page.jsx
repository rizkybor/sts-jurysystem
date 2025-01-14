"use client";
import { useState } from "react";
import Link from "next/link";

const JudgesSlalomPage = () => {
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedGate, setSelectedGate] = useState("");
  const [selectedPenalty, setSelectedPenalty] = useState(null);
  const [score, setScore] = useState(0);
  const [clickedCircles, setClickedCircles] = useState({
    P1: false,
    P2: false,
    P3: false,
    P4: false,
  });

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

  const handleClick = (position) => {
    setClickedCircles((prev) => {
      const isClicked = prev[position];
      const updated = { ...prev, [position]: !isClicked };

      setScore((prevScore) => (isClicked ? prevScore - 10 : prevScore + 10));

      return updated;
    });
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

              <button
                type="submit"
                className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold shadow-md hover:bg-blue-600 transition duration-300"
              >
                Submit →
              </button>

              <div className="text-center mt-4">
                <Link href="/judges">
                  <button className="text-blue-500 hover:underline">← Back</button>
                </Link>
              </div>
            </div>

            {/* Kanan/Mobile Bawah: BoatView */}
            <div className="w-full md:w-1/2 flex flex-col items-center">
              <h2 className="text-lg font-semibold mb-4">Penalties Detail</h2>

              <div className="text-lg font-semibold mb-4">
                Sample Penalties Point: {score}
              </div>

              <div className="relative w-64 h-96 bg-green-300 rounded-full shadow-inner border-8 border-green-600">
                <div className="absolute top-4 left-4 w-64 h-88 bg-green-800 rounded-full"></div>

                {/* Lingkaran P1 */}
                <div
                  onClick={() => handleClick("P1")}
                  className={`absolute w-14 h-14 flex items-center justify-center rounded-full cursor-pointer font-bold ${
                    clickedCircles["P1"] ? "bg-red-500" : "bg-yellow-300"
                  } hover:scale-105 transition`}
                  style={{ top: "10%", left: "20%" }}
                >
                  P1
                </div>

                {/* Lingkaran P2 */}
                <div
                  onClick={() => handleClick("P2")}
                  className={`absolute w-14 h-14 flex items-center justify-center rounded-full cursor-pointer font-bold ${
                    clickedCircles["P2"] ? "bg-red-500" : "bg-yellow-300"
                  } hover:scale-105 transition`}
                  style={{ top: "10%", right: "20%" }}
                >
                  P2
                </div>

                {/* Lingkaran P3 */}
                <div
                  onClick={() => handleClick("P3")}
                  className={`absolute w-14 h-14 flex items-center justify-center rounded-full cursor-pointer font-bold ${
                    clickedCircles["P3"] ? "bg-red-500" : "bg-yellow-300"
                  } hover:scale-105 transition`}
                  style={{ bottom: "10%", left: "20%" }}
                >
                  P3
                </div>

                {/* Lingkaran P4 */}
                <div
                  onClick={() => handleClick("P4")}
                  className={`absolute w-14 h-14 flex items-center justify-center rounded-full cursor-pointer font-bold ${
                    clickedCircles["P4"] ? "bg-red-500" : "bg-yellow-300"
                  } hover:scale-105 transition`}
                  style={{ bottom: "10%", right: "20%" }}
                >
                  P4
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JudgesSlalomPage;