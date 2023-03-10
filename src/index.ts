import dotenv from "dotenv";
import path from "path";
import { SQSEvent, Handler } from 'aws-lambda';
import { fileURLToPath } from "url";

import handleSubscription from "./subscription.js";
import handleSendFeed from "./send-feed.js";
import handleSyncFeed from "./sync-feed.js";

const __filename = fileURLToPath(import.meta.url);

dotenv.config({ path: path.resolve(__filename, "../../.env") });

export const handler: Handler = async (event: SQSEvent) => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);

  const message = event.Records[0]["body"].split("synthesismessage");

  console.log("Received message: ", message);

  if (message[0] === 'subscription') {
    await handleSubscription(message);
  } else if (message[0] === 'sendfeed') {
    await handleSendFeed(message);
  } else if (message[0] === 'syncfeed') {
    await handleSyncFeed(message);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Synthesis scrapers',
    }),
  };
};