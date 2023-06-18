import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Sendgrid from "@sendgrid/mail";

import welcomeEmailTemplate from "./utils/email/welcomeEmailTemplate.js";

const __filename = fileURLToPath(import.meta.url);
dotenv.config({ path: path.resolve(__filename, "../../.env") });

const handleWelcomeEmail = async (message: Array<string>) => {
  const email = message[1];

  try {
    console.log("Sending welcome email to user: " + email);
    const message = welcomeEmailTemplate();
    Sendgrid.setApiKey(process.env.SENDGRID_API_KEY || "");
    await Sendgrid.send({
      to: email,
      from: (process.env.FROM || ""),
      subject: "Welcome to Synthesis",
      text: "Your daily dose of knowledge, tailored for you: Stay informed effortlessly with your personal digest.",
      html: message
    });
    console.log("Email sent to user: " + email);
  } catch (err) {
    console.error("Couldn't send welcome email to user: " + email);
    throw err;
  }
};

export default handleWelcomeEmail;