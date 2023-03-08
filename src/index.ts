import dotenv from "dotenv";
import path from "path";
import { SQSEvent, Handler } from 'aws-lambda';
import lodash from "lodash";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import Sendgrid from "@sendgrid/mail";

import Summarizer from "./utils/summarize.js";
import MediumScraper from './scrapers/Medium.js';
import SubstackScraper from './scrapers/Substack.js';


import { Sources } from './utils/constants.js';

import Medium from './scrapers/Medium.js';
import Substack from './scrapers/Substack.js';
import RSS from './scrapers/RSS.js';
import generateEmailTemplate from "./utils/generateEmailTemplate.js";

const { isArray } = lodash;

const __filename = fileURLToPath(import.meta.url);

dotenv.config({ path: path.resolve(__filename, "../../../../.env") });


export interface ResourceI {
  url: string;
  title?: string;
  source?: Sources;
  description?: string;
  content?: string;
  summary?: string;
  lastSummaryUpdate?: Date;
  image?: string;
  authorsName?: string;
  datePublished?: Date;
  numberOfLikes?: number;
  numberOfComments?: number;
  latest: boolean;
  isSummaryNew?: boolean;
}

const BASE_URL = process.env.BASE_URL;


const handleMediumService = async (authorId: string, url: string): Promise<Partial<ResourceI>[]> => {
  const mediumScraper = new Medium();
  console.log(
    "Scraping medium for authorId: " + authorId + " from URL: " + url
  );
  return (await mediumScraper.getAllPosts(url)) || [];
};

const handleSubstackService = async (authorId: string, url: string): Promise<Partial<ResourceI>[]> => {
  const substackScraper = new Substack();
  console.log(
    "Scraping substack for authorId: " + authorId + " from URL: " + url
  );
  return (await substackScraper.getAllPosts(url)) || [];
};

const handleRSSService = async (authorId: string, url: string): Promise<Partial<ResourceI>[]> => {
  const rssScraper = new RSS();
  console.log(
    "Scraping RSS feed for authorId: " + authorId + " from URL: " + url
  );
  return (await rssScraper.getAllPosts(url)) || [];
}


const getPostsFromService = async (service: Sources, authorId: string, url: string) => {
  let posts: Partial<ResourceI>[] = [];
  switch (service) {
    case Sources.MEDIUM:
      posts = await handleMediumService(authorId, url)
      break;
    case Sources.SUBSTACK:
      posts = await handleSubstackService(authorId, url);
      break;
    case Sources.RSS:
      posts = await handleRSSService(authorId, url);
      break;
    default:
      posts = [];
      throw new Error("Service not supported: " + service);
  }

  if (posts && isArray(posts) && posts.length > 0) {
    posts = posts.map((post) => ({
      ...post,
      source: service,
      author: authorId,
    }));

    try {
      console.log("Saving posts to DB");
      //Update Resource collection with crawled articles
      const response = await fetch(BASE_URL + "/subscribe/saveAuthorsPosts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ posts, source: service }),
      });

      const data: { message?: string } = (await response.json()) || { message: '' };

      if (!response.ok) {
        if (response.status === 404) throw new Error("Not found: " + data?.message || "");
        else if (response.status === 401)
          throw new Error("Unauthorized: " + data?.message);
        else throw new Error(data?.message);
      }

      console.log("Succesfully saved posts!", data.message);
    } catch (err) {
      console.error(err);
    }

  } else if (posts.length === 0) {
    console.warn("Empty posts");
  } else if (!isArray(posts)) {
    console.warn("Posts not an array, expecting an array");
  } else {
    console.warn("Posts is " + posts);
  }
};

const summarizeMediumPost = async (resource: ResourceI, summarizer: Summarizer) => {

  const mediumScraper = new MediumScraper();
  const mediumPost = await mediumScraper.getPost(resource.url);

  // summarize
  if (mediumPost) {
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
    console.error("Something went wrong with summarizing", err);
  }
}

const handleSubscription = async (message: Array<string>) => {
  const authorId = (message[1] as unknown) as string;

  if (!authorId) {
    throw new Error(
      "Could not get author Id - subscriptionConsumer.ts"
    );
  }
  const url = message[2];
  if (!url) {
    throw new Error(
      "Could not get authors url - subscriptionConsumer.ts"
    );
  }
  const service = (message[3] as unknown) as Sources;
  if (!service) {
    throw new Error(
      "Could not determine service - subscriptionConsumer.ts"
    );
  }

  await getPostsFromService(service, authorId, url);
}

const handleSendFeed = async (message: Array<string>) => {
  const user = JSON.parse(message[1]);
  const resources = JSON.parse(message[2]);
  const latestResources = JSON.parse(message[3]);

  try {
    await summarizeResources(resources);
    await summarizeResources(latestResources);
  } catch (err) {
    console.error(
      "Couldn't summarize resources for user: " + user.email
    );
    throw err;
  }

  try {
    console.log("Sending email to user: " + user.email);
    const message = generateEmailTemplate(resources, latestResources);
    Sendgrid.setApiKey(process.env.SENDGRID_API_KEY || "");
    await Sendgrid.send({
      to: user.email,
      from: (process.env.FROM || ""),
      subject: "Your personalized source for informative and inspiring content",
      text: "Your daily dose of knowledge, tailored for you: Stay informed effortlessly with your personal digest.",
      html: message,
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
  }

  try {
    console.log("Saving summaries of resources");

    const resourcesWithNewSummaries = resources.map((resource: { id: string, summary: string; isSummaryNew: boolean }) => {
      if (resource.summary && resource.isSummaryNew) {
        return {
          id: resource.id,
          summary: resource.summary
        }
      }
    });

    const response = await fetch(BASE_URL + "/resource/update-resource-summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resources: resourcesWithNewSummaries
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
  } catch (err) {
  }
}


export const handler: Handler = async (event: SQSEvent) => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);

  const message = event.Records[0]["body"].split("synthesismessage");

  console.log("Received message: ", message);

  if (message[0] === 'subscription') {
    await handleSubscription(message);
  } else if (message[0] === 'sendfeed') {
    await handleSendFeed(message);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Synthesis subscriptions',
    }),
  };
};