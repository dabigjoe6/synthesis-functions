import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

import fetch from "node-fetch";

import { Sources, ResourceI } from "./utils/constants.js";

import Medium from "./scrapers/Medium.js";
import Substack from "./scrapers/Substack.js";
import RSS from "./scrapers/RSS.js";

import lodash from "lodash";

const { isArray } = lodash;

const __filename = fileURLToPath(import.meta.url);

dotenv.config({ path: path.resolve(__filename, "../../.env") });

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

export default handleSubscription;