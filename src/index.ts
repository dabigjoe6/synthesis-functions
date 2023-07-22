import dotenv from "dotenv";
import path from "path";
import { SQSEvent, Handler } from 'aws-lambda';
import { fileURLToPath } from "url";

import SendFeed from "./send-feed.js";
import SyncFeed from "./sync-feed.js";
import Subscription from './subscription.js';

import sendWelcomeEmail from "./send-welcome-email.js";

const __filename = fileURLToPath(import.meta.url);

dotenv.config({ path: path.resolve(__filename, "../../.env") });

export const handler: Handler = async (event: SQSEvent) => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);

  const message = event.Records[0]["body"].split("synthesismessage");

  console.log("Received message: ", message);

  if (message[0] === 'subscription') {
    const subscription = new Subscription(message);
    await subscription.init();
  } else if (message[0] === 'sendfeed') {
    const sendFeed = new SendFeed(message);
    await sendFeed.init();
  } else if (message[0] === 'syncfeed') {
    const syncFeed = new SyncFeed(message);
    await syncFeed.init();
  } else if (message[0] === 'welcomeemail') {
    await sendWelcomeEmail(message);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Synthesis scrapers',
    }),
  };
};