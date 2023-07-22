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


class Subscription {

  authorId: string;
  url: string;
  service: Sources;

  BASE_URL = process.env.BASE_URL;

  constructor(message: Array<string>) {
    this.authorId = (message[1] as unknown) as string;

    if (!this.authorId) {
      throw new Error(
        "Could not get author Id - subscriptionConsumer.ts"
      );
    }
    this.url = message[2];
    if (!this.url) {
      throw new Error(
        "Could not get authors url - subscriptionConsumer.ts"
      );
    }
    this.service = (message[3] as unknown) as Sources;
    if (!this.service) {
      throw new Error(
        "Could not determine service - subscriptionConsumer.ts"
      );
    }
  }

  private async handleMediumService(): Promise<Partial<ResourceI>[]> {
    const mediumScraper = new Medium();
    console.log(
      "Scraping medium for authorId: " + this.authorId + " from URL: " + this.url
    );
    return (await mediumScraper.getAllPosts(this.url)) || [];
  };

  private async handleSubstackService(): Promise<Partial<ResourceI>[]> {
    const substackScraper = new Substack();
    console.log(
      "Scraping substack for authorId: " + this.authorId + " from URL: " + this.url
    );
    return (await substackScraper.getAllPosts(this.url)) || [];
  };

  private async handleRSSService(): Promise<Partial<ResourceI>[]> {
    const rssScraper = new RSS();
    console.log(
      "Scraping RSS feed for authorId: " + this.authorId + " from URL: " + this.url
    );
    return (await rssScraper.getAllPosts(this.url)) || [];
  }

  private async getPostsFromService() {
    let posts: Partial<ResourceI>[] = [];
    switch (this.service) {
      case Sources.MEDIUM:
        posts = await this.handleMediumService()
        break;
      case Sources.SUBSTACK:
        posts = await this.handleSubstackService();
        break;
      case Sources.RSS:
        posts = await this.handleRSSService();
        break;
      default:
        posts = [];
        throw new Error("Service not supported: " + this.service);
    }

    if (posts && isArray(posts) && posts.length > 0) {
      posts = posts.map((post) => ({
        ...post,
        source: this.service,
        author: this.authorId,
      }));
    } else if (posts.length === 0) {
      console.warn("Empty posts");
    } else if (!isArray(posts)) {
      console.warn("Posts not an array, expecting an array");
    } else {
      console.warn("Posts is " + posts);
    }

    return posts
  }

  private async savePostsToDB(posts: Partial<ResourceI>[]) {
    try {
      console.log("Saving posts to DB");
      //Update Resource collection with crawled articles
      const response = await fetch(this.BASE_URL + "/subscribe/saveAuthorsPosts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ posts, source: this.service }),
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
      console.error("Could not save posts to DB", err);
    }
  }

  async init() {
    await this.savePostsToDB(await this.getPostsFromService())
  };

};

export default Subscription;