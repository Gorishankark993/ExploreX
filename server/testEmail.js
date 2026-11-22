
require("dotenv").config();

const { sendEmail } = require("./utils/emailService");

const testEmail = async () => {
  try {
    await sendEmail({
      to: process.env.EMAIL_USER,
      subject: "ExploreX - Email Test",
      html: `
        <h2>Welcome to ExploreX!</h2>
        <p>Your email notification system is working successfully.</p>
        <p>You will receive event registration confirmations and updates here.</p>
        <br/>
        <strong>Team ExploreX</strong>
        <p style="color: #777; font-size: 12px;">
          Discover. Connect. Experience.
        </p>
      `,
    });

    console.log("Test email delivered successfully!");
  } catch (error) {
    console.error("Test failed:", error.message);
  }
};

testEmail();
