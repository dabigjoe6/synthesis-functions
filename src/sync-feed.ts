import dotenv from "dotenv";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import path from "path";


import { Sources, ResourceI } from "./utils/constants.js";

import Medium from "./scrapers/Medium.js";
import Substack from "./scrapers/Substack.js";
import RSS from "./scrapers/RSS.js";

import lodash from "lodash";

const { isArray } = lodash;
const __filename = fileURLToPath(import.meta.url);

dotenv.config({ path: path.resolve(__filename, "../../.env") });

const BASE_URL = process.env.BASE_URL;

const syncAuthorsResources = async (posts: Array<ResourceI>, authorId: string) => {

  const response = await fetch(BASE_URL + "/resource/sync-resources", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ posts, authorId }),
  });

  const data: { message?: string } = (await response.json()) || { message: '' };

  if (!response.ok) {
    if (response.status === 404) throw new Error("Not found: " + data?.message || "");
    else if (response.status === 401)
      throw new Error("Unauthorized: " + data?.message);
    else throw new Error(data?.message);
  }

  console.log("Succesfully saved posts!", data.message);
}


const syncPosts = async (newPosts: ResourceI[], mostRecentPostsInDb: ResourceI[], service: Sources, authorId: string) => {
  if (!newPosts) {
    console.error(
      "newPosts is undefined but required - syncResourcesConsumer"
    );
    return;
  }

  if (isArray(newPosts) && !newPosts.length) {
    console.warn("No new posts - syncResourcesConsumer");
    return;
  }

  if (
    !mostRecentPostsInDb ||
    (isArray(mostRecentPostsInDb) && !mostRecentPostsInDb.length)
  ) {
    let posts = newPosts.map((post) => ({
      ...post,
      source: service,
      author: authorId,
    }));

    console.log("Saving posts to DB");
    //Update Resource collection with new posts
    await syncAuthorsResources(posts, authorId);
    return;
  }

  // Check for new posts thats does not exist in DB
  const newPostsNotInDb: ResourceI[] = [];
  const mostRecentPostsMap: {
    [key: string]: ResourceI
  } = {};

  mostRecentPostsInDb.forEach((mostRecentPost) => {
    mostRecentPostsMap[mostRecentPost.url] = mostRecentPost;
  });

  newPosts.forEach((newPost) => {
    if (newPost.url && !(newPost.url in mostRecentPostsMap)) {
      newPostsNotInDb.push(newPost);
    }
  });

  let posts = newPostsNotInDb.map((post) => ({
    ...post,
    source: service,
    author: authorId,
  }));

  console.log("Saving posts to DB");
  await syncAuthorsResources(posts, authorId)
};


const getScraperInstance = (source: Sources) => {
  switch (source) {
    case Sources.MEDIUM:
      return new Medium();
    case Sources.SUBSTACK:
      return new Substack();
    case Sources.RSS:
      return new RSS();
    default:
      throw new Error("Not a valid source - syncResourcesConsumer");
  }
};

const handleSyncFeed = async (message: Array<string>) => {
  const authorId = (message[1] as unknown) as string;
  const url = (message[2] as unknown) as string;
  const source = (message[3] as unknown) as Sources;
  const mostRecentPostsInDb = (message[4] as unknown) as string


  const scraperInstance = getScraperInstance(source);

  const newPosts = (await scraperInstance.getAllPosts(url, false)) as ResourceI[];

  await syncPosts(newPosts, JSON.parse(mostRecentPostsInDb), source, authorId)
}

export default handleSyncFeed;