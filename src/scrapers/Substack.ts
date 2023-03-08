import { Browser, Page, ElementHandle, JSHandle } from "puppeteer-core";
import chromium from "chrome-aws-lambda";
import { cleanHTMLContent } from "../utils/preprocessing.js";
import { inifinteScrollToBottom } from "../utils/scrapeHelpers.js";
import { viewport } from "../utils/constants.js";
import { ResourceI } from "../index.js";

export default class Substack {
  browser: Browser;
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

  async getPostsMetaData(posts: ElementHandle<HTMLElement>[]): Promise<Partial<ResourceI>[]> {
    console.log("Generating metadata from posts");
    const result = [];

    for await (const [index, post] of posts.entries()) {
      // Get post URL
      const urlElement = await post.$('a[class~="post-preview-title"]');
      const href = urlElement && (await urlElement.getProperty("href"));
      const url: string = (href && (await href.jsonValue()) as string) || "";

      // Get post title
      const titleInnerHTML =
        urlElement && (await urlElement.getProperty("innerHTML"));
      const title: string = (titleInnerHTML && (await titleInnerHTML.jsonValue())) || "";

      // Get post description
      const descriptionElement = await post.$(
        'a[class="post-preview-description"]'
      );
      const descriptionInnerHTML: JSHandle<string> | null | undefined =
        descriptionElement &&
        (await descriptionElement.getProperty("innerHTML"));
      let description: string = "";

      if (descriptionInnerHTML) {
        description = (descriptionElement && (await descriptionInnerHTML.jsonValue())) || "";
      }

      // Get image
      const imageWrapper = await post.$('div[class="post-preview-image"]');
      const imageElement = imageWrapper && (await imageWrapper.$("img"));
      const imageSrc = imageElement && (await imageElement.getProperty("src"));
      const image: string = (imageSrc && (await imageSrc.jsonValue())) || "";

      // Get author
      const authorWrapper = await post.$('div[class="profile-hover-wrapper"]');
      const authorElement = authorWrapper && (await authorWrapper.$("a"));
      const authorInnerHTML =
        authorElement && (await authorElement.getProperty("innerHTML"));
      const authorsName: string =
        (authorInnerHTML && (await authorInnerHTML.jsonValue())) || "";

      // Get published date
      const timeElement = await post.$("time");
      const datePublishedString: string =
        (timeElement &&
          (await this.page.evaluate(
            (el) => el.getAttribute("datetime"),
            timeElement
          )) || "")

      const datePublished = new Date(datePublishedString);

      // Get number of likes
      const likesWrapper = await post.$(
        'a[class="post-ufi-button style-compressed has-label with-border"]'
      );
      const likesElement =
        likesWrapper && (await likesWrapper.$('div[class="label"]'));
      const likes =
        likesElement && (await likesElement.getProperty("innerHTML"));
      const numberOfLikes: number = Number(likes && (await likes.jsonValue())) || 0;

      // Get number of comments
      const commentsWrapper = await post.$(
        'a[class="post-ufi-button style-compressed post-ufi-comment-button has-label with-border"]'
      );
      const commentsElement =
        commentsWrapper && (await commentsWrapper.$('div[class="label"]'));
      const comments =
        commentsElement && (await commentsElement.getProperty("innerHTML"));
      const numberOfComments: number =
        Number(comments && (await comments.jsonValue())) || 0;

      if (url && title) {
        result.push({
          url,
          title,
          description,
          image,
          authorsName,
          datePublished,
          numberOfLikes,
          numberOfComments,
          latest: index === 0,
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
    let isSubstackPage = false;
    for (const divElement of divElements) {
      const innerText = await this.page.evaluate(
        (el) => el.innerText,
        divElement
      );

      if (innerText.toLowerCase().includes("not found")) {
        is404 = innerText;
      }
    }

    for (const anchorElement of anchorElements) {
      const substackLink = await this.page.evaluate(
        (el) => el.getAttribute("href"),
        anchorElement
      );

      if (substackLink && substackLink.includes("substack.com")) {
        isSubstackPage = true;
      }
    }

    return !is404 && isSubstackPage;
  }

  async getAllPosts(authorsUrl: string, shouldScrollToBottom: boolean = true): Promise<Partial<ResourceI>[] | undefined> {
    try {
      await this.initPuppeteer();

      console.log("Visiting", authorsUrl);
      await this.page.goto(authorsUrl, { waitUntil: "networkidle2" });

      if (await this.isPageValid()) {
        console.log("Loaded", authorsUrl);

        const welcomeBtn = (
          await this.page.$$('button[aria-label="Close"]')
        )[0];

        if (welcomeBtn) {
          welcomeBtn.click();
          await this.page.waitForTimeout(1000);
        }

        const seeAllBtn = (
          await this.page.$$('a[href="/archive?sort=new"]')
        )[0];

        if (seeAllBtn) {
          seeAllBtn.click();
          await this.page.waitForTimeout(3000);
        }

        if (shouldScrollToBottom) {
          await inifinteScrollToBottom(this.page);
        }

        const posts = await this.page.$$('div[class*="post-preview"]');

        const postsMetadata = await this.getPostsMetaData(posts);

        return postsMetadata;
      } else {
        throw new Error(
          "Could not fetch posts from author: " +
          authorsUrl +
          " as its not a valid Substack page"
        );
      }
    } catch (err) {
      console.log("Couldn't get all posts - substack", err);
    } finally {
      this.killPuppeteer();
    }
  }


  async getPost(url: string) {
    try {
      await this.initPuppeteer();

      console.log("Visiting", url);
      await this.page.goto(url, { waitUntil: "networkidle2" });

      const articleInnerHTML = await this.page.evaluate(() => {
        const article = document.querySelector(".available-content");
        return article && article.innerHTML;
      })

      if (articleInnerHTML) {
        console.log("Loaded", url);

        let content = cleanHTMLContent(articleInnerHTML);

        const tokens = content.split(" ").slice(0, 500).join(" ");
        const lastStopIndex = tokens.lastIndexOf('.');

        if (lastStopIndex > 0) {
          content = tokens.slice(0, lastStopIndex + 1);
        }

        return content;
      }
    } catch (err) {
      console.log(`Couldn't get post - substack ${url}`, err);
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
