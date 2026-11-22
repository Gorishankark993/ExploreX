require("dotenv").config();

const { sendEmail } = require("./utils/emailService");

const testEmail = async () => {
  try {
    await sendEmail({
      to: process.env.EMAIL_USER,
      subject: "UniEvents - Email Test",
      html: `
        <h2>Welcome to UniEvents!</h2>
        <p>Your email notification system is working successfully.</p>
        <p>You will receive event registration confirmations and updates here.</p>
        <br/>
        <strong>Team UniEvents</strong>
      `,
    });

    console.log("Test email delivered successfully!");
  } catch (error) {
    console.error("Test failed:", error.message);
  }
};

testEmail();