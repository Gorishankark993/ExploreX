
require("dotenv").config();

const readline = require("readline");
const bcrypt = require("bcryptjs");

const connectDB = require("../config/db");
const User = require("../models/User");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

const createAdmin = async () => {
  try {
    console.log("\n===== UniEvents Admin Setup =====\n");

    const name = (await question("Enter admin name: ")).trim();
    const email = (await question("Enter admin email: "))
      .trim()
      .toLowerCase();
    const password = await question("Enter admin password: ");

    if (!name || !email || !password) {
      throw new Error("All fields are required.");
    }

    if (password.length < 6) {
      throw new Error("Password must contain at least 6 characters.");
    }

    await connectDB();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new Error(
        `An account with ${email} already exists. No changes were made.`
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
    });

    console.log("\nAdmin account created successfully!");
    console.log("Name:", admin.name);
    console.log("Email:", admin.email);
    console.log("Role:", admin.role);
  } catch (error) {
    console.error("\nAdmin creation failed:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();

    const mongoose = require("mongoose");
    await mongoose.disconnect().catch(() => {});
    process.exit(process.exitCode || 0);
  }
};

createAdmin();
