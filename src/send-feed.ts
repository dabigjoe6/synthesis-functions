import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Sendgrid from "@sendgrid/mail";
import fetch from "node-fetch";

import generateEmailTemplate from "./utils/generateEmailTemplate.js";
import Summarizer from "./utils/summarize.js";
import { Sources, ResourceI } from "./utils/constants.js";

import MediumScraper from './scrapers/Medium.js';
import SubstackScraper from './scrapers/Substack.js';


const __filename = fileURLToPath(import.meta.url);
dotenv.config({ path: path.resolve(__filename, "../../.env") });


const BASE_URL = process.env.BASE_URL;


const summarizeMediumPost = async (resource: ResourceI, summarizer: Summarizer) => {

  const mediumScraper = new MediumScraper();
  const mediumPost = await mediumScraper.getPost(resource.url);

  // summarize
  if (mediumPost) {
    resource.post = mediumPost;
    resource.summary = await summarizer.summarize(mediumPost);
    resource.isSummaryNew = true;
    resource.lastSummaryUpdate = new Date();
  } else {
    throw new Error("Could not get medium post");
  }
};

const summarizeSubstackPost = async (resource: ResourceI, summarizer: Summarizer) => {
  const substackScraper = new SubstackScraper();
  const substackPost = await substackScraper.getPost(resource.url);

  // summarize
  if (substackPost) {
    resource.post = substackPost;
    resource.summary = await summarizer.summarize(substackPost);
    resource.isSummaryNew = true;
    resource.lastSummaryUpdate = new Date();
  } else {
    throw new Error("Could not get substack post");
  }
};

const summarizeRSSPost = async (resource: ResourceI, summarizer: Summarizer) => {
  if (resource.content) {
    resource.summary = await summarizer.summarize(resource.content);
    resource.isSummaryNew = true;
    resource.lastSummaryUpdate = new Date();
  }
}


const summarizeResources = async (resources: ResourceI[]) => {
  const summarizer = new Summarizer();

  try {
    for (const resource of resources) {
      if (!resource.summary) {
        switch (resource.source) {
          case Sources.MEDIUM:
            await summarizeMediumPost(resource, summarizer);
            break;
          case Sources.SUBSTACK:
            await summarizeSubstackPost(resource, summarizer);
            break;
          case Sources.RSS:
            await summarizeRSSPost(resource, summarizer);
            break;
          default:
            // do nothing
            break;
        }
      }
    }
  } catch (err) {
    // Handle errors with summarizing, allowing it to fail silently 
    // so users can still get the digests without summarization
    console.error("Something went wrong with summarizing", err);
  }
}

const handleSendFeed = async (message: Array<string>) => {
  const user = JSON.parse(message[1]);
  const resources = JSON.parse(message[2]);
  const latestResources = JSON.parse(message[3]);
  const timeToSend = Number(message[4]);

  if (user.isSummaryEnabled) {
    console.log("Summary enabled for user")
    try {
      await summarizeResources(resources);
      await summarizeResources(latestResources);
    } catch (err) {
      console.error(
        "Couldn't summarize resources for user: " + user.email
      );
      throw err;
    }
  } else {
    console.log("Summary disabled for user")
  }

  try {
    console.log("Sending email to user: " + user.email);
    const message = generateEmailTemplate(resources, latestResources, user.isSummaryEnabled);
    Sendgrid.setApiKey(process.env.SENDGRID_API_KEY || "");
    await Sendgrid.send({
      to: user.email,
      from: (process.env.FROM || ""),
      subject: "Your personalized source for informative and inspiring content",
      text: "Your daily dose of knowledge, tailored for you: Stay informed effortlessly with your personal digest.",
      html: message,
      sendAt: timeToSend
    });
    console.log("Email sent to user: " + user.email);
  } catch (err) {
    console.error("Couldn't send email to user: " + user.email);
    throw err;
  }


  try {
    console.log("Marking resources as seen for user: " + user.email);

    const seenResources = resources.map((resource: { id: string }) => resource.id);
    const seenLatestResources = latestResources.map((resource: { id: string }) => resource.id);


    const response = await fetch(BASE_URL + "/user/mark-seen-resources", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: user.id, seenResources: [...seenResources, ...seenLatestResources] }),
    });

    const data: { message?: string } = (await response.json()) || { message: '' };

    if (!response.ok) {
      if (response.status === 404) throw new Error("Not found: " + data?.message || "");
      else if (response.status === 401)
        throw new Error("Unauthorized: " + data?.message);
      else throw new Error(data?.message);
    }

    console.log("Succesfully marked resources as seen!", data.message);
  } catch (err) {
    console.warn("Could not mark resource as seen", err);
  }

  try {
    const resourcesWithNewSummaries = [...(resources.map((resource: { id: string, summary: string; isSummaryNew: boolean }) => {
      if (resource.summary && resource.isSummaryNew) {
        return {
          id: resource.id,
          summary: resource.summary
        }
      }
    })), ...(latestResources.map((resource: { id: string, summary: string; isSummaryNew: boolean }) => {
      if (resource.summary && resource.isSummaryNew) {
        return {
          id: resource.id,
          summary: resource.summary
        }
      }
    }))]

    const filteredResourcesWithNewSummaries = resourcesWithNewSummaries.filter(resource => resource !== undefined);


    if (filteredResourcesWithNewSummaries.length > 0) {
      console.log("Saving summaries of resources");

      const response = await fetch(BASE_URL + "/resource/update-resource-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resources: filteredResourcesWithNewSummaries
        }),
      });

      const data: { message?: string } = (await response.json()) || { message: '' };

      if (!response.ok) {
        if (response.status === 404) throw new Error("Not found: " + data?.message || "");
        else if (response.status === 401)
          throw new Error("Unauthorized: " + data?.message);
        else throw new Error(data?.message);
      }

      console.log("Succesfully saved resource summaries", data.message);
    }
  } catch (err) {
    console.error("Could not save summaries, something went wrong: ", err)
  }
}

export default handleSendFeed;