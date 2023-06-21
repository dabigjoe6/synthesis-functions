import RssParser from "rss-parser";
import { ResourceI } from "../utils/constants.js";

export default class Substack {
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
      const content: string = post['content:encoded'] || "";

      // Get image
      const image: string = post?.enclosure?.url || "";

      // Get published date
      const datePublished: Date = new Date(post?.pubDate || "");

      // Get authors name
      const authorsName: string = post?.creator || "";

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
      let feed = await rssParser.parseURL(authorsUrl + '/feed');

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
      console.log("Couldn't get all posts - Substack", err);
    }
  }
}
