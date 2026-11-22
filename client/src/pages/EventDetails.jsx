import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "../services/api";

function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [posterError, setPosterError] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        setError("");
        setPosterError(false);
        const response = await API.get(`/events/${id}`);
        setEvent(response.data.event || response.data);
      } catch (err) {
        setError(
          err.response?.data?.message || "Unable to load event details."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setReviewsLoading(true);
        const response = await API.get(`/reviews/event/${id}`);

        setReviews(response.data.reviews || []);
        setAverageRating(response.data.averageRating || 0);
        setTotalReviews(response.data.totalReviews || 0);
      } catch (err) {
        console.error("Fetch event reviews error:", err);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [id]);

  const handleRegister = async () => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    if (!token) {
      navigate("/login");
      return;
    }

    if (user?.role !== "student") {
      setMessage("Only participant accounts can register for events.");
      return;
    }

    try {
      await API.post(`/registrations/${id}`);
      setMessage("Successfully registered for this event!");
    } catch (err) {
      setMessage(
        err.response?.data?.message || "Unable to register for this event."
      );
    }
  };

  const renderStars = (rating) => {
    const safeRating = Math.max(0, Math.min(5, rating || 0));

    return (
      <span
        className="tracking-wider text-amber-400"
        aria-label={`${safeRating} out of 5 stars`}
      >
        {"★".repeat(safeRating)}
        <span className="text-slate-700">{"★".repeat(5 - safeRating)}</span>
      </span>
    );
  };

  const ratingCounts = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((review) => review.rating === rating).length,
  }));

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#100d1c] text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-violet-400/20 border-t-violet-400" />
        <p className="mt-5 text-sm text-slate-400">Loading event details...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#100d1c] px-5 text-center text-white">
        <p className="text-red-300">{error || "Event not found."}</p>
        <button
          onClick={() => navigate("/events")}
          className="mt-6 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold transition hover:bg-violet-500"
        >
          Back to Events
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#100d1c] text-white">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#100d1c]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <Link to="/" className="text-2xl font-bold tracking-tight">
            Explore<span className="text-violet-400">X.</span>
          </Link>
          <Link
            to="/events"
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-violet-400/40 hover:bg-violet-500/[0.06] hover:text-white"
          >
            <span aria-hidden="true">← </span>Back to Events
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12 lg:px-10">
        {/* BREADCRUMB */}
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link to="/events" className="transition hover:text-violet-300">
            Events
          </Link>
          <span>/</span>
          <span className="max-w-[65vw] truncate text-slate-300">
            {event.title}
          </span>
        </div>

        {/* EVENT POSTER */}
        <div className="relative mb-8 overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#30234f] to-[#19152b]">
          {event.poster?.url && !posterError ? (
            <img
              src={event.poster.url}
              alt={`${event.title} poster`}
              onError={() => setPosterError(true)}
              className="max-h-[520px] min-h-56 w-full object-cover"
            />
          ) : (
            <div className="flex min-h-64 items-center justify-center sm:min-h-80">
              <div className="text-center">
                <span className="text-7xl text-violet-200/80" aria-hidden="true">
                  ✦
                </span>
                <p className="mt-4 text-lg font-semibold text-violet-100/70">
                  ExploreX
                </p>
              </div>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        {/* EVENT INFORMATION */}
        <section className="rounded-3xl border border-white/[0.08] bg-[#1d1930] p-6 shadow-xl shadow-black/10 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-violet-400/20 bg-violet-500/[0.10] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-violet-300">
              {event.category || "Featured event"}
            </span>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              {event.status}
            </span>
          </div>

          <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {event.title}
          </h1>

          <p className="mt-5 max-w-4xl whitespace-pre-wrap text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">
            {event.description || "No description available."}
          </p>

          <div className="mt-9 grid gap-4 border-t border-white/[0.08] pt-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/[0.06] bg-[#100d1c]/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Event date
              </p>
              <p className="mt-2 font-semibold text-slate-100">
                {new Date(event.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-[#100d1c]/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Location
              </p>
              <p className="mt-2 font-semibold text-slate-100">
                {event.location || "Not specified"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-[#100d1c]/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Capacity
              </p>
              <p className="mt-2 font-semibold text-slate-100">
                {event.capacity ?? "Not specified"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-[#100d1c]/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Event status
              </p>
              <p className="mt-2 font-semibold capitalize text-slate-100">
                {event.status || "Not specified"}
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-white/[0.08] pt-8">
            <button
              onClick={handleRegister}
              className="w-full rounded-xl bg-violet-600 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition duration-200 hover:-translate-y-0.5 hover:bg-violet-500 sm:w-auto sm:min-w-64"
            >
              Register for Event <span aria-hidden="true">→</span>
            </button>

            {message && (
              <p
                role="status"
                className="mt-4 rounded-xl border border-violet-400/20 bg-violet-500/[0.08] px-4 py-3 text-sm text-violet-200"
              >
                {message}
              </p>
            )}
          </div>
        </section>

        {/* EVENT REVIEWS */}
        <section className="mt-8 rounded-3xl border border-white/[0.08] bg-[#1d1930] p-6 sm:mt-10 sm:p-8 lg:p-10">
          <div className="flex flex-col justify-between gap-6 border-b border-white/[0.08] pb-7 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
                Community feedback
              </p>
              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                Reviews & ratings
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                See what participants thought about this experience.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#100d1c]/80 px-7 py-5 text-center">
              <p className="text-3xl font-bold text-white">
                {averageRating.toFixed(1)}
                <span className="text-lg text-slate-500">/5</span>
              </p>
              <div className="mt-1 text-xl">
                {renderStars(Math.round(averageRating))}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
              </p>
            </div>
          </div>

          {/* RATING DISTRIBUTION */}
          {totalReviews > 0 && (
            <div className="mt-7 max-w-xl space-y-3">
              {ratingCounts.map(({ rating, count }) => (
                <div key={rating} className="flex items-center gap-3 text-sm">
                  <span className="w-12 shrink-0 text-slate-400">
                    {rating} star
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{
                        width: `${totalReviews ? (count / totalReviews) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="w-6 text-right text-slate-500">{count}</span>
                </div>
              ))}
            </div>
          )}

          {/* REVIEWS LIST */}
          {reviewsLoading ? (
            <div className="mt-8 flex items-center gap-3 text-sm text-slate-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400/20 border-t-violet-400" />
              Loading reviews...
            </div>
          ) : reviews.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-white/15 bg-[#100d1c]/50 px-6 py-12 text-center">
              <div className="text-3xl" aria-hidden="true">✦</div>
              <p className="mt-4 text-lg font-semibold">No reviews yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                Be the first participant to share feedback after attending this event.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {reviews.map((review) => (
                <article
                  key={review._id}
                  className="rounded-2xl border border-white/[0.07] bg-[#100d1c]/65 p-5 transition hover:border-violet-400/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">
                        {review.user?.name || "Participant"}
                      </p>
                      <div className="mt-1 text-lg">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">
                      {review.createdAt
                        ? new Date(review.createdAt).toLocaleDateString("en-IN")
                        : ""}
                    </span>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                    {review.comment}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default EventDetails;
