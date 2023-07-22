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


class SyncFeed {

  authorId: string;
  url: string;
  source: Sources;
  newPosts: ResourceI[];

  BASE_URL = process.env.BASE_URL;

  constructor(message: Array<string>) {
    this.authorId = (message[1] as unknown) as string;
    this.url = (message[2] as unknown) as string;
    this.source = (message[3] as unknown) as Sources;
  }

  private getScraperInstance(source: Sources) {
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

  private async syncAuthorsResources(posts: Array<ResourceI>, authorId: string) {
    const response = await fetch(this.BASE_URL + "/resource/sync-resources", {
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


  private async syncPosts(newPosts: ResourceI[], service: Sources, authorId: string) {
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

    let posts = newPosts.map((post) => ({
      ...post,
      source: service,
      author: authorId,
      latest: true
    }));

    console.log("Saving posts to DB");
    //Update Resource collection with new posts
    await this.syncAuthorsResources(posts, authorId);
    return;
  };

  async init() {
    try {
      const scraperInstance = this.getScraperInstance(this.source);
      this.newPosts = (await scraperInstance.getAllPosts(this.url)) as ResourceI[];
      await this.syncPosts(this.newPosts, this.source, this.authorId)
    } catch (err) {
      console.error("Could not sync feed: ", err);
    }
  }
}

export default SyncFeed;