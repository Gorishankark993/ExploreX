const express = require("express");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");

const Event = require("../models/Event");
const Registration = require("../models/Registration");

const { sendEmail } = require("../utils/emailService");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();


// ==========================================
// EVENT POSTER UPLOAD CONFIGURATION
// ==========================================
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed."));
  },
});

const uploadPosterToCloudinary = (fileBuffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "unievents/event-posters",
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(fileBuffer);
  });

const deletePosterFromCloudinary = async (publicId) => {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });
  } catch (error) {
    // A poster cleanup failure should not block event updates/deletion.
    console.error("Cloudinary poster deletion error:", error.message);
  }
};

// ==========================================
// SEND EVENT CANCELLATION EMAILS
// ==========================================
const sendCancellationEmails = async (event) => {
  try {
    const registrations = await Registration.find({
      event: event._id,
    }).populate("user", "name email");

    const emailResults = await Promise.allSettled(
      registrations
        .filter((registration) => registration.user?.email)
        .map((registration) =>
          sendEmail({
            to: registration.user.email,
            subject: `Event Cancelled - ${event.title}`,

            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; color: #333;">

                <h1 style="color: #2563eb;">UniEvents.</h1>

                <h2 style="color: #dc2626;">Event Cancellation Notice</h2>

                <p>Hello ${registration.user.name},</p>

                <p>
                  We regret to inform you that the following event
                  has been cancelled by its organizer.
                </p>

                <div style="background: #f3f4f6; padding: 20px; border-radius: 10px;">

                  <h2>${event.title}</h2>

                  <p><strong>Date:</strong> ${new Date(event.date).toLocaleString("en-IN", {
                    dateStyle: "full",
                    timeStyle: "short",
                    timeZone: "Asia/Kolkata",
                  })}</p>

                  <p><strong>Location:</strong> ${event.location}</p>

                </div>

                <p>
                  We apologize for the inconvenience.
                  Please check UniEvents for other upcoming events.
                </p>

                <br />

                <strong>Team UniEvents</strong>

                <p style="color: #777; font-size: 12px;">
                  Making campus experiences better, one event at a time.
                </p>

              </div>
            `,
          })
        )
    );

    const successful = emailResults.filter(
      (result) => result.status === "fulfilled"
    ).length;

    const failed = emailResults.length - successful;

    console.log(
      `Cancellation emails: ${successful} sent, ${failed} failed.`
    );

  } catch (error) {
    console.error("Cancellation email process error:", error.message);
  }
};

// ==========================================
// CREATE EVENT (Organizer only)
// ==========================================
router.post("/", protect, authorize("organizer"), upload.single("poster"), async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      date,
      location,
      capacity,
    } = req.body;

    if (!title || !description || !category || !date || !location) {
      return res.status(400).json({
        message: "Please provide all required event details",
      });
    }

    let poster = { url: "", publicId: "" };

    if (req.file) {
      const uploadedPoster = await uploadPosterToCloudinary(req.file.buffer);
      poster = {
        url: uploadedPoster.secure_url,
        publicId: uploadedPoster.public_id,
      };
    }

    const event = await Event.create({
      title,
      description,
      category,
      date,
      location,
      capacity,
      poster,
      organizer: req.user._id,
    });

    res.status(201).json({
      message: "Event created successfully",
      event,
    });

  } catch (error) {
    console.error("Create event error:", error);

    res.status(500).json({
      message: "Server error while creating event",
    });
  }
});

// ==========================================
// GET ORGANIZER ANALYTICS
// ==========================================
router.get(
  "/analytics/overview",
  protect,
  authorize("organizer"),
  async (req, res) => {
    try {
      const events = await Event.find({
        organizer: req.user._id,
      }).select("title status date capacity");

      const eventIds = events.map((event) => event._id);

      const registrationStats = await Registration.aggregate([
        {
          $match: {
            event: { $in: eventIds },
          },
        },
        {
          $group: {
            _id: "$event",
            totalRegistrations: { $sum: 1 },
          },
        },
      ]);

      const statsMap = {};

      registrationStats.forEach((item) => {
        statsMap[item._id.toString()] = item.totalRegistrations;
      });

      const totalRegistrations = registrationStats.reduce(
        (total, item) => total + item.totalRegistrations,
        0
      );

      const eventAnalytics = events.map((event) => {
        const registrations = statsMap[event._id.toString()] || 0;
        const capacity = event.capacity || 0;

        const remainingSeats =
          capacity > 0
            ? Math.max(capacity - registrations, 0)
            : null;

        const capacityPercentage =
          capacity > 0
            ? Math.min(
                Math.round((registrations / capacity) * 100),
                100
              )
            : 0;

        return {
          eventId: event._id,
          title: event.title,
          status: event.status,
          date: event.date,
          registrations,
          capacity,
          remainingSeats,
          capacityPercentage,
        };
      });

      res.status(200).json({
        totalEvents: events.length,

        publishedEvents: events.filter(
          (event) => event.status === "published"
        ).length,

        draftEvents: events.filter(
          (event) => event.status === "draft"
        ).length,

        totalRegistrations,

        eventAnalytics,
      });

    } catch (error) {
      console.error("Organizer analytics error:", error);

      res.status(500).json({
        message: "Unable to fetch organizer analytics.",
      });
    }
  }
);

// ==========================================
// GET ALL PUBLISHED EVENTS
// ==========================================
router.get("/", async (req, res) => {
  try {
    const events = await Event.find({
      status: "published",
    })
      .populate("organizer", "name email")
      .sort({ date: 1 });

    res.status(200).json({
      count: events.length,
      events,
    });

  } catch (error) {
    console.error("Fetch events error:", error);

    res.status(500).json({
      message: "Server error while fetching events",
    });
  }
});

// ==========================================
// GET SINGLE EVENT BY ID
// ==========================================
router.get("/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("organizer", "name email");

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    res.status(200).json({
      event,
    });

  } catch (error) {
    console.error("Fetch single event error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid event ID",
      });
    }

    res.status(500).json({
      message: "Server error while fetching event",
    });
  }
});

// ==========================================
// UPDATE EVENT (Owner only)
// ==========================================
router.put("/:id", protect, authorize("organizer"), upload.single("poster"), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You cannot update someone else's event",
      });
    }

    const previousStatus = event.status;

    const allowedFields = [
      "title",
      "description",
      "category",
      "date",
      "location",
      "capacity",
      "status",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        event[field] = req.body[field];
      }
    });

    let oldPosterPublicId = "";

    if (req.file) {
      const uploadedPoster = await uploadPosterToCloudinary(req.file.buffer);

      oldPosterPublicId = event.poster?.publicId || "";
      event.poster = {
        url: uploadedPoster.secure_url,
        publicId: uploadedPoster.public_id,
      };
    }

    const updatedEvent = await event.save();

    if (oldPosterPublicId) {
      await deletePosterFromCloudinary(oldPosterPublicId);
    }

    // Send cancellation emails only when status changes to cancelled
    if (
      previousStatus !== "cancelled" &&
      updatedEvent.status === "cancelled"
    ) {
      await sendCancellationEmails(updatedEvent);
    }

    res.status(200).json({
      message: "Event updated successfully",
      event: updatedEvent,
    });

  } catch (error) {
    console.error("Update event error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid event ID",
      });
    }

    res.status(500).json({
      message: "Server error while updating event",
    });
  }
});

// ==========================================
// DELETE EVENT (Owner only)
// ==========================================
router.delete("/:id", protect, authorize("organizer"), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You cannot delete someone else's event",
      });
    }

    // Notify registered students before deleting registrations
    await sendCancellationEmails(event);

    await Event.deleteOne({
      _id: event._id,
    });

    await Registration.deleteMany({
      event: event._id,
    });

    await deletePosterFromCloudinary(event.poster?.publicId);

    res.status(200).json({
      message: "Event and associated registrations deleted successfully",
    });

  } catch (error) {
    console.error("Delete event error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid event ID",
      });
    }

    res.status(500).json({
      message: "Server error while deleting event",
    });
  }
});

module.exports = router;