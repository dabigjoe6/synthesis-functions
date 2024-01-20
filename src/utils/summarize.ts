import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
dotenv.config({ path: path.resolve(__filename, "../../../.env") });

const RATE_LIMIT_PER_MINUTE = 20;
const DEFAULT_DELAY_IN_SECOND = 60 / RATE_LIMIT_PER_MINUTE;

export class Summarizer {
  client: OpenAI;

  constructor() {
    this.client = new OpenAI();
  }

  async summarize(text: string) {
    try {
      const MAX_CHARACTERS = 5000;
      const response = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            "role": "system",
            "content": "Summarize content you are provided with for a second-grade student."
          },
          {
            "role": "user",
            "content": `${text.length > MAX_CHARACTERS ? text.substring(0, MAX_CHARACTERS) : text}\n\n`,
          }],
      });

      return response?.choices[0]?.message?.content?.trim() || "";
    } catch (err) {
      console.warn("Error summarizing: ", err);
      return "";
    }
  }

  async summarizeDebounced(text: string) {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        const summary = await this.summarize(text);
        resolve(summary);
      }, DEFAULT_DELAY_IN_SECOND * 1000);
    });
  }
}

// Delay the request to avoid rate limit
export default Summarizer;
