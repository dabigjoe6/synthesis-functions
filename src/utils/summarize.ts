import { Configuration, OpenAIApi } from "openai";

const RATE_LIMIT_PER_MINUTE = 20;
const DEFAULT_DELAY_IN_SECOND = 60 / RATE_LIMIT_PER_MINUTE;

export class Summarizer {
  api: OpenAIApi;

  constructor() {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.api = new OpenAIApi(configuration);
  }

  async summarize(text: string) {
    const response = await this.api.createCompletion({
      model: "text-davinci-003",
      prompt: `${text}\n\nTl;dr`,
      temperature: 0.7,
      max_tokens: 2569,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 1,
    });

    return response?.data?.choices[0]?.text?.trim() || "";
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
