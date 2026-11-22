const AdminLog = require("../models/AdminLog");
const express = require("express");

const User = require("../models/User");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const Review = require("../models/Review");

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// All Admin routes require Admin authentication
router.use(protect, authorize("admin"));

// ==========================================
// ADMIN DASHBOARD STATISTICS
// ==========================================

router.get("/stats", async (req, res) => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalOrganizers,
      totalEvents,
      publishedEvents,
      cancelledEvents,
      totalRegistrations,
      attendedRegistrations,
      totalReviews,
    ] = await Promise.all([
      // Count all users, including blocked users
      User.countDocuments(),

      User.countDocuments({ role: "student" }),

      User.countDocuments({ role: "organizer" }),

      Event.countDocuments(),

      Event.countDocuments({ status: "published" }),

      Event.countDocuments({ status: "cancelled" }),

      Registration.countDocuments(),

      Registration.countDocuments({
        attendanceStatus: "attended",
      }),

      Review.countDocuments(),
    ]);

    res.status(200).json({
      totalUsers,
      totalStudents,
      totalOrganizers,
      totalEvents,
      publishedEvents,
      cancelledEvents,
      totalRegistrations,
      attendedRegistrations,

      // Keep the old property for compatibility
      totalAttendance: attendedRegistrations,

      totalReviews,
    });
  } catch (error) {
    console.error("Admin stats error:", error);

    res.status(500).json({
      message: "Unable to fetch dashboard statistics",
    });
  }
});

// ==========================================
// GET ALL USERS
// ==========================================

router.get("/users", async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Admin users error:", error);

    res.status(500).json({
      message: "Unable to fetch users",
    });
  }
});

// ==========================================
// CHANGE USER ROLE
// ==========================================

router.patch("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;

    if (!["student", "organizer"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role. Choose student or organizer.",
      });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        message: "You cannot change your own role.",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        message: "Admin accounts cannot be modified here.",
      });
    }

    const previousRole = user.role;

user.role = role;
await user.save();

await AdminLog.create({
  admin: req.user._id,
  action: "ROLE_CHANGED",
  targetType: "User",
  targetId: user._id,
  description: `Changed ${user.name}'s role from ${previousRole} to ${role}`,
});
    res.status(200).json({
      message: "User role updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isBlocked: user.isBlocked,
      },
    });
  } catch (error) {
    console.error("Change user role error:", error);

    res.status(500).json({
      message: "Unable to update user role",
    });
  }
});

// ==========================================
// BLOCK / UNBLOCK USER
// ==========================================

router.patch("/users/:id/status", async (req, res) => {
  try {
    const { isBlocked } = req.body;

    if (typeof isBlocked !== "boolean") {
      return res.status(400).json({
        message: "isBlocked must be true or false",
      });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        message: "You cannot block your own account.",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        message: "Admin accounts cannot be blocked here.",
      });
    }
user.isBlocked = isBlocked;
await user.save();

await AdminLog.create({
  admin: req.user._id,
  action: isBlocked ? "USER_BLOCKED" : "USER_UNBLOCKED",
  targetType: "User",
  targetId: user._id,
  description: `${isBlocked ? "Blocked" : "Unblocked"} user ${user.name}`,
});
    res.status(200).json({
      message: isBlocked
        ? "User blocked successfully"
        : "User unblocked successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isBlocked: user.isBlocked,
      },
    });
  } catch (error) {
    console.error("Block user error:", error);

    res.status(500).json({
      message: "Unable to update user status",
    });
  }
});

// ==========================================
// GET ALL EVENTS
// ==========================================

router.get("/events", async (req, res) => {
  try {
    const events = await Event.find()
      .populate("organizer", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: events.length,
      events,
    });
  } catch (error) {
    console.error("Admin events error:", error);

    res.status(500).json({
      message: "Unable to fetch events",
    });
  }
});

// ==========================================
// CANCEL EVENT
// ==========================================

router.patch("/events/:id/cancel", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    if (event.status === "cancelled") {
      return res.status(400).json({
        message: "Event is already cancelled",
      });
    }

    event.status = "cancelled";
await event.save();

await AdminLog.create({
  admin: req.user._id,
  action: "EVENT_CANCELLED",
  targetType: "Event",
  targetId: event._id,
  description: `Cancelled event: ${event.title}`,
});

    res.status(200).json({
      message: "Event cancelled successfully",
      event,
    });
  } catch (error) {
    console.error("Admin cancel event error:", error);

    res.status(500).json({
      message: "Unable to cancel event",
    });
  }
});

// ==========================================
// GET ALL REVIEWS
// ==========================================

router.get("/reviews", async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("user", "name email")
      .populate("event", "title date")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error("Admin reviews error:", error);

    res.status(500).json({
      message: "Unable to fetch reviews",
    });
  }
});

// ==========================================
// DELETE REVIEW
// ==========================================

router.delete("/reviews/:id", async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

await AdminLog.create({
  admin: req.user._id,
  action: "REVIEW_DELETED",
  targetType: "Review",
  targetId: review._id,
  description: `Deleted a review with rating ${review.rating}/5`,
});

await review.deleteOne();

    res.status(200).json({
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Admin delete review error:", error);

    res.status(500).json({
      message: "Unable to delete review",
    });
  }
});

// ==========================================
// GET ADMIN ACTIVITY LOGS
// ==========================================

router.get("/logs", async (req, res) => {
  try {
    const logs = await AdminLog.find()
      .populate("admin", "name email")
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error("Admin logs error:", error);

    res.status(500).json({
      message: "Unable to fetch admin activity logs",
    });
  }
});

module.exports = router;