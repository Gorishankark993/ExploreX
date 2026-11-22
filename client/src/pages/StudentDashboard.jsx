import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import API from "../services/api";

function StudentDashboard() {
  const navigate = useNavigate();

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
  const [cancelConfirmationEventId, setCancelConfirmationEventId] = useState(null);

  // Fetch registrations and reviews
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

      // Pre-fill form state for existing reviews
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
    fetchMyEvents();
  }, []);

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

  // Submit or update a review
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

      let response;
      if (existingReview) {
        response = await API.put(`/reviews/${existingReview._id}`, {
          rating,
          comment,
        });
        setSuccess("Your review has been updated successfully.");
      } else {
        response = await API.post(`/reviews/${eventId}`, {
          rating,
          comment,
        });
        setSuccess("Your review has been submitted successfully.");
      }

      setEditingReviewId(null);
      await fetchMyEvents();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to submit your review."
      );
    } finally {
      setSubmittingReviewId(null);
    }
  };

  // Delete own review
  const handleDeleteReview = async (review) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your review?"
    );
    if (!confirmed) return;

    try {
      setDeletingReviewId(review._id);
      setError("");
      setSuccess("");

      await API.delete(`/reviews/${review._id}`);
      setReviews((previous) =>
        previous.filter((item) => item._id !== review._id)
      );
      setReviewForms((previous) => ({
        ...previous,
        [review.event?._id]: { rating: "5", comment: "" },
      }));
      setEditingReviewId(null);
      setSuccess("Your review has been deleted.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to delete your review."
      );
    } finally {
      setDeletingReviewId(null);
    }
  };

  // Cancel event registration
  const handleCancelRegistration = async (eventId) => {
    try {
      setCancellingId(eventId);
      setError("");
      setSuccess("");

      const response = await API.delete(`/registrations/${eventId}`);

      setRegistrations((previousRegistrations) =>
        previousRegistrations.filter(
          (registration) => registration.event?._id !== eventId
        )
      );

      setSelectedQR(null);
      setCancelConfirmationEventId(null);
      setSuccess(
        response.data.message || "Registration cancelled successfully."
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to cancel registration."
      );
    } finally {
      setCancellingId(null);
    }
  };

  // Download QR code
  const downloadQRCode = (eventTitle) => {
    const svg = document.getElementById("student-event-qr");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const image = new Image();
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
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

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete API.defaults.headers.common["Authorization"];
    navigate("/login");
  };

  const attendedCount = registrations.filter(
    (registration) => registration.attendanceStatus === "attended"
  ).length;

  return (
    <div className="min-h-screen bg-[#100d1c] text-white">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#100d1c]/90 px-5 py-4 backdrop-blur-xl sm:px-8 lg:px-10">
        <h1 className="text-2xl font-bold text-violet-300">ExploreX</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/events")}
            className="rounded-lg bg-violet-600 px-4 py-2 transition hover:bg-violet-500"
          >
            Browse Events
          </button>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-white/10 px-4 py-2 transition hover:bg-slate-800"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-12 lg:px-10">
        <div className="rounded-3xl border border-violet-400/15 bg-gradient-to-br from-[#292044] via-[#211a35] to-[#171326] px-6 py-8 sm:px-9 sm:py-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">Your ExploreX activity</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Participant Dashboard</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300/80">
            Keep track of your registered events, attendance and feedback.
          </p>
        </div>

        {success && (
          <div className="mt-6 rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-green-400">
            {success}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        )}

        {/* STATISTICS */}
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.08] bg-[#1d1930] p-6">
            <p className="text-slate-400">Total Registered Events</p>
            <p className="mt-2 text-4xl font-bold text-violet-300">
              {registrations.length}
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#1d1930] p-6">
            <p className="text-slate-400">Events Attended</p>
            <p className="mt-2 text-4xl font-bold text-green-400">
              {attendedCount}
            </p>
          </div>
        </div>

        {/* REGISTERED EVENTS */}
        <h3 className="mb-5 mt-10 text-2xl font-semibold">
          My Registered Events
        </h3>

        {loading && <p className="text-slate-400">Loading your events...</p>}

        {!loading && !error && registrations.length === 0 && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#1d1930] p-8 text-center">
            <p className="text-lg">
              You haven't registered for any events yet.
            </p>
            <button
              onClick={() => navigate("/events")}
              className="mt-4 rounded-lg bg-violet-600 px-5 py-2 transition hover:bg-violet-500"
            >
              Explore Events
            </button>
          </div>
        )}

        {!loading && registrations.length > 0 && (
          <div className="grid grid-cols-1 gap-6">
            {registrations.map((registration) => {
              const event = registration.event;
              if (!event) return null;

              const attended = registration.attendanceStatus === "attended";
              const existingReview = reviews.find(
                (review) => review.event?._id === event._id
              );
              const form = reviewForms[event._id] || {
                rating: "5",
                comment: "",
              };
              const isEditing = editingReviewId === event._id;

              return (
                <div
                  key={registration._id}
                  className="grid gap-6 rounded-2xl border border-white/[0.08] bg-[#1d1930] p-6 transition hover:border-violet-400/40 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8"
                >
                  <div className="min-w-0">
                  <h4 className="text-xl font-bold">{event.title}</h4>
                  <p className="mt-3 text-sm text-slate-400">
                    Category: {event.category}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Date: {new Date(event.date).toLocaleDateString("en-IN")}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Location: {event.location}
                  </p>
                  <p className="mt-4 text-sm text-green-400">
                    ✓ Registration Confirmed
                  </p>

                  {/* ATTENDANCE STATUS */}
                  <div
                    className={`mt-4 rounded-lg border p-3 text-center ${
                      attended
                        ? "border-green-500/30 bg-green-500/10 text-green-400"
                        : "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                    }`}
                  >
                    <p className="text-sm font-semibold">
                      {attended
                        ? "✓ Attendance Marked"
                        : "Attendance: Not Marked"}
                    </p>
                    {attended && registration.attendedAt && (
                      <p className="mt-1 text-xs">
                        {new Date(registration.attendedAt).toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>

                  {/* QR CODE */}
                  {registration.qrToken && (
                    <button
                      onClick={() =>
                        setSelectedQR(
                          selectedQR === registration._id ? null : registration._id
                        )
                      }
                      className="mt-5 w-full rounded-lg bg-violet-600 py-3 font-semibold transition hover:bg-violet-500"
                    >
                      {selectedQR === registration._id
                        ? "Hide QR Code"
                        : "View My QR Code"}
                    </button>
                  )}

                  {selectedQR === registration._id && registration.qrToken && (
                    <div className="mt-5 rounded-lg bg-white p-4 text-center">
                      <QRCodeSVG
                        id="student-event-qr"
                        value={registration.qrToken}
                        size={180}
                        level="H"
                        includeMargin
                      />
                      <p className="mt-3 text-sm font-semibold text-slate-900">
                        Your Event Entry QR Code
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        Show this code to the event organizer.
                      </p>
                      <button
                        onClick={() => downloadQRCode(event.title)}
                        className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
                      >
                        Download QR Code
                      </button>
                    </div>
                  )}

                  {!registration.qrToken && (
                    <p className="mt-4 text-sm text-yellow-400">
                      QR code unavailable. Please refresh or contact the organizer.
                    </p>
                  )}

                  {/* CANCEL REGISTRATION */}
                  {!attended && (
                    <button
                      onClick={() => setCancelConfirmationEventId(event._id)}
                      disabled={cancellingId === event._id}
                      className="mt-5 w-full rounded-lg border border-red-500/30 py-3 font-semibold text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {cancellingId === event._id
                        ? "Cancelling..."
                        : "Cancel Registration"}
                    </button>
                  )}
                  </div>

                  {/* REVIEW PANEL — SIDE BY SIDE ON DESKTOP */}
                  <div className="min-w-0 lg:border-l lg:border-white/[0.08] lg:pl-8">
                  {attended && (
                    <div className="h-full lg:pt-1">
                      <h5 className="text-lg font-semibold">Event Feedback</h5>

                      {existingReview && !isEditing ? (
                        <div className="mt-3 rounded-lg border border-white/[0.08] bg-[#100d1c] p-4">
                          <p className="text-xl text-yellow-400">
                            {"★".repeat(existingReview.rating)}
                            <span className="text-slate-600">
                              {"★".repeat(5 - existingReview.rating)}
                            </span>
                          </p>
                          <p className="mt-2 break-words text-sm text-slate-300">
                            {existingReview.comment}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            Your review
                          </p>
                          <div className="mt-4 flex gap-2">
                            <button
                              onClick={() => setEditingReviewId(event._id)}
                              className="flex-1 rounded-lg border border-violet-400/40 py-2 text-sm text-violet-300 hover:bg-violet-500/10"
                            >
                              Edit Review
                            </button>
                            <button
                              onClick={() => handleDeleteReview(existingReview)}
                              disabled={deletingReviewId === existingReview._id}
                              className="flex-1 rounded-lg border border-red-500/40 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                            >
                              {deletingReviewId === existingReview._id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 space-y-3">
                          <label className="block text-sm text-slate-400">
                            Your rating
                          </label>
                          <select
                            value={form.rating}
                            onChange={(e) =>
                              updateReviewForm(event._id, "rating", e.target.value)
                            }
                            className="w-full rounded-lg border border-white/[0.08] bg-[#100d1c] px-3 py-3 text-white outline-none focus:border-violet-400"
                          >
                            <option value="5">★★★★★ — Excellent</option>
                            <option value="4">★★★★ — Very good</option>
                            <option value="3">★★★ — Good</option>
                            <option value="2">★★ — Fair</option>
                            <option value="1">★ — Poor</option>
                          </select>

                          <label className="block text-sm text-slate-400">
                            Your feedback
                          </label>
                          <textarea
                            value={form.comment}
                            onChange={(e) =>
                              updateReviewForm(event._id, "comment", e.target.value)
                            }
                            rows={4}
                            maxLength={1000}
                            placeholder="Share your experience..."
                            className="w-full resize-y rounded-lg border border-white/[0.08] bg-[#100d1c] px-3 py-3 text-white outline-none placeholder:text-slate-500 focus:border-violet-400"
                          />
                          <p className="text-right text-xs text-slate-500">
                            {form.comment.length}/1000 characters
                          </p>
                          <button
                            onClick={() => handleReviewSubmit(event._id)}
                            disabled={submittingReviewId === event._id}
                            className="w-full rounded-lg bg-violet-600 py-3 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {submittingReviewId === event._id
                              ? "Saving..."
                              : existingReview
                                ? "Update Review"
                                : "Submit Review"}
                          </button>
                          {existingReview && (
                            <button
                              onClick={() => setEditingReviewId(null)}
                              className="w-full rounded-lg border border-white/[0.08] py-2 text-sm text-slate-300 hover:bg-slate-800"
                            >
                              Cancel Editing
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!attended && (
                    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/[0.08] p-6 text-center">
                      <p className="text-sm text-slate-400">
                        Event feedback will be available after your attendance is marked.
                      </p>
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* CUSTOM CANCEL REGISTRATION MODAL */}
      {cancelConfirmationEventId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && cancellingId !== cancelConfirmationEventId) {
              setCancelConfirmationEventId(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-registration-title"
            className="w-full max-w-md rounded-2xl border border-violet-400/20 bg-[#1d1930] p-6 shadow-2xl shadow-black/40"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-red-400/20 bg-red-500/10 text-2xl text-red-400">
              !
            </div>

            <h3 id="cancel-registration-title" className="text-xl font-bold text-white">
              Cancel Registration?
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              Are you sure you want to cancel your registration for{" "}
              <span className="font-semibold text-violet-300">
                {registrations.find(
                  (item) => item.event?._id === cancelConfirmationEventId
                )?.event?.title || "this event"}
              </span>
              ? You may need to register again if you change your mind.
            </p>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCancelConfirmationEventId(null)}
                disabled={cancellingId === cancelConfirmationEventId}
                className="rounded-lg border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Keep Registration
              </button>

              <button
                type="button"
                onClick={() => handleCancelRegistration(cancelConfirmationEventId)}
                disabled={cancellingId === cancelConfirmationEventId}
                className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancellingId === cancelConfirmationEventId ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;
