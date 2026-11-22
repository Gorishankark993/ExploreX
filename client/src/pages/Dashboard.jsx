import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { Html5Qrcode } from "html5-qrcode";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

function Dashboard() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingEventId, setEditingEventId] = useState(null);

  // Registration states
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [registrationLoading, setRegistrationLoading] = useState(false);

  // QR attendance scanner states
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [scanError, setScanError] = useState("");
  const [scanProcessing, setScanProcessing] = useState(false);
  const scannerRef = useRef(null);
  const processingRef = useRef(false);

  // Analytics states
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    date: "",
    location: "",
    capacity: "",
  });

  // Event poster upload state
  const [posterFile, setPosterFile] = useState(null);
  const [posterPreview, setPosterPreview] = useState("");

  // Attach JWT to API requests
  API.defaults.headers.common["Authorization"] =
    `Bearer ${localStorage.getItem("token")}`;

  // Fetch organizer's events
  const fetchEvents = async () => {
    try {
      const response = await API.get("/events");

      const data = Array.isArray(response.data)
        ? response.data
        : response.data.events || [];

      setEvents(
        data.filter(
          (event) =>
            event.organizer?._id === user?.id ||
            event.organizer?._id === user?._id ||
            event.organizer === user?.id ||
            event.organizer === user?._id
        )
      );
    } catch (err) {
      console.error(err);
      setError("Unable to fetch events.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch organizer analytics
  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError("");

      const response = await API.get("/events/analytics/overview");

      setAnalytics(response.data);
    } catch (err) {
      console.error("Analytics error:", err);
      setAnalyticsError(
        err.response?.data?.message || "Unable to load analytics."
      );
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Initial loading
  useEffect(() => {
    if (!localStorage.getItem("token") || !user) {
      navigate("/login");
      return;
    }

    if (user.role !== "organizer") {
      navigate("/");
      return;
    }

    fetchEvents();
    fetchAnalytics();
  }, []);

  // Open the QR scanner panel
  const openScanner = () => {
    setScanMessage("");
    setScanError("");
    setScannerOpen(true);
  };

  // Start and stop the camera when the scanner panel opens/closes
  useEffect(() => {
    if (!scannerOpen) return;

    let scanner;
    let cancelled = false;

    const startScanner = async () => {
      try {
        // Wait for the scanner container to be rendered.
        await new Promise((resolve) => setTimeout(resolve, 150));
        if (cancelled) return;

        scanner = new Html5Qrcode("attendance-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            if (processingRef.current) return;
            processingRef.current = true;
            setScanProcessing(true);
            setScanMessage("");
            setScanError("");

            try {
              await scanner.stop();
              const response = await API.post("/registrations/attendance/scan", {
                qrToken: decodedText,
              });
              setScanMessage(
                `${response.data.message}: ${response.data.student?.name || "Participant"} — ${response.data.event}`
              );
              await fetchAnalytics();
              if (selectedEvent) {
                const registrationsResponse = await API.get(
                  `/registrations/event/${selectedEvent._id}`
                );
                setRegistrations(registrationsResponse.data.registrations || []);
              }
            } catch (err) {
              setScanError(
                err.response?.data?.message ||
                  "Unable to verify this QR code. Please try again."
              );
              // Close the scanner after an unsuccessful scan; the organizer can reopen it.
              setScannerOpen(false);
            } finally {
              setScanProcessing(false);
              processingRef.current = false;
            }
          },
          () => {}
        );
      } catch (err) {
        console.error("QR scanner start error:", err);
        setScanError(
          "Unable to access the camera. Allow camera permission and use localhost or HTTPS."
        );
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      const activeScanner = scannerRef.current;
      if (activeScanner?.isScanning) {
        activeScanner.stop().catch((err) =>
          console.error("QR scanner stop error:", err)
        );
      }
      scannerRef.current = null;
    };
  }, [scannerOpen]);

  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "",
      date: "",
      location: "",
      capacity: "",
    });

    setEditingEventId(null);
    setPosterFile(null);
    setPosterPreview("");
    setShowForm(false);
  };

  // Handle form inputs
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Select an event poster and show its preview
  const handlePosterChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Poster image must be 5 MB or smaller.");
      e.target.value = "";
      return;
    }

    setError("");
    setPosterFile(file);
    setPosterPreview(URL.createObjectURL(file));
  };

  // Create or update event
  const handleSubmitEvent = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const eventData = new FormData();
    eventData.append("title", formData.title);
    eventData.append("description", formData.description);
    eventData.append("category", formData.category);
    eventData.append("date", formData.date);
    eventData.append("location", formData.location);
    eventData.append("capacity", String(Number(formData.capacity)));

    if (posterFile) {
      eventData.append("poster", posterFile);
    }

    try {
      if (editingEventId) {
        await API.put(`/events/${editingEventId}`, eventData);
        setSuccess("Event updated successfully!");
      } else {
        await API.post("/events", eventData);
        setSuccess("Event created successfully!");
      }

      resetForm();

      await fetchEvents();
      await fetchAnalytics();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (editingEventId
            ? "Unable to update event."
            : "Unable to create event.")
      );
    }
  };

  // Start editing an event
  const handleEdit = (event) => {
    setEditingEventId(event._id);

    setFormData({
      title: event.title || "",
      description: event.description || "",
      category: event.category || "",
      date: event.date
        ? new Date(event.date).toISOString().split("T")[0]
        : "",
      location: event.location || "",
      capacity: event.capacity || "",
    });

    setPosterFile(null);
    setPosterPreview(event.poster?.url || "");
    setShowForm(true);
    setError("");
    setSuccess("");

    // Wait for the edit form to render, then bring it into view.
    setTimeout(() => {
      document
        .getElementById("event-form-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 150);
  };

  // Fetch registrations for an event
  const handleViewRegistrations = async (event) => {
    try {
      setRegistrationLoading(true);
      setSelectedEvent(event);
      setRegistrations([]);
      setError("");

      const response = await API.get(
        `/registrations/event/${event._id}`
      );

      setRegistrations(response.data.registrations || []);

      setTimeout(() => {
        document
          .getElementById("registrations-section")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      console.error("Fetch registrations error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to fetch event registrations."
      );

      setSelectedEvent(null);
    } finally {
      setRegistrationLoading(false);
    }
  };

  // Close registrations section
  const closeRegistrations = () => {
    setSelectedEvent(null);
    setRegistrations([]);
  };

  // Delete event
  const handleDelete = async (eventId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this event?"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      // Delete the event from the backend
      await API.delete(`/events/${eventId}`);

      // Immediately remove the deleted event from the UI
      setEvents((previousEvents) =>
        previousEvents.filter((event) => event._id !== eventId)
      );

      // Close the registrations panel if it belongs to this event
      if (selectedEvent?._id === eventId) {
        closeRegistrations();
      }

      setSuccess("Event deleted successfully!");

      // Refresh analytics after deletion
      await fetchAnalytics();
    } catch (err) {
      console.error("Delete event error:", err);
      setError(
        err.response?.data?.message ||
          "Unable to delete event. Please try again."
      );
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    delete API.defaults.headers.common["Authorization"];

    navigate("/login");
  };

  const publishedEvents = events.filter(
    (event) => event.status === "published"
  );

  const draftEvents = events.filter(
    (event) => event.status === "draft"
  );

  return (
    <div className="min-h-screen bg-[#100d1c] text-white">

      {/* NAVBAR */}
      <nav className="border-b border-white/10 bg-[#151126]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">

          <h1 className="text-2xl font-bold">
            Explore<span className="text-violet-300">X</span>
          </h1>

          <div className="flex items-center gap-5">

            <div className="hidden text-right sm:block">
              <p className="font-semibold">{user?.name}</p>
              <p className="text-xs text-[#a99fbd]">Organizer</p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm transition hover:bg-red-500/10 hover:text-red-400"
            >
              Logout
            </button>

          </div>
        </div>
      </nav>

      {/* DASHBOARD QUICK NAVIGATION */}
      <div className="sticky top-0 z-40 border-b border-white/10 bg-[#100d1c]/95 shadow-lg shadow-black/10 backdrop-blur-xl">
        <nav
          aria-label="Organizer dashboard sections"
          className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-6 py-3"
        >
          <button
            onClick={() => document.getElementById("dashboard-overview")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-[#d8d0e7] transition hover:bg-white/10 hover:text-white"
          >
            Overview
          </button>
          <button
            onClick={() => document.getElementById("analytics-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-[#d8d0e7] transition hover:bg-white/10 hover:text-white"
          >
            Analytics & Graphs
          </button>
          <button
            onClick={() => {
              if (!showForm) {
                setShowForm(true);
                setEditingEventId(null);
              }
              setTimeout(() => {
                document.getElementById("event-form-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 150);
            }}
            className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-[#d8d0e7] transition hover:bg-white/10 hover:text-white"
          >
            Create Event
          </button>
          <button
            onClick={() => document.getElementById("events-list-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-[#d8d0e7] transition hover:bg-white/10 hover:text-white"
          >
            Your Events
          </button>
          <button
            disabled={!selectedEvent}
            onClick={() => document.getElementById("registrations-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-[#d8d0e7] transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            Registrations
          </button>
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:py-12">

        {/* HEADER */}
        <div id="dashboard-overview" className="scroll-mt-24 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
              Organizer Panel
            </p>

            <h2 className="mt-2 text-4xl font-bold">
              Dashboard
            </h2>

            <p className="mt-3 text-[#a99fbd]">
              Create events, manage registrations and track attendance — all in one place.
            </p>
          </div>

          <button
            onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                setShowForm(true);
                setEditingEventId(null);

                // Wait for the form to render, then scroll it into view.
                setTimeout(() => {
                  document
                    .getElementById("event-form-section")
                    ?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                }, 150);
              }
            }}
            className="rounded-xl bg-violet-600 px-6 py-3 font-semibold transition hover:bg-violet-400"
          >
            {showForm ? "Close Form" : "+ Create New Event"}
          </button>

          <button
            onClick={openScanner}
            className="rounded-xl border border-green-500/30 bg-green-500/10 px-6 py-3 font-semibold text-green-400 transition hover:bg-green-500/20"
          >
            Scan Attendance QR
          </button>

        </div>

        {/* QR ATTENDANCE SCANNER */}
        {(scannerOpen || scanMessage || scanError) && (
          <section className="mt-8 rounded-2xl border border-white/10 bg-[#1d1930] p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-green-400">
                  Attendance Management
                </p>
                <h3 className="mt-2 text-2xl font-bold">QR Code Scanner</h3>
                <p className="mt-2 text-sm text-[#a99fbd]">
                  Scan a participant's event QR code to mark their attendance.
                </p>
              </div>
              {scannerOpen && (
                <button
                  onClick={() => setScannerOpen(false)}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
                >
                  Close Scanner
                </button>
              )}
            </div>

            {scannerOpen && (
              <div className="mx-auto mt-6 max-w-md">
                <div
                  id="attendance-reader"
                  className="overflow-hidden rounded-xl bg-white p-2"
                />
                {scanProcessing && (
                  <p className="mt-3 text-center text-violet-300">
                    Verifying QR code...
                  </p>
                )}
              </div>
            )}

            {scanMessage && (
              <div className="mt-5 rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-green-400">
                {scanMessage}
              </div>
            )}

            {scanError && (
              <div className="mt-5 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
                {scanError}
              </div>
            )}
          </section>
        )}

        {/* NOTIFICATIONS */}
        {error && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-green-400">
            {success}
          </div>
        )}

        {/* EXISTING STATISTICS */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

          <div className="rounded-2xl border border-white/10 bg-[#1d1930] p-7">
            <p className="text-sm text-[#a99fbd]">Total Events</p>
            <h3 className="mt-3 text-4xl font-bold">
              {events.length}
            </h3>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#1d1930] p-7">
            <p className="text-sm text-[#a99fbd]">Published Events</p>
            <h3 className="mt-3 text-4xl font-bold text-green-400">
              {publishedEvents.length}
            </h3>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#1d1930] p-7">
            <p className="text-sm text-[#a99fbd]">Draft Events</p>
            <h3 className="mt-3 text-4xl font-bold text-yellow-400">
              {draftEvents.length}
            </h3>
          </div>

        </div>

        {/* ORGANIZER ANALYTICS */}
        <section id="analytics-section" className="mt-12 scroll-mt-24">

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
                Performance Overview
              </p>

              <h3 className="mt-2 text-3xl font-bold">
                Event Analytics
              </h3>

              <p className="mt-2 text-[#a99fbd]">
                Track registrations and monitor your event performance.
              </p>
            </div>

            <button
              onClick={fetchAnalytics}
              disabled={analyticsLoading}
              className="rounded-lg border border-white/10 px-5 py-3 text-sm transition hover:bg-white/5 disabled:opacity-50"
            >
              {analyticsLoading ? "Refreshing..." : "↻ Refresh Analytics"}
            </button>

          </div>

          {analyticsLoading ? (
            <p className="mt-8 text-[#a99fbd]">
              Loading analytics...
            </p>
          ) : analyticsError ? (
            <div className="mt-7 rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-red-400">
              {analyticsError}
              <button
                onClick={fetchAnalytics}
                className="ml-3 underline"
              >
                Retry
              </button>
            </div>
          ) : analytics ? (

            <>
              {/* ANALYTICS SUMMARY CARDS */}
              <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

                <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-600/20 to-[#1d1930] p-7">
                  <p className="text-sm text-[#a99fbd]">
                    Total Registrations
                  </p>

                  <h4 className="mt-3 text-4xl font-bold text-violet-300">
                    {analytics.totalRegistrations}
                  </h4>

                  <p className="mt-2 text-xs text-[#887f9e]">
                    Across all your events
                  </p>
                </div>

                <div className="rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-600/10 to-[#1d1930] p-7">
                  <p className="text-sm text-[#a99fbd]">
                    Average Registrations
                  </p>

                  <h4 className="mt-3 text-4xl font-bold text-green-400">
                    {analytics.totalEvents > 0
                      ? (
                          analytics.totalRegistrations /
                          analytics.totalEvents
                        ).toFixed(1)
                      : "0"}
                  </h4>

                  <p className="mt-2 text-xs text-[#887f9e]">
                    Per event
                  </p>
                </div>

                <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-600/10 to-[#1d1930] p-7">
                  <p className="text-sm text-[#a99fbd]">
                    Events with Registrations
                  </p>

                  <h4 className="mt-3 text-4xl font-bold text-violet-300">
                    {
                      analytics.eventAnalytics.filter(
                        (event) => event.registrations > 0
                      ).length
                    }
                  </h4>

                  <p className="mt-2 text-xs text-[#887f9e]">
                    Events with at least one registration
                  </p>
                </div>

              </div>

              {/* REGISTRATION COMPARISON CHART */}
              <div className="mt-8 rounded-2xl border border-white/10 bg-[#1d1930] p-7">
                <div>
                  <h4 className="text-xl font-bold">
                    Event Registration Comparison
                  </h4>
                  <p className="mt-2 text-sm text-[#a99fbd]">
                    Compare participant registrations across your events.
                  </p>
                </div>

                {analytics.eventAnalytics.length === 0 ? (
                  <p className="mt-8 text-center text-[#a99fbd]">
                    No event data available yet.
                  </p>
                ) : (
                  <div className="mt-8 h-[340px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.eventAnalytics}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#39314f"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          stroke="#a99fbd"
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="title"
                          width={190}
                          stroke="#ddd6eb"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(139, 92, 246, 0.10)" }}
                          contentStyle={{
                            backgroundColor: "#1d1930",
                            border: "1px solid #51466b",
                            borderRadius: "10px",
                            color: "#ffffff",
                          }}
                          labelStyle={{ color: "#ffffff" }}
                          formatter={(value) => [
                            `${value} registration${Number(value) === 1 ? "" : "s"}`,
                            "Students",
                          ]}
                        />
                        <Bar
                          dataKey="registrations"
                          name="Registrations"
                          fill="#8B5CF6"
                          radius={[0, 8, 8, 0]}
                          barSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* EVENT CAPACITY TRACKING */}
              <section className="mt-8 rounded-2xl border border-white/10 bg-[#1d1930] p-7">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
                    Capacity Management
                  </p>
                  <h4 className="mt-2 text-xl font-bold">Event Capacity Overview</h4>
                  <p className="mt-2 text-sm text-[#a99fbd]">
                    Monitor registrations, available seats and capacity utilisation.
                  </p>
                </div>

                {(() => {
                  const capacityEvents = analytics.eventAnalytics.filter(
                    (event) => Number(event.capacity) > 0
                  );
                  const totalCapacity = capacityEvents.reduce(
                    (total, event) => total + Number(event.capacity || 0), 0
                  );
                  const totalBooked = capacityEvents.reduce(
                    (total, event) => total + Math.min(
                      Number(event.registrations || 0), Number(event.capacity || 0)
                    ), 0
                  );
                  const totalAvailable = Math.max(totalCapacity - totalBooked, 0);

                  return (
                    <>
                      <div className="mt-6 grid gap-4 sm:grid-cols-3">
                        <div className="rounded-xl border border-white/10 bg-[#100d1c] p-5">
                          <p className="text-sm text-[#a99fbd]">Total Seats</p>
                          <p className="mt-2 text-3xl font-bold">{totalCapacity}</p>
                        </div>
                        <div className="rounded-xl border border-violet-400/20 bg-violet-400/5 p-5">
                          <p className="text-sm text-[#a99fbd]">Seats Registered</p>
                          <p className="mt-2 text-3xl font-bold text-violet-300">{totalBooked}</p>
                        </div>
                        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5">
                          <p className="text-sm text-[#a99fbd]">Seats Available</p>
                          <p className="mt-2 text-3xl font-bold text-green-400">{totalAvailable}</p>
                        </div>
                      </div>

                      {analytics.eventAnalytics.length === 0 ? (
                        <p className="mt-6 text-center text-[#a99fbd]">
                          Create an event to start tracking capacity.
                        </p>
                      ) : (
                        <div className="mt-7 space-y-6">
                          {analytics.eventAnalytics.map((event) => {
                            const capacity = Number(event.capacity || 0);
                            const registered = Number(event.registrations || 0);
                            const remaining = event.remainingSeats == null
                              ? null
                              : Number(event.remainingSeats);
                            const percentage = capacity > 0
                              ? Math.min(Math.round((registered / capacity) * 100), 100)
                              : 0;

                            return (
                              <div key={event.eventId}>
                                <div className="mb-2 flex flex-col justify-between gap-2 sm:flex-row">
                                  <div>
                                    <p className="font-semibold">{event.title}</p>
                                    <p className="mt-1 text-xs text-[#a99fbd]">
                                      {capacity > 0
                                        ? `${registered} of ${capacity} seats registered`
                                        : `${registered} registrations · No capacity limit set`}
                                    </p>
                                  </div>
                                  <div className="text-sm sm:text-right">
                                    {capacity > 0 ? (
                                      <>
                                        <span className="font-semibold text-violet-300">{percentage}%</span>
                                        <span className="ml-2 text-[#a99fbd]">{remaining} seats left</span>
                                      </>
                                    ) : (
                                      <span className="text-[#a99fbd]">Capacity not specified</span>
                                    )}
                                  </div>
                                </div>

                                <div
                                  className="h-3 overflow-hidden rounded-full bg-[#100d1c]"
                                  role="progressbar"
                                  aria-valuenow={percentage}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-label={`${event.title} capacity utilisation`}
                                >
                                  <div
                                    className={`h-full rounded-full transition-all duration-700 ${
                                      percentage >= 90
                                        ? "bg-red-500"
                                        : percentage >= 70
                                        ? "bg-yellow-500"
                                        : "bg-violet-400"
                                    }`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>

                                {capacity > 0 && remaining === 0 && (
                                  <p className="mt-2 text-xs font-medium text-red-400">
                                    Event capacity reached
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </section>

              {/* EVENT ANALYTICS TABLE */}
              <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#1d1930]">

                <div className="p-7">
                  <h4 className="text-xl font-bold">
                    Event Performance Details
                  </h4>

                  <p className="mt-2 text-sm text-[#a99fbd]">
                    Detailed registration statistics for your events.
                  </p>
                </div>

                <div className="overflow-x-auto">

                  <table className="w-full text-left text-sm">

                    <thead className="bg-[#100d1c] text-[#a99fbd]">
                      <tr>
                        <th className="px-6 py-4">S.No.</th>
                        <th className="px-6 py-4">Event Name</th>
                        <th className="px-6 py-4">Event Date</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Registrations</th>
                        <th className="px-6 py-4">Capacity</th>
                        <th className="px-6 py-4">Seats Left</th>
                      </tr>
                    </thead>

                    <tbody>
                      {analytics.eventAnalytics.map((event, index) => (
                        <tr
                          key={event.eventId}
                          className="border-t border-white/10"
                        >
                          <td className="px-6 py-4 text-[#a99fbd]">
                            {index + 1}
                          </td>

                          <td className="px-6 py-4 font-medium">
                            {event.title}
                          </td>

                          <td className="px-6 py-4 text-[#a99fbd]">
                            {new Date(event.date).toLocaleDateString("en-IN")}
                          </td>

                          <td className="px-6 py-4">
                            <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                              {event.status}
                            </span>
                          </td>

                          <td className="px-6 py-4 font-semibold text-violet-300">
                            {event.registrations}
                          </td>

                          <td className="px-6 py-4 text-[#d8d0e7]">
                            {Number(event.capacity) > 0 ? event.capacity : "Not set"}
                          </td>

                          <td className="px-6 py-4 text-[#d8d0e7]">
                            {event.remainingSeats == null ? "—" : event.remainingSeats}
                          </td>
                        </tr>
                      ))}
                    </tbody>

                  </table>

                </div>
              </div>

            </>
          ) : null}

        </section>

        {/* CREATE / EDIT EVENT FORM */}
        {showForm && (

          <section
            id="event-form-section"
            className="mt-10 scroll-mt-24 rounded-2xl border border-white/10 bg-[#1d1930] p-7"
          >

            <h3 className="text-2xl font-bold">
              {editingEventId ? "Edit Event" : "Create New Event"}
            </h3>

            <form
              onSubmit={handleSubmitEvent}
              className="mt-7 grid gap-5 md:grid-cols-2"
            >

              <input
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Event title"
                required
                className="rounded-lg border border-white/10 bg-[#100d1c] p-4 outline-none focus:border-violet-400"
              />

              <input
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="Category (Technology, Sports...)"
                required
                className="rounded-lg border border-white/10 bg-[#100d1c] p-4 outline-none focus:border-violet-400"
              />

              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="rounded-lg border border-white/10 bg-[#100d1c] p-4 text-white outline-none focus:border-violet-400"
              />

              <input
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Event location"
                required
                className="rounded-lg border border-white/10 bg-[#100d1c] p-4 outline-none focus:border-violet-400"
              />

              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                placeholder="Maximum participants"
                min="1"
                required
                className="rounded-lg border border-white/10 bg-[#100d1c] p-4 outline-none focus:border-violet-400"
              />

              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your event..."
                required
                rows="4"
                className="rounded-lg border border-white/10 bg-[#100d1c] p-4 outline-none focus:border-violet-400 md:col-span-2"
              />

              {/* EVENT POSTER UPLOAD */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-[#d8d0e7]">
                  Event Poster <span className="font-normal text-[#887f9e]">(optional, max 5 MB)</span>
                </label>

                <label
                  htmlFor="event-poster"
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/15 bg-[#100d1c] px-6 py-8 text-center transition hover:border-violet-400/60 hover:bg-violet-400/5"
                >
                  <span className="text-3xl">🖼️</span>
                  <span className="mt-3 font-semibold text-white">
                    {posterFile ? "Choose a different poster" : "Click to upload event poster"}
                  </span>
                  <span className="mt-1 text-sm text-[#a99fbd]">
                    Recommended: landscape image, 1200 × 600 pixels
                  </span>
                  <input
                    id="event-poster"
                    type="file"
                    accept="image/*"
                    onChange={handlePosterChange}
                    className="sr-only"
                  />
                </label>

                {posterPreview && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                    <img
                      src={posterPreview}
                      alt="Event poster preview"
                      className="max-h-72 w-full bg-[#100d1c] object-contain"
                    />
                    <div className="flex items-center justify-between gap-3 bg-[#100d1c] px-4 py-3">
                      <span className="truncate text-sm text-[#a99fbd]">
                        {posterFile?.name || "Current event poster"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPosterFile(null);
                          setPosterPreview("");
                          const input = document.getElementById("event-poster");
                          if (input) input.value = "";
                        }}
                        className="shrink-0 text-sm font-semibold text-red-400 hover:text-red-300"
                      >
                        Clear preview
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="rounded-lg bg-violet-600 py-3 font-semibold transition hover:bg-violet-400 md:col-span-2"
              >
                {editingEventId ? "Update Event" : "Publish Event"}
              </button>

              {editingEventId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-white/10 py-3 font-semibold transition hover:bg-white/5 md:col-span-2"
                >
                  Cancel Editing
                </button>
              )}

            </form>

          </section>
        )}

        {/* EVENTS LIST */}
        <section id="events-list-section" className="mt-12 scroll-mt-24">

          <h3 className="text-2xl font-bold">
            Your Events
          </h3>

          {loading ? (
            <p className="mt-8 text-[#a99fbd]">
              Loading events...
            </p>
          ) : events.length === 0 ? (
            <div className="mt-7 rounded-2xl border border-white/10 bg-[#1d1930] p-12 text-center">
              <p className="text-xl font-semibold">
                No events created yet.
              </p>

              <p className="mt-2 text-[#a99fbd]">
                Create your first event to get started.
              </p>
            </div>
          ) : (

            <div className="mt-7 grid gap-6 md:grid-cols-2 lg:grid-cols-3">

              {events.map((event) => (

                <div
                  key={event._id}
                  className="rounded-2xl border border-white/10 bg-[#1d1930] p-6"
                >

                  {event.poster?.url ? (
                    <img
                      src={event.poster.url}
                      alt={`${event.title} poster`}
                      className="mb-5 h-44 w-full rounded-xl object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="mb-5 flex h-44 w-full items-center justify-center rounded-xl bg-gradient-to-br from-violet-950/50 to-[#100d1c] text-4xl">
                      🎟️
                    </div>
                  )}

                  <div className="flex items-center justify-between">

                    <span className="text-xs font-semibold uppercase text-violet-300">
                      {event.category}
                    </span>

                    <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                      {event.status}
                    </span>

                  </div>

                  <h4 className="mt-4 text-xl font-bold">
                    {event.title}
                  </h4>

                  <p className="mt-3 line-clamp-2 text-sm text-[#a99fbd]">
                    {event.description}
                  </p>

                  <div className="mt-5 space-y-2 text-sm text-[#a99fbd]">

                    <p>
                      📅 {new Date(event.date).toLocaleDateString("en-IN")}
                    </p>

                    <p>📍 {event.location}</p>

                    <p>👥 Capacity: {event.capacity}</p>

                  </div>

                  {/* EDIT BUTTON */}
                  <button
                    onClick={() => handleEdit(event)}
                    className="mt-6 w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold transition hover:bg-violet-400"
                  >
                    Edit Event
                  </button>

                  {/* VIEW REGISTRATIONS BUTTON */}
                  <button
                    onClick={() => handleViewRegistrations(event)}
                    className="mt-3 w-full rounded-lg border border-violet-400/30 py-2.5 text-sm font-semibold text-violet-300 transition hover:bg-violet-400/10"
                  >
                    View Registrations
                  </button>

                  {/* DELETE BUTTON */}
                  <button
                    onClick={() => handleDelete(event._id)}
                    className="mt-3 w-full rounded-lg border border-red-500/20 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
                  >
                    Delete Event
                  </button>

                </div>

              ))}

            </div>
          )}

        </section>

        {/* REGISTRATIONS SECTION */}
        {selectedEvent && (

          <section
            id="registrations-section"
            className="mt-12 scroll-mt-24 rounded-2xl border border-white/10 bg-[#1d1930] p-7"
          >

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
                  Event Management
                </p>

                <h3 className="mt-2 text-2xl font-bold">
                  Registrations
                </h3>

                <p className="mt-2 text-[#a99fbd]">
                  {selectedEvent.title}
                </p>
              </div>

              <button
                onClick={closeRegistrations}
                className="rounded-lg border border-white/10 px-5 py-2.5 text-sm transition hover:bg-white/5"
              >
                Close
              </button>

            </div>

            {registrationLoading ? (
              <p className="mt-8 text-[#a99fbd]">
                Loading registrations...
              </p>
            ) : (

              <>

                {/* REGISTRATION COUNT */}
                <div className="mt-7 rounded-xl border border-white/10 bg-[#100d1c] p-5">

                  <p className="text-sm text-[#a99fbd]">
                    Total Registered Participants
                  </p>

                  <h4 className="mt-2 text-3xl font-bold text-violet-300">
                    {registrations.length}
                  </h4>

                </div>

                {/* ATTENDANCE SUMMARY */}
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-[#100d1c] p-5">
                    <p className="text-sm text-[#a99fbd]">Registered</p>
                    <p className="mt-2 text-2xl font-bold text-violet-300">
                      {registrations.length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5">
                    <p className="text-sm text-[#a99fbd]">Attended</p>
                    <p className="mt-2 text-2xl font-bold text-green-400">
                      {registrations.filter((item) => item.attendanceStatus === "attended").length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5">
                    <p className="text-sm text-[#a99fbd]">Not Attended</p>
                    <p className="mt-2 text-2xl font-bold text-yellow-400">
                      {registrations.filter((item) => item.attendanceStatus !== "attended").length}
                    </p>
                  </div>
                </div>

                {/* STUDENT LIST */}
                {registrations.length === 0 ? (

                  <div className="mt-7 rounded-xl border border-white/10 p-8 text-center">

                    <p className="text-lg font-semibold">
                      No registrations yet.
                    </p>

                    <p className="mt-2 text-sm text-[#a99fbd]">
                      People who register for this event will appear here.
                    </p>

                  </div>

                ) : (

                  <div className="mt-7 overflow-x-auto rounded-xl border border-white/10">

                    <table className="w-full text-left text-sm">

                      <thead className="bg-[#100d1c] text-[#a99fbd]">
                        <tr>
                          <th className="px-5 py-4">S.No.</th>
                          <th className="px-5 py-4">Participant Name</th>
                          <th className="px-5 py-4">Email</th>
                          <th className="px-5 py-4">Registration Date</th>
                          <th className="px-5 py-4">Attendance</th>
                          <th className="px-5 py-4">Attended At</th>
                        </tr>
                      </thead>

                      <tbody>
                        {registrations.map((registration, index) => (

                          <tr
                            key={registration._id}
                            className="border-t border-white/10"
                          >

                            <td className="px-5 py-4 text-[#a99fbd]">
                              {index + 1}
                            </td>

                            <td className="px-5 py-4 font-medium">
                              {registration.user?.name || "Unknown"}
                            </td>

                            <td className="px-5 py-4 text-[#a99fbd]">
                              {registration.user?.email || "Not available"}
                            </td>

                            <td className="px-5 py-4 text-[#a99fbd]">
                              {registration.registeredAt
                                ? new Date(
                                    registration.registeredAt
                                  ).toLocaleDateString("en-IN")
                                : registration.createdAt
                                ? new Date(
                                    registration.createdAt
                                  ).toLocaleDateString("en-IN")
                                : "Not available"}
                            </td>

                            <td className="px-5 py-4">
                              <span className={`rounded-full px-3 py-1 text-xs ${
                                registration.attendanceStatus === "attended"
                                  ? "bg-green-500/10 text-green-400"
                                  : "bg-yellow-500/10 text-yellow-400"
                              }`}>
                                {registration.attendanceStatus === "attended"
                                  ? "Attended"
                                  : "Not Attended"}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-[#a99fbd]">
                              {registration.attendedAt
                                ? new Date(registration.attendedAt).toLocaleString("en-IN")
                                : "—"}
                            </td>

                          </tr>

                        ))}
                      </tbody>

                    </table>

                  </div>

                )}

              </>
            )}

          </section>
        )}

      </main>

    </div>
  );
}

export default Dashboard;