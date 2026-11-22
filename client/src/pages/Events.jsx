import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";

function Events() {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [registering, setRegistering] = useState(null);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await API.get("/events");
      const data = Array.isArray(response.data)
        ? response.data
        : response.data.events || [];

      setEvents(data.filter((event) => event.status === "published"));
    } catch (err) {
      console.error("Fetch events error:", err);
      setError(err.response?.data?.message || "Unable to load events.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleRegister = async (eventId) => {
    if (!token || !user) {
      window.location.href = "/login";
      return;
    }

    if (user.role !== "student") {
      setMessage("Only participant accounts can register for events.");
      return;
    }

    try {
      setRegistering(eventId);
      setMessage("");

      await API.post(`/registrations/${eventId}`);
      setMessage("Successfully registered for this event!");
    } catch (err) {
      setMessage(
        err.response?.data?.message || "Unable to register for this event."
      );
    } finally {
      setRegistering(null);
    }
  };

  const categories = [
    "All",
    ...new Set(events.map((event) => event.category).filter(Boolean)),
  ];

  const normalizedSearch = search.trim().toLowerCase();

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      (event.title || "").toLowerCase().includes(normalizedSearch) ||
      (event.location || "").toLowerCase().includes(normalizedSearch) ||
      (event.description || "").toLowerCase().includes(normalizedSearch);

    const matchesCategory =
      category === "All" || event.category === category;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#100d1c] text-white">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#100d1c]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <Link to="/" className="text-2xl font-bold tracking-tight">
            Explore<span className="text-violet-400">X.</span>
          </Link>

          <div className="flex items-center gap-4 text-sm sm:gap-7">
            <Link to="/" className="text-slate-400 transition hover:text-white">
              Home
            </Link>

            {user && (
              <Link
                to={
                  user.role === "admin"
                    ? "/admin-dashboard"
                    : user.role === "organizer"
                      ? "/dashboard"
                      : "/student-dashboard"
                }
                className="hidden text-slate-400 transition hover:text-white sm:inline"
              >
                Dashboard
              </Link>
            )}

            {!user ? (
              <Link
                to="/login"
                className="rounded-xl bg-violet-600 px-4 py-2.5 font-semibold text-white transition hover:bg-violet-500 sm:px-5"
              >
                Login
              </Link>
            ) : (
              <span className="max-w-32 truncate text-slate-300 sm:max-w-none">
                {user.name}
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* PAGE INTRO */}
      <main className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
        <section className="relative overflow-hidden rounded-3xl border border-violet-400/15 bg-gradient-to-br from-[#292044] via-[#211a35] to-[#171326] px-6 py-10 sm:px-10 sm:py-14 lg:px-14">
          <div className="pointer-events-none absolute -right-16 -top-28 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300 sm:text-sm">
              Discover & Participate
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
              Find your next
              <br />
              <span className="text-violet-300">great experience.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300/80 sm:text-base sm:leading-8">
              Explore events, outdoor adventures, sports, workshops and
              experiences happening around you.
            </p>
          </div>
        </section>

        {/* SEARCH AND FILTERS */}
        <section className="mt-10 rounded-2xl border border-white/[0.08] bg-[#171326] p-4 sm:mt-12 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true">
                ⌕
              </span>
              <input
                type="text"
                aria-label="Search events"
                placeholder="Search by event, location or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#100d1c] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/70 focus:ring-4 focus:ring-violet-500/10"
              />
            </div>

            <select
              aria-label="Filter by category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#100d1c] px-4 py-3.5 text-sm text-slate-200 outline-none transition focus:border-violet-400/70 focus:ring-4 focus:ring-violet-500/10 md:w-56"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? "All categories" : item}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`rounded-full px-3.5 py-2 text-xs font-medium transition sm:text-sm ${
                  category === item
                    ? "bg-violet-600 text-white"
                    : "border border-white/10 bg-white/[0.02] text-slate-400 hover:border-violet-400/40 hover:text-white"
                }`}
              >
                {item === "All" ? "All events" : item}
              </button>
            ))}
          </div>
        </section>

        {/* STATUS MESSAGE */}
        {message && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-violet-400/20 bg-violet-500/[0.08] px-5 py-4 text-sm text-violet-200"
          >
            {message}
          </div>
        )}

        {/* EVENTS */}
        <section className="mt-12 sm:mt-14">
          <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
                Your next experience
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Explore events
              </h2>
            </div>
            <span className="text-sm text-slate-400">
              {filteredEvents.length} {filteredEvents.length === 1 ? "event" : "events"} found
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.07] bg-[#171326] py-20">
              <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-violet-400/20 border-t-violet-400" />
              <p className="mt-4 text-sm text-slate-400">Loading events...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.08] p-6 text-sm text-red-300">
              <p>{error}</p>
              <button
                onClick={fetchEvents}
                className="mt-3 font-semibold underline underline-offset-4 transition hover:text-white"
              >
                Try again
              </button>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-[#171326] px-6 py-16 text-center">
              <div className="text-4xl" aria-hidden="true">✦</div>
              <h3 className="mt-5 text-xl font-semibold">No events found</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Try a different search term or choose another category.
              </p>
              {(search || category !== "All") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setCategory("All");
                  }}
                  className="mt-5 rounded-lg border border-violet-400/30 px-4 py-2 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/10"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 xl:gap-7">
              {filteredEvents.map((event) => (
                <article
                  key={event._id}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1d1930] shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-1 hover:border-violet-400/40 hover:shadow-xl hover:shadow-violet-950/20"
                >
                  {/* EVENT POSTER */}
                  <div className="relative h-52 shrink-0 overflow-hidden bg-gradient-to-br from-[#30234f] to-[#19152b] sm:h-56">
                    {event.poster?.url ? (
                      <img
                        src={event.poster.url}
                        alt={`${event.title} poster`}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-6xl text-violet-200/80" aria-hidden="true">
                          ✦
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
                    <span className="absolute left-4 top-4 rounded-full border border-white/10 bg-[#100d1c]/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-200 backdrop-blur sm:text-xs">
                      {event.category || "Featured event"}
                    </span>
                    <span className="absolute right-4 top-4 rounded-full border border-emerald-400/20 bg-[#10251f]/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 backdrop-blur sm:text-xs">
                      {event.status}
                    </span>
                  </div>

                  {/* EVENT DETAILS */}
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <h3 className="line-clamp-2 text-xl font-semibold leading-snug text-white">
                      {event.title}
                    </h3>
                    <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-slate-400">
                      {event.description}
                    </p>

                    <div className="mt-6 space-y-3 border-t border-white/[0.07] pt-5 text-sm text-slate-400">
                      <p className="flex items-start gap-3">
                        <span className="w-5 shrink-0 text-center" aria-hidden="true">📅</span>
                        <span>
                          {new Date(event.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </p>
                      <p className="flex items-start gap-3">
                        <span className="w-5 shrink-0 text-center" aria-hidden="true">📍</span>
                        <span className="line-clamp-1">{event.location}</span>
                      </p>
                      <p className="flex items-start gap-3">
                        <span className="w-5 shrink-0 text-center" aria-hidden="true">👥</span>
                        <span>Capacity: {event.capacity}</span>
                      </p>
                    </div>

                    <div className="mt-auto pt-7">
                      <Link
                        to={`/events/${event._id}`}
                        className="block w-full rounded-xl border border-violet-400/40 bg-violet-500/[0.06] px-4 py-3 text-center text-sm font-semibold text-violet-200 transition duration-200 hover:border-violet-400/70 hover:bg-violet-500/15"
                      >
                        View details <span aria-hidden="true">→</span>
                      </Link>

                      <button
                        onClick={() => handleRegister(event._id)}
                        disabled={registering === event._id}
                        className="mt-3 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/20 transition duration-200 hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {registering === event._id
                          ? "Registering..."
                          : "Register for event"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.07] bg-[#100d1c] px-5 py-9 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 text-sm text-slate-500 sm:flex-row">
          <Link to="/" className="w-fit text-lg font-bold text-white">
            Explore<span className="text-violet-400">X.</span>
          </Link>
          <p>© 2026 ExploreX. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Events;
