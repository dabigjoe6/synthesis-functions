import chromium from 'chrome-aws-lambda';
import { inifinteScrollToBottom } from "../utils/scrapeHelpers.js";
import { viewport } from '../utils/constants.js';
import { cleanHTMLContent } from "../utils/preprocessing.js";
import { ResourceI } from '../index.js';
import { Browser, ElementHandle, Page } from 'puppeteer-core';


export default class Medium {
  browser: Browser
  page: Page;

  async initPuppeteer() {
    this.browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    this.page = await this.browser.newPage();
    this.page.setViewport(viewport);
  }

  private async getPostsMetaData(posts: ElementHandle<HTMLElement>[]): Promise<Partial<ResourceI>[]> {
    console.log("Generating metadata from posts");
    const result: Partial<ResourceI>[] = [];
    for await (const [index, post] of posts.entries()) {
      //Get post URL
      const urlElement = await post.$('a[aria-label="Post Preview Title"]');

      const href = urlElement && (await urlElement.getProperty("href"));
      const url: string = (href && (await href.jsonValue()) as string) || "";

      //Get post title
      const titleElement = await post.$("h2");
      const titleInnerHTML =
        titleElement && (await titleElement.getProperty("innerHTML"));
      const title: string = (titleInnerHTML && (await titleInnerHTML.jsonValue())) || "";

      //Get description
      const descriptionElement = await post.$("a > div > p");
      const descriptionInnerHTML =
        descriptionElement &&
        (await descriptionElement.getProperty("innerHTML"));
      const description: string =
        (descriptionInnerHTML && (await descriptionInnerHTML.jsonValue())) || "";

      //Get image
      const imageElement = await post.$("img");
      const imageElementSrc =
        imageElement && (await imageElement.getProperty("src"));
      const image: string = (imageElementSrc && (await imageElementSrc.jsonValue())) || "";

      // Make sure there's at least url and title
      if (url && title) {
        result.push({
          url,
          title,
          description,
          image,
          latest: index === 0, // TODO: Fix this logic as there are pinned posts in Medium
        });
      }
    }

    console.log("Done generating metadata");

    return result;
  }

  // Checks if its a valid medium account
  async isPageValid() {
    const divElements = await this.page.$$("div");
    const anchorElements = await this.page.$$("a");
    let is404 = null;
    let isMediumPage = false;
    for (const divElement of divElements) {
      const innerText = await this.page.evaluate(
        (el) => el.innerText,
        divElement
      );

      if (innerText.toLowerCase().includes("page not found")) {
        is404 = innerText;
      }
    }

    for (const anchorElement of anchorElements) {
      const mediumIcon = await this.page.evaluate(
        (el) => el.getAttribute("href"),
        anchorElement
      );

      if (mediumIcon && mediumIcon.includes("medium.com")) {
        isMediumPage = true;
      }
    }

    return !is404 && isMediumPage;
  }

  async getAllPosts(authorsUrl: string, shouldScrollToBottom: boolean = true): Promise<Partial<ResourceI>[] | undefined> {
    try {
      await this.initPuppeteer();

      console.log("Visiting ", authorsUrl);
      await this.page.goto(authorsUrl, { waitUntil: "networkidle2" });

      let postsMetadata: Partial<ResourceI>[];

      if (await this.isPageValid()) {
        console.log("Loaded", authorsUrl);

        if (shouldScrollToBottom) {
          await inifinteScrollToBottom(this.page);
        }

        const posts: ElementHandle<HTMLElement>[] = await this.page.$$("article");

        postsMetadata = await this.getPostsMetaData(posts);

      } else {
        throw new Error(
          "Could not fetch posts from author: " +
          authorsUrl +
          " as its not a valid medium page"
        );
      }

      return postsMetadata;

    } catch (err) {
      console.log("Couldn't get all posts - medium", err);
    } finally {
      this.killPuppeteer();
    }
  }

  async getPost(url: string) {
    try {
      // init puppeteer
      await this.initPuppeteer();

      console.log("Visiting ", url);

      await this.page.goto(url, { waitUntil: "networkidle2" });

      // check if page is valid
      const isValid = await this.page.evaluate(() => {
        const article = document.querySelector("article");
        return article && article.innerHTML;
      });

      if (isValid) {
        console.log("Loaded", url);

        const postContent = await this.page.$("article");

        const postContentInnerHTML =
          postContent && (await postContent.getProperty("innerHTML"));

        const postContentHTML: string =
          (postContentInnerHTML && (await postContentInnerHTML.jsonValue())) || "";

        let content = cleanHTMLContent(postContentHTML);

        // get 500 tokens from data. That's about 2000 characters
        const tokens = content.split(" ").slice(0, 500).join(" ");
        const lastStopIndex = tokens.lastIndexOf(".");

        if (lastStopIndex > 0) {
          content = tokens.slice(0, lastStopIndex + 1);
        }

        return content;
      } else {
        throw new Error(
          "Could not fetch post from url: " +
          url +
          " as its not a valid medium page"
        );
      }
    } catch (err) {
      console.log(`Couldn't get post - medium ${url}`, err);
    } finally {
      this.killPuppeteer();
    }
  }

  async killPuppeteer() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}
