import jsdom from "jsdom";
import RssParser from "rss-parser";
import { ResourceI } from "../utils/constants.js";

const { JSDOM } = jsdom;

export default class RSS {
  async getPostsMetadata(posts: ({
    [key: string]: any;
  } & RssParser.Item)[]): Promise<Partial<ResourceI>[]> {
    console.log("Generating metadata from posts");
    const result = [];

    for await (const [index, post] of posts.entries()) {
      // Get post URL
      const url: string = post?.link || "";

      // Get post title
      const title: string = post?.title || "";

      // Get post description
      const description: string = post?.contentSnippet || "";

      // Get post content
      const content: string = post?.content || "";

      // Get image
      const dom = new JSDOM(post.content);
      const image: string = dom.window.document.querySelector("img")?.src || "";

      // Get published date
      const datePublished: Date = new Date(post?.pubDate || "");

      // Get authors name
      const pattern = /^(?:https?:\/\/)?([^/]+).*$/;
      const match = (post?.link || "").match(pattern);
      const authorsName: string = (match && match[1] || "");

      if (url && title) {
        result.push({
          url,
          title,
          image,
          description,
          datePublished,
          content,
          authorsName,
          latest: false,
        });
      }
    }

    console.log("Done generating metadata");

    return result;
  }

  async getAllPosts(authorsUrl: string): Promise<Partial<ResourceI>[] | undefined> {
    try {
      console.log("Visiting", authorsUrl);
      const rssParser = new RssParser();
      let feed = await rssParser.parseURL(authorsUrl);

      console.log("Loaded", authorsUrl);

      if (!feed || !feed.items || !feed.items.length) {
        throw new Error(
          "Could not fetch posts from author: " +
          authorsUrl +
          " as its not a valid RSS feed"
        );
      }

      const postsMetadata = await this.getPostsMetadata(feed.items);
      return postsMetadata;
    } catch (err) {
      console.log("Couldn't get all posts - rss", err);
    }
  }
}
