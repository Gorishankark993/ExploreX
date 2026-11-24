import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import API from "../services/api";

function AdminDashboard() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [activeTab, setActiveTab] = useState("Overview");

  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [logs, setLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const results = await Promise.allSettled([
        API.get("/admin/stats"),
        API.get("/admin/users"),
        API.get("/admin/events"),
        API.get("/admin/reviews"),
        API.get("/admin/logs"),
      ]);

      const [statsResult, usersResult, eventsResult, reviewsResult, logsResult] =
        results;

      if (statsResult.status === "fulfilled") {
        setStats(statsResult.value.data);
      }

      if (usersResult.status === "fulfilled") {
        setUsers(
          Array.isArray(usersResult.value.data)
            ? usersResult.value.data
            : usersResult.value.data.users || []
        );
      }

      if (eventsResult.status === "fulfilled") {
        setEvents(
          Array.isArray(eventsResult.value.data)
            ? eventsResult.value.data
            : eventsResult.value.data.events || []
        );
      }

      if (reviewsResult.status === "fulfilled") {
        setReviews(
          Array.isArray(reviewsResult.value.data)
            ? reviewsResult.value.data
            : reviewsResult.value.data.reviews || []
        );
      }

      if (logsResult.status === "fulfilled") {
        setLogs(
          Array.isArray(logsResult.value.data)
            ? logsResult.value.data
            : logsResult.value.data.logs || []
        );
      }

      if (results.every((result) => result.status === "rejected")) {
        setError("Unable to load dashboard data. Check your backend.");
      }
    } catch (err) {
      setError("Something went wrong while loading dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem("token") || user?.role !== "admin") {
      navigate("/login");
      return;
    }

    fetchDashboardData();
  }, []);

  // Change user role
  const changeRole = async (userId, role) => {
    if (!window.confirm(`Change this user's role to ${role}?`)) return;

    try {
      await API.patch(`/admin/users/${userId}/role`, { role });

      alert("User role updated successfully.");
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update user role.");
    }
  };

  // Block / Unblock user
  const toggleBlock = async (selectedUser) => {
    const action = selectedUser.isBlocked ? "unblock" : "block";

    if (!window.confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    try {
      await API.patch(`/admin/users/${selectedUser._id}/status`, {
        isBlocked: !selectedUser.isBlocked,
      });

      alert(`User ${action}ed successfully.`);
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} user.`);
    }
  };

  // Cancel event
  const cancelEvent = async (eventId) => {
    if (!window.confirm("Are you sure you want to cancel this event?")) {
      return;
    }

    try {
      await API.patch(`/admin/events/${eventId}/cancel`);

      alert("Event cancelled successfully.");
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel event.");
    }
  };

  // Delete review
  const deleteReview = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete this review?")) {
      return;
    }

    try {
      await API.delete(`/admin/reviews/${reviewId}`);

      alert("Review deleted successfully.");
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete review.");
    }
  };

  // Export the currently visible activity logs as CSV
  const exportActivityLogs = () => {
    const headers = [
      "Administrator",
      "Admin Email",
      "Action",
      "Description",
      "Target Type",
      "Target ID",
      "Date & Time",
    ];

    const escapeCSV = (value) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;

    const rows = filteredLogs.map((log) => [
      log.admin?.name || "Unknown admin",
      log.admin?.email || "",
      log.action || "",
      log.description || "",
      log.targetType || "",
      log.targetId || "",
      log.createdAt ? new Date(log.createdAt).toLocaleString() : "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `explorex-activity-logs-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Search filtering
  const filteredLogs = logs.filter((log) => {
    const query = search.toLowerCase();
    return (
      log.admin?.name?.toLowerCase().includes(query) ||
      log.admin?.email?.toLowerCase().includes(query) ||
      log.action?.toLowerCase().includes(query) ||
      log.description?.toLowerCase().includes(query) ||
      log.targetType?.toLowerCase().includes(query) ||
      String(log.targetId || "").toLowerCase().includes(query)
    );
  });

  const filteredUsers = users.filter((item) => {
    const query = search.toLowerCase();

    return (
      item.name?.toLowerCase().includes(query) ||
      item.email?.toLowerCase().includes(query) ||
      item.role?.toLowerCase().includes(query)
    );
  });

  const filteredEvents = events.filter((item) => {
    const query = search.toLowerCase();

    return (
      item.title?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query) ||
      item.location?.toLowerCase().includes(query)
    );
  });

  const filteredReviews = reviews.filter((item) => {
    const query = search.toLowerCase();

    return (
      item.comment?.toLowerCase().includes(query) ||
      item.user?.name?.toLowerCase().includes(query) ||
      item.event?.title?.toLowerCase().includes(query)
    );
  });

  const cards = [
    {
      title: "Total Users",
      value: stats.totalUsers ?? users.length,
      icon: "👥",
      color: "blue",
    },
    {
      title: "Students",
      value: stats.totalStudents ?? users.filter((u) => u.role === "student").length,
      icon: "🎓",
      color: "purple",
    },
    {
      title: "Organizers",
      value: stats.totalOrganizers ?? users.filter((u) => u.role === "organizer").length,
      icon: "🏢",
      color: "green",
    },
    {
      title: "Total Events",
      value: stats.totalEvents ?? events.length,
      icon: "📅",
      color: "orange",
    },
    {
      title: "Registrations",
      value: stats.totalRegistrations ?? 0,
      icon: "📝",
      color: "pink",
    },
    {
      title: "Total Reviews",
      value: stats.totalReviews ?? reviews.length,
      icon: "⭐",
      color: "yellow",
    },
  ];

  const chartData = [
    {
      name: "Students",
      count: stats.totalStudents ?? users.filter((u) => u.role === "student").length,
    },
    {
      name: "Organizers",
      count: stats.totalOrganizers ?? users.filter((u) => u.role === "organizer").length,
    },
    {
      name: "Admins",
      count: users.filter((u) => u.role === "admin").length,
    },
  ];

  const eventData = [
    {
      name: "Published",
      value: stats.publishedEvents ?? events.filter((e) => e.status === "published").length,
    },
    {
      name: "Cancelled",
      value: stats.cancelledEvents ?? events.filter((e) => e.status === "cancelled").length,
    },
  ];

  const navItems = [
    "Overview",
    "Users",
    "Events",
    "Reviews",
    "Activity Logs",
  ];

  const StatCard = ({ card }) => (
    <div className="rounded-2xl border border-white/10 bg-[#151126] p-6 transition hover:-translate-y-1 hover:border-violet-500/40">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{card.title}</p>
        <span className="text-2xl">{card.icon}</span>
      </div>

      <h3 className="mt-4 text-3xl font-bold">
        {card.value}
      </h3>

      <p className="mt-2 text-xs text-gray-500">
        Platform statistics
      </p>
    </div>
  );

  const Badge = ({ children, color = "blue" }) => {
    const colors = {
      blue: "bg-violet-500/10 text-violet-400",
      green: "bg-green-500/10 text-green-400",
      red: "bg-red-500/10 text-red-400",
      yellow: "bg-yellow-500/10 text-yellow-400",
      purple: "bg-violet-500/10 text-violet-400",
    };

    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${colors[color] || colors.blue}`}
      >
        {children}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#100d1c] text-white">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#151126]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <h1 className="text-2xl font-bold">
            Explore<span className="text-violet-400">X.</span>
          </h1>

          <div className="hidden items-center gap-7 md:flex">
            <span className="text-sm text-gray-400">
              Administration Panel
            </span>

            <span className="rounded-full bg-violet-500/10 px-4 py-2 text-sm text-violet-400">
              👑 Administrator
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-red-500/30 px-5 py-2 text-sm text-red-400 transition hover:bg-red-500 hover:text-white"
          >
            Logout
          </button>

        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-10">

        {/* HEADER */}
        <div className="mb-10 flex flex-wrap items-center justify-between gap-5">

          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-500">
              Administration Panel
            </p>

            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Welcome, {user?.name || "Admin"}
            </h2>

            <p className="mt-2 text-gray-400">
              Manage users, events, reviews and platform activity.
            </p>
          </div>

          <button
            onClick={fetchDashboardData}
            className="rounded-lg border border-white/10 bg-[#151126] px-5 py-3 text-sm transition hover:border-violet-500"
          >
            ↻ Refresh Data
          </button>

        </div>

        {/* NAVIGATION TABS */}
        <div className="mb-8 flex gap-2 overflow-x-auto border-b border-white/10 pb-3">

          {navItems.map((item) => (
            <button
              key={item}
              onClick={() => {
                setActiveTab(item);
                setSearch("");
              }}
              className={`whitespace-nowrap rounded-lg px-5 py-3 text-sm font-medium transition ${
                activeTab === item
                  ? "bg-violet-600 text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}

        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
            <p className="mt-5 text-gray-400">Loading dashboard...</p>
          </div>
        ) : (

          <>

            {/* OVERVIEW */}
            {activeTab === "Overview" && (

              <div className="space-y-8">

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

                  {cards.map((card) => (
                    <StatCard key={card.title} card={card} />
                  ))}

                </div>

                {/* CHARTS */}
                <div className="grid gap-6 lg:grid-cols-2">

                  <div className="rounded-2xl border border-white/10 bg-[#151126] p-6">

                    <h3 className="mb-6 text-lg font-semibold">
                      User Distribution
                    </h3>

                    <div className="h-72">

                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#33284f"
                          />

                          <XAxis dataKey="name" stroke="#a1a1aa" />
                          <YAxis stroke="#a1a1aa" allowDecimals={false} />

                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#151126",
                              border: "1px solid #33284f",
                              borderRadius: "10px",
                              color: "#fff",
                            }}
                          />

                          <Bar
                            dataKey="count"
                            fill="#8B5CF6"
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>

                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#151126] p-6">

                    <h3 className="mb-6 text-lg font-semibold">
                      Event Status
                    </h3>

                    <div className="h-72">

                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={eventData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            label
                          >
                            <Cell fill="#22c55e" />
                            <Cell fill="#ef4444" />
                          </Pie>

                          <Tooltip />

                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>

                    </div>
                  </div>

                </div>

                {/* QUICK INFORMATION */}
                <div className="grid gap-6 md:grid-cols-2">

                  <div className="rounded-2xl border border-white/10 bg-[#151126] p-6">
                    <h3 className="text-lg font-semibold">
                      Platform Activity
                    </h3>

                    <div className="mt-5 space-y-4">

                      <div className="flex justify-between">
                        <span className="text-gray-400">Attended Registrations</span>
                        <span className="font-semibold">
                          {stats.attendedRegistrations ?? 0}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-400">Published Events</span>
                        <span className="font-semibold">
                          {stats.publishedEvents ?? 0}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-400">Cancelled Events</span>
                        <span className="font-semibold">
                          {stats.cancelledEvents ?? 0}
                        </span>
                      </div>

                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#151126] p-6">
                    <h3 className="text-lg font-semibold">
                      User Security
                    </h3>

                    <div className="mt-5 space-y-4">

                      <div className="flex justify-between">
                        <span className="text-gray-400">Blocked Accounts</span>
                        <span className="font-semibold text-red-400">
                          {users.filter((u) => u.isBlocked).length}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-400">Active Accounts</span>
                        <span className="font-semibold text-green-400">
                          {users.filter((u) => !u.isBlocked).length}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Reviews</span>
                        <span className="font-semibold">
                          {reviews.length}
                        </span>
                      </div>

                    </div>
                  </div>

                </div>

              </div>

            )}

            {/* USERS */}
            {activeTab === "Users" && (

              <div className="rounded-2xl border border-white/10 bg-[#151126] p-6">

                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">

                  <div>
                    <h3 className="text-xl font-bold">User Management</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      Manage participant and organizer accounts.
                    </p>
                  </div>

                  <input
                    type="text"
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#100d1c] px-4 py-3 text-sm outline-none focus:border-violet-500 sm:w-64"
                  />

                </div>

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[750px] text-left text-sm">

                    <thead className="border-b border-white/10 text-gray-400">
                      <tr>
                        <th className="px-4 py-4">User</th>
                        <th className="px-4 py-4">Email</th>
                        <th className="px-4 py-4">Role</th>
                        <th className="px-4 py-4">Status</th>
                        <th className="px-4 py-4">Change Role</th>
                        <th className="px-4 py-4">Action</th>
                      </tr>
                    </thead>

                    <tbody>

                      {filteredUsers.map((item) => (

                        <tr
                          key={item._id}
                          className="border-b border-white/5 hover:bg-white/[0.02]"
                        >

                          <td className="px-4 py-5 font-medium">
                            {item.name}
                          </td>

                          <td className="px-4 py-5 text-gray-400">
                            {item.email}
                          </td>

                          <td className="px-4 py-5">
                            <Badge color="purple">{item.role}</Badge>
                          </td>

                          <td className="px-4 py-5">
                            {item.isBlocked ? (
                              <Badge color="red">Blocked</Badge>
                            ) : (
                              <Badge color="green">Active</Badge>
                            )}
                          </td>

                          <td className="px-4 py-5">

                            {item.role !== "admin" ? (

                              <select
                                value={item.role}
                                onChange={(e) =>
                                  changeRole(item._id, e.target.value)
                                }
                                className="rounded-lg border border-white/10 bg-[#100d1c] px-3 py-2 outline-none"
                              >
                                <option value="student">Student</option>
                                <option value="organizer">Organizer</option>
                              </select>

                            ) : (
                              <span className="text-gray-500">Protected</span>
                            )}

                          </td>

                          <td className="px-4 py-5">

                            {item.role !== "admin" ? (

                              <button
                                onClick={() => toggleBlock(item)}
                                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                  item.isBlocked
                                    ? "bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white"
                                    : "bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white"
                                }`}
                              >
                                {item.isBlocked ? "Unblock" : "Block"}
                              </button>

                            ) : (
                              <span className="text-gray-500">Protected</span>
                            )}

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                  {filteredUsers.length === 0 && (
                    <p className="py-10 text-center text-gray-500">
                      No users found.
                    </p>
                  )}

                </div>

              </div>

            )}

            {/* EVENTS */}
            {activeTab === "Events" && (

              <div className="rounded-2xl border border-white/10 bg-[#151126] p-6">

                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">

                  <div>
                    <h3 className="text-xl font-bold">Event Management</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      View and manage all platform events.
                    </p>
                  </div>

                  <input
                    type="text"
                    placeholder="Search events..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#100d1c] px-4 py-3 text-sm outline-none focus:border-violet-500 sm:w-64"
                  />

                </div>

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[750px] text-left text-sm">

                    <thead className="border-b border-white/10 text-gray-400">
                      <tr>
                        <th className="px-4 py-4">Event</th>
                        <th className="px-4 py-4">Category</th>
                        <th className="px-4 py-4">Organizer</th>
                        <th className="px-4 py-4">Date</th>
                        <th className="px-4 py-4">Status</th>
                        <th className="px-4 py-4">Action</th>
                      </tr>
                    </thead>

                    <tbody>

                      {filteredEvents.map((item) => (

                        <tr
                          key={item._id}
                          className="border-b border-white/5 hover:bg-white/[0.02]"
                        >

                          <td className="px-4 py-5 font-medium">
                            {item.title}
                          </td>

                          <td className="px-4 py-5 text-gray-400">
                            {item.category}
                          </td>

                          <td className="px-4 py-5 text-gray-400">
                            {item.organizer?.name || "Unknown"}
                          </td>

                          <td className="px-4 py-5 text-gray-400">
                            {item.date
                              ? new Date(item.date).toLocaleDateString()
                              : "N/A"}
                          </td>

                          <td className="px-4 py-5">
                            {item.status === "cancelled" ? (
                              <Badge color="red">Cancelled</Badge>
                            ) : (
                              <Badge color="green">Published</Badge>
                            )}
                          </td>

                          <td className="px-4 py-5">

                            {item.status !== "cancelled" ? (

                              <button
                                onClick={() => cancelEvent(item._id)}
                                className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 transition hover:bg-red-500 hover:text-white"
                              >
                                Cancel Event
                              </button>

                            ) : (
                              <span className="text-gray-500">Cancelled</span>
                            )}

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                  {filteredEvents.length === 0 && (
                    <p className="py-10 text-center text-gray-500">
                      No events found.
                    </p>
                  )}

                </div>

              </div>

            )}

            {/* REVIEWS */}
            {activeTab === "Reviews" && (

              <div className="rounded-2xl border border-white/10 bg-[#151126] p-6">

                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">

                  <div>
                    <h3 className="text-xl font-bold">Review Management</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      Monitor and manage community reviews.
                    </p>
                  </div>

                  <input
                    type="text"
                    placeholder="Search reviews..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#100d1c] px-4 py-3 text-sm outline-none focus:border-violet-500 sm:w-64"
                  />

                </div>

                <div className="space-y-4">

                  {filteredReviews.map((item) => (

                    <div
                      key={item._id}
                      className="rounded-xl border border-white/10 bg-[#100d1c] p-5"
                    >

                      <div className="flex flex-wrap items-start justify-between gap-4">

                        <div>

                          <h4 className="font-semibold">
                            {item.user?.name || "Unknown Participant"}
                          </h4>

                          <p className="mt-1 text-sm text-gray-400">
                            Event: {item.event?.title || "Unknown Event"}
                          </p>

                          <p className="mt-2 text-yellow-400">
                            {"★".repeat(Math.min(5, Math.max(0, Number(item.rating) || 0)))}
                            <span className="ml-2 text-sm text-gray-400">
                              {item.rating}/5
                            </span>
                          </p>

                        </div>

                        <button
                          onClick={() => deleteReview(item._id)}
                          className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500 hover:text-white"
                        >
                          Delete Review
                        </button>

                      </div>

                      <p className="mt-4 leading-relaxed text-gray-300">
                        {item.comment}
                      </p>

                    </div>

                  ))}

                  {filteredReviews.length === 0 && (
                    <p className="py-10 text-center text-gray-500">
                      No reviews found.
                    </p>
                  )}

                </div>

              </div>

            )}

            {/* ACTIVITY LOGS */}
            {activeTab === "Activity Logs" && (
              <div className="rounded-2xl border border-white/10 bg-[#151126] p-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold">Admin Activity Logs</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      Audit trail of the latest administrative actions.
                    </p>
                  </div>

                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                    <input
                      type="text"
                      placeholder="Search activity..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#100d1c] px-4 py-3 text-sm outline-none focus:border-violet-500 sm:w-64"
                    />
                    <button
                      type="button"
                      onClick={exportActivityLogs}
                      disabled={filteredLogs.length === 0}
                      className="rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↓ Export CSV ({filteredLogs.length})
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead className="border-b border-white/10 text-gray-400">
                      <tr>
                        <th className="px-4 py-4">Administrator</th>
                        <th className="px-4 py-4">Action</th>
                        <th className="px-4 py-4">Description</th>
                        <th className="px-4 py-4">Target</th>
                        <th className="px-4 py-4">Date & Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log) => (
                          <tr
                            key={log._id}
                            className="border-b border-white/5 hover:bg-white/[0.02]"
                          >
                            <td className="px-4 py-5">
                              <div className="font-medium">
                                {log.admin?.name || "Unknown admin"}
                              </div>
                              <div className="mt-1 text-xs text-gray-500">
                                {log.admin?.email || ""}
                              </div>
                            </td>
                            <td className="px-4 py-5">
                              <Badge
                                color={
                                  log.action === "USER_BLOCKED" ||
                                  log.action === "EVENT_CANCELLED" ||
                                  log.action === "REVIEW_DELETED"
                                    ? "red"
                                    : "blue"
                                }
                              >
                                {(log.action || "UNKNOWN").replaceAll("_", " ")}
                              </Badge>
                            </td>
                            <td className="max-w-md px-4 py-5 text-gray-300">
                              {log.description}
                            </td>
                            <td className="px-4 py-5 text-gray-400">
                              {log.targetType || "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-5 text-gray-400">
                              {log.createdAt
                                ? new Date(log.createdAt).toLocaleString()
                                : "—"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>

                  {filteredLogs.length === 0 && (
                    <p className="py-10 text-center text-gray-500">
                      No activity logs found. Admin actions performed after activity logging was added will appear here.
                    </p>
                  )}
                </div>
              </div>
            )}

          </>

        )}

        {/* HELP & SUPPORT */}
        <section className="mt-10 overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-[#241b3a] via-[#1b1630] to-[#151126] p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-300">
                <span aria-hidden="true">✦</span>
                Help & Support
              </div>
              <h3 className="text-xl font-bold text-white sm:text-2xl">
                Need help or have a query?
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                If you experience an issue or have a question about ExploreX,
                get in touch with the project support team. We’ll be happy to help.
              </p>
              <a
                href="mailto:gorishankark993@gmail.com"
                className="mt-3 inline-block text-sm font-medium text-violet-300 transition hover:text-violet-200"
              >
                gorishankark993@gmail.com
              </a>
            </div>

            <a
              href="mailto:gorishankark993@gmail.com?subject=ExploreX%20-%20Support%20Request"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:-translate-y-0.5 hover:bg-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/30"
            >
              Contact Support
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>

        {/* FOOTER */}
        <div className="mt-12 border-t border-white/10 py-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} ExploreX. Administration Panel.
        </div>

      </main>

    </div>
  );
}

export default AdminDashboard;