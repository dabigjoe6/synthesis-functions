import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import Sendgrid from "@sendgrid/mail";
import readingTime from "reading-time";

import { ResourceI } from "./utils/constants.js";
import Summarizer from "./utils/summarize.js";
import { cleanHTMLContent } from "./utils/preprocessing.js";
import generateEmailTemplate from "./utils/email/generateEmailTemplate.js";


const __filename = fileURLToPath(import.meta.url);
dotenv.config({ path: path.resolve(__filename, "../../.env") });

class SendFeed {

  user: any;
  resources: ResourceI[];
  latestResources: ResourceI[];
  timeToSend: number;

  BASE_URL = process.env.BASE_URL;



  constructor(message: Array<string>) {
    this.user = JSON.parse(message[1]);
    this.resources = JSON.parse(message[2]);
    this.latestResources = JSON.parse(message[3]);
    this.timeToSend = Number(message[4]);
  }

  async summarizePost(content: string): Promise<string> {
    const summarizer = new Summarizer();
    return (await summarizer.summarize(cleanHTMLContent(content))) || "";
  }


  async summarizeResources(resources: ResourceI[]) {
    try {
      const newResources: ResourceI[] = [];
      for (const resource of resources) {
        resource.readLength = readingTime(resource.content || resource.description || "").text
        if ((!resource.summary || resource.summary.length < 100) && (resource.content || resource.description)) {
          resource.summary = await this.summarizePost(resource.content ?
            resource.content :
            resource.description ?
              resource.description : "");
          resource.isUpdate = true;
        }
        newResources.push(resource)
      }

      return newResources;
    } catch (err) {
      // Handle errors with summarizing, allowing it to fail silently 
      // so users can still get the digests without summarization
      console.error("Something went wrong with summarizing", err);
    } finally {
      return resources;
    }
  }

  async sendEmail() {
    try {
      console.log("Sending email to user: " + this.user.email);
      const message = generateEmailTemplate(this.resources, this.latestResources, this.user.isSummaryEnabled);
      Sendgrid.setApiKey(process.env.SENDGRID_API_KEY || "");
      await Sendgrid.send({
        to: this.user.email,
        from: {
          email: (process.env.FROM || ""),
          name: process.env.FROM_NAME || 'Synthesis',
        },
        subject: "Your personalized source for informative and inspiring content",
        text: "Your daily dose of knowledge, tailored for you: Stay informed effortlessly with your personal digest.",
        html: message,
        sendAt: this.timeToSend
      });
      console.log("Email sent to user: " + this.user.email);
    } catch (err) {
      console.error("Couldn't send email to user: " + this.user.email);
      throw err;
    }
  }

  async markResourcesAsSeen() {
    try {
      console.log("Marking resources as seen for user: " + this.user.email);

      const seenResources = this.resources.map(resource => resource.id);
      const seenLatestResources = this.latestResources.map(resource => resource.id);

      const response = await fetch(this.BASE_URL + "/user/mark-seen-resources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: this.user.id, seenResources: [...seenResources, ...seenLatestResources] }),
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
  }

  async updateResourcesWithNewSummaries() {
    try {
      const resourcesWithNewSummaries = [...this.resources, ...this.latestResources].map(resource => {
        const resourceUpdate: { id: string, summary?: string; readLength?: string; } = { id: resource.id };
        if (resource.isUpdate) {
          if (resource.summary) {
            resourceUpdate['summary'] = resource.summary;
          }

          if (resource.readLength) {
            resourceUpdate['readLength'] = resource.readLength;
          }

          return resourceUpdate;
        }
      });

      const filteredResourcesWithUpdates = resourcesWithNewSummaries.filter(resource => resource !== undefined);


      if (filteredResourcesWithUpdates.length > 0) {
        console.log("Updating resources");

        const response = await fetch(this.BASE_URL + "/resource/update-resources", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resources: filteredResourcesWithUpdates
          }),
        });

        const data: { message?: string } = (await response.json()) || { message: '' };

        if (!response.ok) {
          if (response.status === 404) throw new Error("Not found: " + data?.message || "");
          else if (response.status === 401)
            throw new Error("Unauthorized: " + data?.message);
          else throw new Error(data?.message);
        }

        console.log("Succesfully updated resources", data.message);
      }
    } catch (err) {
      console.error("Could not update resources, something went wrong: ", err)
    }
  }

  async init() {
    if (this.user.isSummaryEnabled) {
      console.log("Summary enabled for user")
      this.resources = (await this.summarizeResources(this.resources));
      this.latestResources = (await this.summarizeResources(this.latestResources));
    } else {
      console.log("Summary disabled for user")
    }

    await this.sendEmail();
    await this.markResourcesAsSeen();
    await this.updateResourcesWithNewSummaries();
  }
};

export default SendFeed;