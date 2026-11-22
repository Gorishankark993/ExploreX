const express = require("express");

const Review = require("../models/Review");
const Event = require("../models/Event");
const Registration = require("../models/Registration");

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// SUBMIT REVIEW (Attended students only)
router.post(
  "/:eventId",
  protect,
  authorize("student"),
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const { rating, comment } = req.body;

      if (
        !Number.isInteger(Number(rating)) ||
        Number(rating) < 1 ||
        Number(rating) > 5
      ) {
        return res.status(400).json({
          message: "Rating must be between 1 and 5",
        });
      }

      if (
        typeof comment !== "string" ||
        comment.trim().length < 3 ||
        comment.trim().length > 1000
      ) {
        return res.status(400).json({
          message: "Review must be between 3 and 1000 characters",
        });
      }

      const event = await Event.findById(eventId);

      if (!event) {
        return res.status(404).json({
          message: "Event not found",
        });
      }

      const registration = await Registration.findOne({
        user: req.user._id,
        event: eventId,
        attendanceStatus: "attended",
      });

      if (!registration) {
        return res.status(403).json({
          message: "You must attend this event before submitting a review",
        });
      }

      const existingReview = await Review.findOne({
        user: req.user._id,
        event: eventId,
      });

      if (existingReview) {
        return res.status(409).json({
          message: "You have already reviewed this event",
        });
      }

      const review = await Review.create({
        user: req.user._id,
        event: eventId,
        rating: Number(rating),
        comment: comment.trim(),
      });

      res.status(201).json({
        message: "Review submitted successfully",
        review,
      });

    } catch (error) {
      console.error("Submit review error:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          message: "You have already reviewed this event",
        });
      }

      if (error.name === "CastError") {
        return res.status(400).json({
          message: "Invalid event ID",
        });
      }

      res.status(500).json({
        message: "Server error while submitting review",
      });
    }
  }
);

// GET ALL REVIEWS FOR AN EVENT
router.get("/event/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    const reviews = await Review.find({
      event: eventId,
    })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    const totalReviews = reviews.length;

    const averageRating =
      totalReviews > 0
        ? Number(
            (
              reviews.reduce((total, review) => total + review.rating, 0) /
              totalReviews
            ).toFixed(1)
          )
        : 0;

    res.status(200).json({
      event: event.title,
      totalReviews,
      averageRating,
      reviews,
    });

  } catch (error) {
    console.error("Fetch reviews error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid event ID",
      });
    }

    res.status(500).json({
      message: "Server error while fetching reviews",
    });
  }
});

// GET REVIEWS SUBMITTED BY LOGGED-IN STUDENT
router.get(
  "/my-reviews",
  protect,
  authorize("student"),
  async (req, res) => {
    try {
      const reviews = await Review.find({
        user: req.user._id,
      })
        .populate("event", "title date")
        .sort({ createdAt: -1 });

      res.status(200).json({
        count: reviews.length,
        reviews,
      });

    } catch (error) {
      console.error("Fetch my reviews error:", error);

      res.status(500).json({
        message: "Server error while fetching your reviews",
      });
    }
  }
);

// UPDATE OWN REVIEW (Student only)
router.put(
  "/:reviewId",
  protect,
  authorize("student"),
  async (req, res) => {
    try {
      const { reviewId } = req.params;
      const { rating, comment } = req.body;

      if (
        !Number.isInteger(Number(rating)) ||
        Number(rating) < 1 ||
        Number(rating) > 5
      ) {
        return res.status(400).json({
          message: "Rating must be between 1 and 5",
        });
      }

      if (
        typeof comment !== "string" ||
        comment.trim().length < 3 ||
        comment.trim().length > 1000
      ) {
        return res.status(400).json({
          message: "Review must be between 3 and 1000 characters",
        });
      }

      const review = await Review.findById(reviewId);

      if (!review) {
        return res.status(404).json({
          message: "Review not found",
        });
      }

      if (review.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message: "You cannot edit someone else's review",
        });
      }

      review.rating = Number(rating);
      review.comment = comment.trim();

      await review.save();

      res.status(200).json({
        message: "Review updated successfully",
        review,
      });

    } catch (error) {
      console.error("Update review error:", error);

      if (error.name === "CastError") {
        return res.status(400).json({
          message: "Invalid review ID",
        });
      }

      res.status(500).json({
        message: "Server error while updating review",
      });
    }
  }
);

// DELETE OWN REVIEW (Student only)
router.delete(
  "/:reviewId",
  protect,
  authorize("student"),
  async (req, res) => {
    try {
      const review = await Review.findById(req.params.reviewId);

      if (!review) {
        return res.status(404).json({
          message: "Review not found",
        });
      }

      if (review.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message: "You cannot delete someone else's review",
        });
      }

      await review.deleteOne();

      res.status(200).json({
        message: "Review deleted successfully",
      });

    } catch (error) {
      console.error("Delete review error:", error);

      if (error.name === "CastError") {
        return res.status(400).json({
          message: "Invalid review ID",
        });
      }

      res.status(500).json({
        message: "Server error while deleting review",
      });
    }
  }
);

module.exports = router;