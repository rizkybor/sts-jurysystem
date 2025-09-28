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

  // Assignments & events
  const [assignments, setAssignments] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  const penalties = [0, 5, 50];

  /** Helper: ambil posisi SPRINT untuk eventId aktif dari struktur assignments */
  function getSprintPositionFromAssignments(list, evId) {
    if (!Array.isArray(list) || !evId) return "";
    // Kumpulkan semua 'judges' dari setiap item, lalu cari eventId yang cocok
    const match = list
      .flatMap((item) => item.judges || [])
      .find((j) => String(j.eventId) === String(evId));

    if (!match || !match.sprint) return "";

    // Prioritas: start > finish. Jika keduanya false, kosong.
    if (match.sprint.start) return "Start";
    if (match.sprint.finish) return "Finish";
    return "";
  }

  // Posisi ter-assign (otomatis) dari assignments -> khusus sprint
  const assignedPosition = useMemo(() => {
    return getSprintPositionFromAssignments(assignments, eventId);
  }, [assignments, eventId]);

  // Fetch assignments & user/events sekali, lalu derive selectedPosition dari assignments
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        setLoading(true);

        // 1) Ambil info judges (user + events)
        const judgesRes = await fetch("/api/judges", { cache: "no-store" });
        if (!judgesRes.ok)
          throw new Error(`Gagal memuat data judges: ${judgesRes.status}`);
        const judgesData = await judgesRes.json();

        if (judgesData.user) setUser(judgesData.user);
        setEvents(judgesData.events || []);

        const userEmail = judgesData.user?.email;
        if (!userEmail) throw new Error("Email tidak ditemukan");

        // 2) Ambil assignments berdasarkan email
        const assignmentsRes = await fetch(
          `/api/assignments?email=${encodeURIComponent(userEmail)}`,
          { cache: "no-store" }
        );
        if (!assignmentsRes.ok)
          throw new Error(`Gagal memuat assignments: ${assignmentsRes.status}`);

        const assignmentsData = await assignmentsRes.json();
        const list = assignmentsData.data || [];
        setAssignments(list);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch teams (berdasarkan kategori terpilih)
  useEffect(() => {
    if (!eventId || !selectedCategory) return;

    const fetchTeams = async () => {
      try {
        const [initialId, divisionId, raceId] = selectedCategory.split("|");
        const catEvent = "SPRINT";

        const res = await fetch(
          `/api/events/${eventId}/judge-tasks?initialId=${initialId}&divisionId=${divisionId}&raceId=${raceId}&eventName=${catEvent}`
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
        setLoadingTeams(false);
      }
    };

    setLoadingTeams(true);
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

  // Fetch sprint results ketika modal dibuka
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

  // Refresh teams setelah submit
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

  // Daftar kategori gabungan (Initial|Division|Race)
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

  // Ubah kategori
  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    setSelectedTeam("");
    setTeams([]);
    setLoadingTeams(true);
  };

  // Filter tim sesuai kategori
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
    if (loading) return; // cegah double click

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

    const parts = selectedCategory.split("|");
    if (parts.length !== 3) {
      alert("⚠️ Invalid category format.");
      return;
    }
    const [initialId, divisionId, raceId] = parts;

    const formData = {
      teamId: selectedTeam,
      penalty: Number(selectedPenalty),
      initialId,
      divisionId,
      raceId,
      position: finalPosition,
      updateBy: user?.username || "Unknown Judge",
    };

    console.log(formData,'<<< cek')

    // setLoading(true);
    // try {
    //   const res = await fetch(`/api/events/${eventId}/teams`, {
    //     method: "PATCH",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify(formData),
    //   });

    //   let data = null;
    //   try {
    //     data = await res.json();
    //   } catch {
    //     // non-JSON response
    //   }

    //   if (res.ok && (data?.success ?? true)) {
    //     alert(
    //       `✅ ${finalPosition} Penalty updated by ${user?.username || "you"}!`
    //     );
    //     await refreshTeams();
    //     // reset minimal
    //     setSelectedTeam("");
    //     setSelectedPenalty(null);
    //     // tetap di kategori yang sama agar cepat input batch
    //   } else {
    //     const msg = data?.message || `HTTP ${res.status}`;
    //     alert(`❌ Error: ${msg}`);
    //   }
    // } catch (err) {
    //   alert("❌ Failed to update penalty! Please try again.");
    // } finally {
    //   setLoading(false);
    // }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-lg relative">
        {eventDetail && (
          <div className="mb-4 space-y-1 bg-gray-100 p-4 rounded-lg">
            <div className="font-semibold">{eventDetail.eventName}</div>
            <div className="text-sm text-gray-600">
              {new Date(eventDetail.startDateEvent).toLocaleDateString(
                "id-ID",
                {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                }
              )}
              {" – "}
              {new Date(eventDetail.endDateEvent).toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </div>
            <div className="text-sm text-gray-600">
              {eventDetail.addressProvince}, {eventDetail.addressState}
            </div>
          </div>
        )}

        <div className="text-center mb-5">
          <h1 className="text-2xl font-bold text-gray-800">
            Judges {assignedPosition}
          </h1>
          <small className="text-center">Race Number : Sprint Race</small>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* CATEGORY */}
          <div>
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
              <select
                disabled
                className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-400"
              >
                <option>Select Teams...</option>
              </select>
            ) : filteredTeams.length ? (
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="select-base select-interactive"
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
              <select disabled className="select-base select-disabled">
                <option>No teams available for this category.</option>
              </select>
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
              : `Submit Penalty →`}
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
