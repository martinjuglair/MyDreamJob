import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export function getModel(): LanguageModel {
  const provider = process.env.AI_PROVIDER || "google";

  switch (provider) {
    case "google":
      return createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_AI_API_KEY,
      })(process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash");

    case "anthropic":
      return createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      })(process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514");

    case "openai":
      return createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })(process.env.OPENAI_MODEL || "gpt-4o");

    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}
