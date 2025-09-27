"use client";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ResultSprint from "@/components/ResultSprint";

const JudgesSprintPages = () => {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");

  // UI states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // User / judge
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState("");

  // Event & teams
  const [eventDetail, setEventDetail] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);

  // Form states
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedPenalty, setSelectedPenalty] = useState(null);

  // Results modal
  const [sprintResults, setSprintResults] = useState([]);

  const penalties = [0, 5, 50];

  // Map judgesSprint -> position label
  const getPositionFromJudgeSprint = (judgeValue) => {
    switch (judgeValue) {
      case "1":
        return "Start";
      case "2":
        return "Finish";
      default:
        return "";
    }
  };

  // Derived assigned position
  const assignedPosition = user
    ? getPositionFromJudgeSprint(user.judgesSprint)
    : "";

  // Fetch user
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch("/api/user");
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          setSelectedPosition(
            getPositionFromJudgeSprint(data.judgesSprint) || ""
          );
        }
      } catch {
        // ignore
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUserData();
  }, []);

  // Fetch teams
  useEffect(() => {
    if (!eventId || !selectedCategory) return;

    const fetchTeams = async () => {
      try {
        const [initialId, divisionId, raceId] = selectedCategory.split("|");
        const catEvent = "SPRINT";

        const res = await fetch(
          `/api/events/${eventId}/teams?initialId=${initialId}&divisionId=${divisionId}&raceId=${raceId}&eventName=${catEvent}`
        );

        const data = await res.json();
        if (res.ok && data?.success) {
          setTeams(data.teams || []);
        } else {
          setTeams([]);
        }
      } catch (err) {
        console.error("❌ Failed to fetch teams:", err);
        setTeams([]);
      } finally {
        setLoadingTeams(false); // selesai loading
      }
    };

    fetchTeams();
  }, [eventId, selectedCategory]);

  // Fetch event detail
  useEffect(() => {
    if (!eventId) return;
    const fetchEventDetail = async () => {
      setLoadingEvent(true);
      try {
        const res = await fetch(`/api/matches/${eventId}`);
        const data = await res.json();
        const evt = data.event || data;
        setEventDetail(evt || null);
      } catch {
        setEventDetail(null);
      } finally {
        setLoadingEvent(false);
      }
    };
    fetchEventDetail();
  }, [eventId]);

  // Fetch sprint results when modal opens
  useEffect(() => {
    if (!isModalOpen) return;
    const fetchSprintResults = async () => {
      try {
        const res = await fetch("/api/judges/sprint");
        const data = await res.json();
        if (res.ok) setSprintResults(data.data || []);
      } catch {
        // ignore
      }
    };
    fetchSprintResults();
  }, [isModalOpen]);

  // Refresh teams after submit
  const refreshTeams = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/teams?t=${Date.now()}`);
      const data = await res.json();
      if (res.ok && data?.success) {
        setTeams(data.teams || []);
      }
    } catch {
      // ignore
    }
  };

  // Category list (Initial | Division | Race) -> label & value "initial|division|race"
  const combinedCategories = useMemo(() => {
    const list = [];
    const initials = eventDetail?.categoriesInitial || [];
    const divisions = eventDetail?.categoriesDivision || [];
    const races = eventDetail?.categoriesRace || [];
    initials.forEach((initial) => {
      divisions.forEach((division) => {
        races.forEach((race) => {
          list.push({
            label: `${initial.name} - ${division.name} - ${race.name}`,
            value: `${initial.value}|${division.value}|${race.value}`,
          });
        });
      });
    });
    return list;
  }, [eventDetail]);

  // Handle category selection
  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    setSelectedTeam("");
    setTeams([]);
    setLoadingTeams(true);
  };

  // Teams filtered by selected category
  const filteredTeams = useMemo(() => {
    if (!selectedCategory) return teams;
    const [initialId, divisionId, raceId] = selectedCategory.split("|");
    return teams.filter(
      (team) =>
        String(team.initialId) === String(initialId) &&
        String(team.divisionId) === String(divisionId) &&
        String(team.raceId) === String(raceId)
    );
  }, [selectedCategory, teams]);

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalPosition = assignedPosition || selectedPosition;

    if (
      !selectedTeam ||
      selectedPenalty === null ||
      !finalPosition ||
      !selectedCategory
    ) {
      alert("⚠️ Please select category, team and penalty before submitting.");
      return;
    }

    const [initialId, divisionId, raceId] = selectedCategory.split("|");

    const formData = {
      teamId: selectedTeam,
      penalty: Number(selectedPenalty),
      initialId,
      divisionId,
      raceId,
      position: finalPosition,
      updateBy: user?.username || "Unknown Judge",
    };

    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/teams`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok && data?.success) {
        alert(
          `✅ ${finalPosition} Penalty updated by ${user?.username || "you"}!`
        );
        await refreshTeams();
        setSelectedTeam("");
        setSelectedPenalty(null);
        setSelectedCategory("");
        if (!assignedPosition) setSelectedPosition("");
      } else {
        alert(`❌ Error: ${data?.message || "Failed to update penalty."}`);
      }
    } catch {
      alert("❌ Failed to update penalty! Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-lg relative">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Sprint Session
        </h1>

        {/* USER */}
        {loadingUser ? (
          <p className="text-gray-500 text-center">Loading user data...</p>
        ) : user ? (
          <div className="flex flex-col items-center mb-6">
            {user.image && (
              <img
                src={user.image}
                alt={user.username}
                className="w-10 h-10 rounded-full shadow-md mb-3"
              />
            )}
            <h2 className="text-lg font-semibold text-gray-800">
              {user.username}
            </h2>
            <p className="text-gray-600 text-sm">{user.email}</p>
            {assignedPosition && (
              <div
                className={`mt-2 px-3 py-1 rounded-full border ${
                  assignedPosition === "Start"
                    ? "bg-green-100 text-green-800 border-green-200"
                    : "bg-blue-100 text-blue-800 border-blue-200"
                }`}
              >
                <span className="font-semibold">{assignedPosition} Judge</span>
                <span className="text-xs ml-1">(Auto-assigned)</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-red-500 text-center">User not found.</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* CATEGORY */}
          <div>
            <label className="block text-gray-700 mb-2">Category:</label>
            {loadingEvent ? (
              <p className="text-gray-500 text-sm">Loading categories...</p>
            ) : combinedCategories.length ? (
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                required
              >
                <option value="">Select Category</option>
                {combinedCategories.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-gray-500 text-sm">No categories available.</p>
            )}
          </div>

          {/* TEAM */}
          <div>
            <label className="block text-gray-700 mb-2">Team:</label>
            {loadingTeams ? (
              <p className="text-gray-500">Loading teams...</p>
            ) : filteredTeams.length ? (
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                required
              >
                <option value="" disabled>
                  Select Team
                </option>
                {filteredTeams.map((team) => (
                  <option key={team._id} value={team._id}>
                    {team.nameTeam} (BIB {team.bibTeam})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-gray-500 text-sm">
                No teams available for this category.
              </p>
            )}
          </div>

          {/* PENALTY */}
          <div className="space-y-2">
            <div className="text-sm text-gray-600 mb-2">Select Penalty:</div>
            {penalties.map((pen) => (
              <button
                key={pen}
                type="button"
                onClick={() => setSelectedPenalty(pen)}
                className={`w-full py-3 rounded-lg border ${
                  selectedPenalty === pen
                    ? "bg-blue-100 border-blue-500 text-blue-700 font-semibold"
                    : "bg-white border-gray-300 text-gray-700"
                }`}
              >
                Penalty: {pen} points
              </button>
            ))}
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold shadow-md hover:bg-blue-600 disabled:bg-gray-400"
            disabled={
              loading ||
              !selectedTeam ||
              selectedPenalty === null ||
              !selectedCategory
            }
          >
            {loading
              ? "Submitting..."
              : `Submit as ${assignedPosition || selectedPosition} Judge →`}
          </button>
        </form>

        {/* VIEW RESULT */}
        <div className="text-center mt-4">
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-blue-500 hover:underline"
          >
            View Result
          </button>
        </div>

        {/* BACK */}
        <div className="text-center mt-4">
          <Link href="/judges">
            <button className="text-blue-500 hover:underline">
              ← Back to Judges
            </button>
          </Link>
        </div>
      </div>

      {/* MODAL RESULT */}
      <ResultSprint
        isOpen={isModalOpen}
        closeModal={() => setIsModalOpen(false)}
        sprintResults={sprintResults}
      />
    </div>
  );
};

export default JudgesSprintPages;
