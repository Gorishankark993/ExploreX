import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import API from "../services/api";

function StudentDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [registrations, setRegistrations] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewForms, setReviewForms] = useState({});
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [submittingReviewId, setSubmittingReviewId] = useState(null);
  const [deletingReviewId, setDeletingReviewId] = useState(null);
  const [selectedQR, setSelectedQR] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [reviewPanelId, setReviewPanelId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");

  const fetchMyEvents = async () => {
    try {
      setLoading(true);
      setError("");

      const [registrationResponse, reviewResponse] = await Promise.all([
        API.get("/registrations/my-events"),
        API.get("/reviews/my-reviews"),
      ]);

      const registrationData = Array.isArray(registrationResponse.data)
        ? registrationResponse.data
        : registrationResponse.data.registrations || [];
      const reviewData = reviewResponse.data.reviews || [];

      setRegistrations(registrationData);
      setReviews(reviewData);

      const forms = {};
      reviewData.forEach((review) => {
        if (review.event?._id) {
          forms[review.event._id] = {
            rating: String(review.rating),
            comment: review.comment || "",
          };
        }
      });
      setReviewForms((previous) => ({ ...previous, ...forms }));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load your registered events and reviews."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem("token") || user?.role !== "student") {
      navigate("/login");
      return;
    }
    fetchMyEvents();
  }, []);

  const attendedCount = registrations.filter(
    (registration) => registration.attendanceStatus === "attended"
  ).length;

  const upcomingCount = registrations.filter((registration) => {
    const date = new Date(registration.event?.date);
    return !Number.isNaN(date.getTime()) &&
      date >= new Date() &&
      registration.attendanceStatus !== "attended";
  }).length;

  const filteredRegistrations = useMemo(() => {
    return registrations.filter((registration) => {
      const attended = registration.attendanceStatus === "attended";
      const eventDate = new Date(registration.event?.date);
      const upcoming = !Number.isNaN(eventDate.getTime()) &&
        eventDate >= new Date() && !attended;

      if (activeFilter === "Upcoming") return upcoming;
      if (activeFilter === "Attended") return attended;
      return true;
    });
  }, [registrations, activeFilter]);

  const updateReviewForm = (eventId, field, value) => {
    setReviewForms((previous) => ({
      ...previous,
      [eventId]: {
        rating: previous[eventId]?.rating || "5",
        comment: previous[eventId]?.comment || "",
        [field]: value,
      },
    }));
  };

  const handleReviewSubmit = async (eventId) => {
    const form = reviewForms[eventId] || {};
    const rating = Number(form.rating);
    const comment = (form.comment || "").trim();
    const existingReview = reviews.find(
      (review) => review.event?._id === eventId
    );

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setError("Please select a rating between 1 and 5 stars.");
      return;
    }
    if (comment.length < 3 || comment.length > 1000) {
      setError("Your review must be between 3 and 1000 characters.");
      return;
    }

    try {
      setSubmittingReviewId(eventId);
      setError("");
      setSuccess("");

      if (existingReview) {
        await API.put(`/reviews/${existingReview._id}`, { rating, comment });
        setSuccess("Your review has been updated successfully.");
      } else {
        await API.post(`/reviews/${eventId}`, { rating, comment });
        setSuccess("Your review has been submitted successfully.");
      }

      setEditingReviewId(null);
      setReviewPanelId(null);
      await fetchMyEvents();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to submit your review.");
    } finally {
      setSubmittingReviewId(null);
    }
  };

  const handleDeleteReview = async (review) => {
    if (!window.confirm("Are you sure you want to delete your review?")) return;

    try {
      setDeletingReviewId(review._id);
      setError("");
      setSuccess("");
      await API.delete(`/reviews/${review._id}`);
      setReviews((previous) => previous.filter((item) => item._id !== review._id));
      setReviewForms((previous) => ({
        ...previous,
        [review.event?._id]: { rating: "5", comment: "" },
      }));
      setEditingReviewId(null);
      setSuccess("Your review has been deleted.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete your review.");
    } finally {
      setDeletingReviewId(null);
    }
  };

  const handleCancelRegistration = async () => {
    if (!cancelTarget) return;
    const eventId = cancelTarget._id;

    try {
      setCancellingId(eventId);
      setError("");
      setSuccess("");
      const response = await API.delete(`/registrations/${eventId}`);

      setRegistrations((previous) =>
        previous.filter((registration) => registration.event?._id !== eventId)
      );
      setSelectedQR(null);
      setCancelTarget(null);
      setSuccess(response.data.message || "Registration cancelled successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to cancel registration.");
      setCancelTarget(null);
    } finally {
      setCancellingId(null);
    }
  };

  const downloadQRCode = (eventTitle) => {
    const svg = document.getElementById("student-event-qr");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const image = new Image();
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    image.onload = () => {
      canvas.width = 500;
      canvas.height = 500;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, 500, 500);
      context.drawImage(image, 0, 0, 500, 500);
      const link = document.createElement("a");
      link.download = `${eventTitle.replace(/[^a-z0-9]/gi, "_")}_QR.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      URL.revokeObjectURL(url);
    };

    image.onerror = () => {
      setError("Unable to download QR code.");
      URL.revokeObjectURL(url);
    };
    image.src = url;
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete API.defaults.headers.common["Authorization"];
    navigate("/login");
  };

  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "Date to be announced"
      : date.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  };

  const isUpcoming = (event) => {
    const date = new Date(event?.date);
    return !Number.isNaN(date.getTime()) && date >= new Date();
  };

  return (
    <div className="min-h-screen bg-[#100d1c] text-white">
      <nav className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#100d1c]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <button onClick={() => navigate("/")} className="text-2xl font-extrabold tracking-tight">
            Explore<span className="text-violet-400">X.</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate("/events")}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-violet-500"
            >
              + Browse Events
            </button>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-red-400/40 hover:text-red-300"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9">
        <section className="relative overflow-hidden rounded-3xl border border-violet-400/15 bg-gradient-to-br from-[#2b2145] via-[#211a35] to-[#171326] p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full border border-violet-300/10" />
          <div className="pointer-events-none absolute -right-2 -top-14 h-44 w-44 rounded-full border border-violet-300/10" />
          <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
                Your ExploreX space
              </p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : " back"}!
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                Your events, entry passes and memories — all in one place.
              </p>
            </div>
            <button
              onClick={() => navigate("/events")}
              className="shrink-0 rounded-xl border border-violet-300/25 bg-violet-500/10 px-5 py-3 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20"
            >
              Discover your next event <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>

        {success && (
          <div role="status" className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
            <span>✓ {success}</span>
            <button onClick={() => setSuccess("")} aria-label="Dismiss notification" className="text-lg">×</button>
          </div>
        )}
        {error && (
          <div role="alert" className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Dismiss error" className="text-lg">×</button>
          </div>
        )}

        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Registered events", value: registrations.length, icon: "▣", tone: "text-violet-300", detail: "Your event passes" },
            { label: "Events attended", value: attendedCount, icon: "✓", tone: "text-emerald-300", detail: "Attendance verified" },
            { label: "Upcoming events", value: upcomingCount, icon: "◷", tone: "text-sky-300", detail: "Still ahead" },
            { label: "Feedback submitted", value: reviews.length, icon: "★", tone: "text-amber-300", detail: "Your event reviews" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/[0.08] bg-[#1d1930] p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 sm:text-sm">{stat.label}</span>
                <span className={`text-xl ${stat.tone}`}>{stat.icon}</span>
              </div>
              <p className={`mt-3 text-3xl font-extrabold ${stat.tone}`}>{stat.value}</p>
              <p className="mt-1 text-xs text-slate-500">{stat.detail}</p>
            </div>
          ))}
        </section>

        <section className="mt-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">Your schedule</p>
              <h2 className="mt-1 text-2xl font-bold">My registered events</h2>
              <p className="mt-1 text-sm text-slate-400">Manage your bookings and access your event QR passes.</p>
            </div>
            <div className="flex rounded-xl border border-white/10 bg-[#1a1628] p-1">
              {["All", "Upcoming", "Attended"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                    activeFilter === filter
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-950/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((item) => (
                <div key={item} className="h-52 animate-pulse rounded-2xl border border-white/5 bg-[#1d1930]" />
              ))}
            </div>
          )}

          {!loading && filteredRegistrations.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 bg-[#1d1930]/70 px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-2xl text-violet-300">✦</div>
              <h3 className="mt-4 text-lg font-bold">
                {registrations.length === 0 ? "Your next experience starts here" : `No ${activeFilter.toLowerCase()} events`}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                {registrations.length === 0
                  ? "You haven't registered for an event yet. Explore the listings and find something you would love to attend."
                  : "Try another filter to see your registered events."}
              </p>
              {registrations.length === 0 && (
                <button onClick={() => navigate("/events")} className="mt-5 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold hover:bg-violet-500">
                  Explore Events
                </button>
              )}
            </div>
          )}

          {!loading && filteredRegistrations.length > 0 && (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredRegistrations.map((registration) => {
                const event = registration.event;
                if (!event) return null;

                const attended = registration.attendanceStatus === "attended";
                const upcoming = isUpcoming(event) && !attended;
                const existingReview = reviews.find((review) => review.event?._id === event._id);
                const form = reviewForms[event._id] || { rating: "5", comment: "" };
                const isEditing = editingReviewId === event._id;
                const qrOpen = selectedQR === registration._id;
                const feedbackOpen = reviewPanelId === event._id;

                return (
                  <article key={registration._id} className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#1d1930] transition hover:border-violet-400/30">
                    <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
                      <div className="min-w-0">
                        <span className="inline-flex rounded-full border border-violet-300/20 bg-violet-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-200">
                          {event.category || "Event"}
                        </span>
                        <h3 className="mt-2 break-words text-lg font-bold leading-snug">{event.title}</h3>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        attended
                          ? "bg-emerald-400/10 text-emerald-300"
                          : upcoming
                            ? "bg-sky-400/10 text-sky-300"
                            : "bg-amber-400/10 text-amber-300"
                      }`}>
                        {attended ? "ATTENDED" : upcoming ? "UPCOMING" : "REGISTERED"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 px-5 py-4">
                      <div className="rounded-xl bg-[#141020] p-3">
                        <p className="text-[11px] uppercase tracking-wider text-slate-500">Date</p>
                        <p className="mt-1 text-sm font-semibold text-slate-200">{formatDate(event.date)}</p>
                      </div>
                      <div className="rounded-xl bg-[#141020] p-3">
                        <p className="text-[11px] uppercase tracking-wider text-slate-500">Attendance</p>
                        <p className={`mt-1 text-sm font-semibold ${attended ? "text-emerald-300" : "text-amber-300"}`}>
                          {attended ? "✓ Verified" : "Not marked"}
                        </p>
                      </div>
                      <div className="col-span-2 flex items-center gap-2 text-sm text-slate-400">
                        <span className="text-violet-300">⌖</span>
                        <span className="truncate">{event.location || "Location to be announced"}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 px-5 pb-5">
                      {registration.qrToken && (
                        <button
                          onClick={() => setSelectedQR(qrOpen ? null : registration._id)}
                          className="flex-1 rounded-xl bg-violet-600 px-3 py-2.5 text-sm font-semibold transition hover:bg-violet-500"
                        >
                          {qrOpen ? "Hide entry pass" : "View entry QR"}
                        </button>
                      )}
                      {attended && (
                        <button
                          onClick={() => setReviewPanelId(feedbackOpen ? null : event._id)}
                          className="flex-1 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-300/15"
                        >
                          {feedbackOpen ? "Hide feedback" : existingReview ? "View / edit review" : "Leave feedback"}
                        </button>
                      )}
                      {!attended && (
                        <button
                          onClick={() => setCancelTarget({ _id: event._id, title: event.title })}
                          disabled={cancellingId === event._id}
                          className="rounded-xl border border-red-400/20 px-3 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-400/10 disabled:opacity-50"
                        >
                          {cancellingId === event._id ? "Cancelling..." : "Cancel"}
                        </button>
                      )}
                    </div>

                    {qrOpen && registration.qrToken && (
                      <div className="border-t border-white/[0.07] bg-[#171326] p-5">
                        <div className="mx-auto max-w-xs rounded-2xl bg-white p-4 text-center">
                          <QRCodeSVG id="student-event-qr" value={registration.qrToken} size={180} level="H" includeMargin />
                          <p className="mt-3 text-sm font-bold text-slate-900">Your event entry pass</p>
                          <p className="mt-1 text-xs text-slate-600">Show this QR code to the event organizer.</p>
                          <button onClick={() => downloadQRCode(event.title)} className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-500">
                            Download QR
                          </button>
                        </div>
                      </div>
                    )}

                    {feedbackOpen && attended && (
                      <div className="border-t border-white/[0.07] bg-[#171326] p-5">
                        <div className="mb-4 flex items-center justify-between">
                          <h4 className="font-bold">Event feedback</h4>
                          <span className="text-xs text-slate-500">Your experience matters</span>
                        </div>
                        {existingReview && !isEditing ? (
                          <div className="rounded-xl border border-white/10 bg-[#100d1c] p-4">
                            <p className="text-xl text-amber-300">
                              {"★".repeat(existingReview.rating)}
                              <span className="text-slate-700">{"★".repeat(5 - existingReview.rating)}</span>
                            </p>
                            <p className="mt-2 break-words text-sm text-slate-300">{existingReview.comment}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button onClick={() => setEditingReviewId(event._id)} className="rounded-lg border border-violet-400/30 px-4 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-500/10">
                                Edit review
                              </button>
                              <button
                                onClick={() => handleDeleteReview(existingReview)}
                                disabled={deletingReviewId === existingReview._id}
                                className="rounded-lg border border-red-400/30 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                              >
                                {deletingReviewId === existingReview._id ? "Deleting..." : "Delete review"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <label className="block text-xs font-semibold text-slate-400">Your rating</label>
                            <select
                              value={form.rating}
                              onChange={(e) => updateReviewForm(event._id, "rating", e.target.value)}
                              className="w-full rounded-xl border border-white/10 bg-[#100d1c] px-3 py-3 text-sm text-white outline-none focus:border-violet-400"
                            >
                              <option value="5">★★★★★ — Excellent</option>
                              <option value="4">★★★★ — Very good</option>
                              <option value="3">★★★ — Good</option>
                              <option value="2">★★ — Fair</option>
                              <option value="1">★ — Poor</option>
                            </select>
                            <label className="block text-xs font-semibold text-slate-400">Your feedback</label>
                            <textarea
                              value={form.comment}
                              onChange={(e) => updateReviewForm(event._id, "comment", e.target.value)}
                              rows={3}
                              maxLength={1000}
                              placeholder="Share what you liked about the event..."
                              className="w-full resize-y rounded-xl border border-white/10 bg-[#100d1c] px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400"
                            />
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs text-slate-500">{form.comment.length}/1000</span>
                              <button
                                onClick={() => handleReviewSubmit(event._id)}
                                disabled={submittingReviewId === event._id}
                                className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50"
                              >
                                {submittingReviewId === event._id ? "Saving..." : existingReview ? "Update review" : "Submit review"}
                              </button>
                            </div>
                            {existingReview && (
                              <button onClick={() => setEditingReviewId(null)} className="text-xs text-slate-400 hover:text-white">
                                Cancel editing
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" onClick={() => setCancelTarget(null)}>
          <div className="w-full max-w-md rounded-2xl border border-red-400/20 bg-[#1d1930] p-6 shadow-2xl shadow-black/40" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-400/10 text-xl text-red-300">!</div>
            <h3 className="mt-4 text-xl font-bold">Cancel this registration?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              You are about to cancel your registration for <span className="font-semibold text-white">{cancelTarget.title}</span>. You can register again later if seats are available.
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setCancelTarget(null)} className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5">
                Keep registration
              </button>
              <button onClick={handleCancelRegistration} disabled={Boolean(cancellingId)} className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50">
                {cancellingId ? "Cancelling..." : "Yes, cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;
