import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

function Home() {
  const navigate = useNavigate();

  // Detect logged-in user
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Events");

  // Dashboard navigation based on role
  const getDashboardPath = () => {
    if (user?.role === "admin") return "/admin-dashboard";
    if (user?.role === "organizer") return "/dashboard";
    return "/student-dashboard";
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete API.defaults.headers.common["Authorization"];

    setUser(null);
    navigate("/login");
  };

  // Fetch published events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await API.get("/events");

        const eventData = Array.isArray(response.data)
          ? response.data
          : response.data.events || [];

        setEvents(
          eventData.filter((event) => event.status === "published")
        );
      } catch (err) {
        console.error("Error fetching events:", err);
        setError("Unable to load events. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const categories = [
    "All Events",
    ...new Set(events.map((event) => event.category).filter(Boolean)),
  ];

  const filteredEvents =
    selectedCategory === "All Events"
      ? events
      : events.filter((event) => event.category === selectedCategory);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="min-h-screen overflow-hidden bg-[#100d1c] text-white">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#100d1c]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="text-2xl font-bold tracking-tight"
          >
            Explore<span className="text-violet-400">X.</span>
          </button>

          <div className="hidden items-center gap-9 text-sm font-medium text-slate-400 md:flex">
            <a
              href="#"
              className="text-white transition hover:text-violet-300"
            >
              Home
            </a>

            <a
              href="#events"
              className="transition hover:text-white"
            >
              Explore Events
            </a>

            <a
              href="#about"
              className="transition hover:text-white"
            >
              About
            </a>
          </div>

          {/* AUTHENTICATION NAVBAR */}
          <div className="flex items-center gap-2 sm:gap-4">

            {user ? (
              <>
                <button
                  onClick={() => navigate(getDashboardPath())}
                  className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-violet-500"
                >
                  Dashboard
                </button>

                <button
                  onClick={handleLogout}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06]"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white sm:px-4"
                >
                  Login
                </button>

                <button
                  onClick={() => navigate("/register")}
                  className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold shadow-lg shadow-violet-950/40 transition duration-200 hover:-translate-y-0.5 hover:bg-violet-500 sm:px-5"
                >
                  Get Started
                </button>
              </>
            )}

          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative isolate">
        <div className="pointer-events-none absolute left-1/2 top-12 -z-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-violet-600/[0.13] blur-[130px]" />

        <div className="mx-auto max-w-7xl px-5 pb-20 pt-24 text-center sm:px-8 sm:pb-24 sm:pt-28 lg:px-10 lg:pb-28 lg:pt-32">

          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/[0.10] px-4 py-2 text-xs font-semibold tracking-wide text-violet-200 sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-blue-400" />
            DISCOVER. CONNECT. EXPERIENCE.
          </div>

          <h1 className="mx-auto max-w-5xl text-4xl font-bold leading-[1.12] tracking-tight sm:text-6xl lg:text-7xl">
            Events to Join.
            <br />
            <span className="text-violet-400">
              Adventures to Live.
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
            Discover exciting events, meet new people, try new experiences
            and make every moment count.
          </p>

          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">

            <a
              href="#events"
              className="rounded-xl bg-violet-600 px-8 py-4 text-sm font-semibold shadow-lg shadow-violet-950/40 transition duration-200 hover:-translate-y-0.5 hover:bg-violet-500 sm:text-base"
            >
              Explore Events <span aria-hidden="true">→</span>
            </a>

            <button
              onClick={() => navigate("/register")}
              className="rounded-xl border border-white/15 bg-white/[0.03] px-8 py-4 text-sm font-semibold text-slate-200 transition duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.07] sm:text-base"
            >
              Become an Organizer
            </button>

          </div>

          {/* STATISTICS */}
          <div className="mx-auto mt-20 grid max-w-3xl grid-cols-3 divide-x divide-white/10 border-y border-white/[0.09] py-7 sm:mt-24 sm:py-9">

            <div className="px-2 sm:px-6">
              <h2 className="text-2xl font-bold sm:text-3xl">
                {events.length}+
              </h2>
              <p className="mt-2 text-xs text-slate-500 sm:text-sm">
                Published Events
              </p>
            </div>

            <div className="px-2 sm:px-6">
              <h2 className="text-2xl font-bold sm:text-3xl">
                1K+
              </h2>
              <p className="mt-2 text-xs text-slate-500 sm:text-sm">
                Students
              </p>
            </div>

            <div className="px-2 sm:px-6">
              <h2 className="text-2xl font-bold sm:text-3xl">
                20+
              </h2>
              <p className="mt-2 text-xs text-slate-500 sm:text-sm">
                Organizers
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* EVENTS SECTION */}
      <section
        id="events"
        className="scroll-mt-24 border-t border-white/[0.05] bg-[#151126] py-20 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">

          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

            <div className="max-w-2xl">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-violet-300 sm:text-sm">
                Discover & Participate
              </p>

              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Featured Events
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-400 sm:text-base">
                Find something exciting happening around you.
              </p>
            </div>

            <p className="text-sm text-slate-500">
              {loading
                ? "Loading events…"
                : `${filteredEvents.length} events to explore`}
            </p>

          </div>

          {/* CATEGORY FILTERS */}
          {!loading && !error && categories.length > 1 && (
            <div className="mt-9 flex flex-wrap gap-2.5">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full px-4 py-2.5 text-sm font-medium transition duration-200 ${
                    selectedCategory === category
                      ? "bg-violet-600 text-white shadow-md shadow-violet-950/40"
                      : "border border-white/[0.09] bg-white/[0.02] text-slate-400 hover:border-white/25 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}

          {/* LOADING */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-violet-400/30 border-t-blue-500" />

              <p className="mt-5 text-sm text-slate-400">
                Loading events...
              </p>
            </div>
          )}

          {/* ERROR */}
          {!loading && error && (
            <div className="mt-10 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-6 py-10 text-center text-sm text-red-300">
              {error}
            </div>
          )}

          {/* NO EVENTS */}
          {!loading && !error && filteredEvents.length === 0 && (
            <div className="mt-10 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center">

              <div className="text-4xl" aria-hidden="true">
                🎓
              </div>

              <h3 className="mt-5 text-xl font-semibold">
                No events found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                There are currently no events in this category. Please check
                another category later.
              </p>

            </div>
          )}

          {/* EVENT CARDS */}
          {!loading && !error && filteredEvents.length > 0 && (
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 xl:gap-7">

              {filteredEvents.map((event) => (
                <article
                  key={event._id}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1d1930] shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-1 hover:border-violet-400/40 hover:shadow-xl hover:shadow-violet-950/30"
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
                        <span
                          className="text-6xl opacity-80"
                          aria-hidden="true"
                        >
                          🎓
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

                    <span className="absolute left-4 top-4 rounded-full border border-white/[0.09] bg-[#100d1c]/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-200 backdrop-blur sm:text-xs">
                      {event.status || "UPCOMING"}
                    </span>

                  </div>

                  {/* EVENT DETAILS */}
                  <div className="flex flex-1 flex-col p-5 sm:p-6">

                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-300">
                      {event.category || "Featured event"}
                    </p>

                    <h3 className="mt-3 line-clamp-2 text-xl font-semibold leading-snug text-white">
                      {event.title}
                    </h3>

                    <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-slate-400">
                      {event.description}
                    </p>

                    <div className="mt-6 space-y-3 border-t border-white/[0.07] pt-5 text-sm text-slate-400">

                      <p className="flex items-start gap-3">
                        <span className="w-5 shrink-0 text-center" aria-hidden="true">
                          📅
                        </span>
                        <span>{formatDate(event.date)}</span>
                      </p>

                      <p className="flex items-start gap-3">
                        <span className="w-5 shrink-0 text-center" aria-hidden="true">
                          📍
                        </span>
                        <span className="line-clamp-1">
                          {event.location}
                        </span>
                      </p>

                      <p className="flex items-start gap-3">
                        <span className="w-5 shrink-0 text-center" aria-hidden="true">
                          👥
                        </span>
                        <span>Capacity: {event.capacity}</span>
                      </p>

                    </div>

                    <button
                      onClick={() => navigate(`/events/${event._id}`)}
                      className="mt-7 w-full rounded-xl border border-white/[0.09] bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-200 transition duration-200 hover:border-violet-400/50 hover:bg-violet-600 hover:text-white"
                    >
                      View Details <span aria-hidden="true">→</span>
                    </button>

                  </div>
                </article>
              ))}

            </div>
          )}

        </div>
      </section>

      {/* FOOTER */}
      <footer
        id="about"
        className="border-t border-white/[0.07] bg-[#100d1c] px-5 py-10 sm:px-8 lg:px-10"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Explore<span className="text-violet-400">X.</span>
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Discover. Connect. Experience.
            </p>
          </div>

          <p className="text-xs text-slate-600 sm:text-sm">
            © 2026 ExploreX. All rights reserved.
          </p>

        </div>
      </footer>

    </div>
  );
}

export default Home;