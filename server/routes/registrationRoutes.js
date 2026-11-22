const express = require("express");

const Registration = require("../models/Registration");
const Event = require("../models/Event");
const User = require("../models/User");

const { sendEmail } = require("../utils/emailService");

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// REGISTER FOR EVENT (Student only)
router.post("/:eventId", protect, authorize("student"), async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    if (event.status !== "published") {
      return res.status(400).json({
        message: "This event is not available for registration",
      });
    }

    if (new Date(event.date) <= new Date()) {
      return res.status(400).json({
        message: "Registration for this event is closed",
      });
    }

    const existingRegistration = await Registration.findOne({
      user: req.user._id,
      event: eventId,
    });

    if (existingRegistration) {
      return res.status(409).json({
        message: "You are already registered for this event",
      });
    }

    if (event.capacity) {
      const registrationCount = await Registration.countDocuments({
        event: eventId,
      });

      if (registrationCount >= event.capacity) {
        return res.status(400).json({
          message: "Event capacity is full",
        });
      }
    }

    const registration = await Registration.create({
      user: req.user._id,
      event: eventId,
    });

    // SEND EXPLOREX REGISTRATION CONFIRMATION EMAIL
    try {
      const student = await User.findById(req.user._id);

      if (student && student.email) {
        const eventDate = new Date(event.date).toLocaleString("en-IN", {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: "Asia/Kolkata",
        });

        await sendEmail({
          to: student.email,
          subject: `Registration Confirmed - ${event.title}`,

          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; color: #333;">

              <h1 style="color: #8B5CF6;">ExploreX</h1>

              <h2>Registration Confirmed!</h2>

              <p>Hello ${student.name},</p>

              <p>
                Your registration for the following event has been
                successfully completed.
              </p>

              <div style="background: #f3f4f6; padding: 20px; border-radius: 10px;">

                <h2>${event.title}</h2>

                <p><strong>Date:</strong> ${eventDate}</p>

                <p><strong>Location:</strong> ${event.location}</p>

                <p><strong>Registration ID:</strong> ${registration._id}</p>

              </div>

              <p>
                Please keep this email for your reference.
                We look forward to seeing you at the event!
              </p>

              <br/>

              <strong>Team ExploreX</strong>

              <p style="color: #777; font-size: 12px;">
                Discover. Connect. Experience.
              </p>

            </div>
          `,
        });
      }
    } catch (emailError) {
      // Email failure should not cancel a successful registration
      console.error("Registration email error:", emailError.message);
    }

    res.status(201).json({
      message: "Successfully registered for event",
      registration,
    });

  } catch (error) {
    console.error("Event registration error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "You are already registered for this event",
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid event ID",
      });
    }

    res.status(500).json({
      message: "Server error during event registration",
    });
  }
});

// GET ALL EVENTS REGISTERED BY LOGGED-IN STUDENT
router.get("/my-events", protect, authorize("student"), async (req, res) => {
  try {
    const registrations = await Registration.find({
      user: req.user._id,
    })
      .populate("event")
      .sort({ registeredAt: -1 });

    res.status(200).json({
      count: registrations.length,
      registrations,
    });

  } catch (error) {
    console.error("Fetch registered events error:", error);

    res.status(500).json({
      message: "Server error while fetching registered events",
    });
  }
});

// GET ALL REGISTRATIONS FOR AN ORGANIZER'S EVENT
router.get(
  "/event/:eventId",
  protect,
  authorize("organizer"),
  async (req, res) => {
    try {
      const { eventId } = req.params;

      const event = await Event.findById(eventId);

      if (!event) {
        return res.status(404).json({
          message: "Event not found",
        });
      }

      if (event.organizer.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message: "You cannot view registrations for this event",
        });
      }

      const registrations = await Registration.find({
        event: eventId,
      })
        .select("-qrToken")
        .populate("user", "name email")
        .sort({ registeredAt: -1 });

      res.status(200).json({
        event: event.title,
        count: registrations.length,
        registrations,
      });

    } catch (error) {
      console.error("Fetch event registrations error:", error);

      if (error.name === "CastError") {
        return res.status(400).json({
          message: "Invalid event ID",
        });
      }

      res.status(500).json({
        message: "Server error while fetching registrations",
      });
    }
  }
);

// SCAN QR CODE AND MARK ATTENDANCE (Organizer only)
router.post(
  "/attendance/scan",
  protect,
  authorize("organizer"),
  async (req, res) => {
    try {
      const { qrToken } = req.body;

      if (!qrToken) {
        return res.status(400).json({
          message: "QR token is required",
        });
      }

      const registration = await Registration.findOne({
        qrToken,
      }).populate("event", "title organizer");

      if (!registration) {
        return res.status(404).json({
          message: "Invalid QR code or registration not found",
        });
      }

      if (
        registration.event.organizer.toString() !==
        req.user._id.toString()
      ) {
        return res.status(403).json({
          message: "You cannot mark attendance for this event",
        });
      }

      if (registration.attendanceStatus === "attended") {
        return res.status(409).json({
          message: "Attendance has already been marked",
          student: registration.user,
          event: registration.event.title,
          attendedAt: registration.attendedAt,
        });
      }

      registration.attendanceStatus = "attended";
      registration.attendedAt = new Date();

      await registration.save();

      const populatedRegistration = await Registration.findById(
        registration._id
      ).populate("user", "name email");

      res.status(200).json({
        message: "Attendance marked successfully",
        student: populatedRegistration.user,
        event: registration.event.title,
        attendanceStatus: registration.attendanceStatus,
        attendedAt: registration.attendedAt,
      });

    } catch (error) {
      console.error("QR attendance error:", error);

      res.status(500).json({
        message: "Server error while marking attendance",
      });
    }
  }
);

// CANCEL EVENT REGISTRATION (Student only)
router.delete("/:eventId", protect, authorize("student"), async (req, res) => {
  try {
    const { eventId } = req.params;

    const registration = await Registration.findOneAndDelete({
      user: req.user._id,
      event: eventId,
    });

    if (!registration) {
      return res.status(404).json({
        message: "Registration not found.",
      });
    }

    res.status(200).json({
      message: "Registration cancelled successfully.",
    });

  } catch (error) {
    console.error("Cancel registration error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid event ID.",
      });
    }

    res.status(500).json({
      message: "Server error while cancelling registration.",
    });
  }
});

module.exports = router;