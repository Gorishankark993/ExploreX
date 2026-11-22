const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");
const connectDB = require("./config/db");

const User = require("./models/User");
const Event = require("./models/Event");
const Registration = require("./models/Registration");

const testModels = async () => {
  try {
    await connectDB();

    // 1. Create a test user
    const user = await User.create({
      name: "Test Student",
      email: "teststudent@example.com",
      password: "test123456",
      role: "student",
    });

    console.log("User created:", user._id);

    // 2. Create an event
    const event = await Event.create({
      title: "Tech Fest 2026",
      description: "A technology event for students.",
      category: "Technology",
      date: new Date("2026-12-20"),
      location: "College Campus",
      organizer: user._id,
      capacity: 100,
    });

    console.log("Event created:", event._id);

    // 3. Register the user for the event
    const registration = await Registration.create({
      user: user._id,
      event: event._id,
    });

    console.log("Registration created:", registration._id);

    // 4. Verify saved records
    const savedUser = await User.findById(user._id);
    const savedEvent = await Event.findById(event._id);
    const savedRegistration = await Registration.findById(
      registration._id
    );

    console.log("User retrieved:", savedUser.name);
    console.log("Event retrieved:", savedEvent.title);
    console.log("Registration retrieved:", !!savedRegistration);

    // Clean up test records
    await Registration.deleteOne({ _id: registration._id });
    await Event.deleteOne({ _id: event._id });
    await User.deleteOne({ _id: user._id });

    console.log("Test records cleaned up.");
    console.log("DATABASE OPERATIONS TEST PASSED.");

  } catch (error) {
    console.error("Test failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

testModels();