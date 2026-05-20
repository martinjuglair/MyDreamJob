import * as cheerio from "cheerio";
import FirecrawlApp from "@mendable/firecrawl-js";

export interface ScrapeResult {
  success: boolean;
  content: string;
  title?: string;
  company?: string;
  location?: string;
  needsManualInput?: boolean;
}

const BLOCKED_PATTERNS = [
  "just a moment",
  "additional verification required",
  "checking your browser",
  "cloudflare",
  "captcha",
  "access denied",
  "error 403",
  "please verify you are a human",
  "are you a robot",
  "security check",
];

function isBlockedContent(content: string): boolean {
  const lower = content.toLowerCase();
  return (
    BLOCKED_PATTERNS.some((p) => lower.includes(p)) && content.length < 2000
  );
}

function extractLinkedInJobId(url: string): string | null {
  const match = url.match(/linkedin\.com\/jobs\/view\/(\d+)/);
  return match ? match[1] : null;
}

async function linkedInGuestStrategy(url: string): Promise<ScrapeResult> {
  const jobId = extractLinkedInJobId(url);
  if (!jobId) throw new Error("Not a LinkedIn job URL");

  const response = await fetch(
    `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    }
  );

  if (!response.ok) throw new Error(`LinkedIn returned ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);

  const title = $(".top-card-layout__title").text().trim();
  const company = $(".topcard__org-name-link").text().trim();
  const location = $(".topcard__flavor--bullet").first().text().trim();

  $("script, style, nav, footer, header").remove();
  const description = $(".description__text, .show-more-less-html__markup")
    .text()
    .trim();
  const fullBody = $("body").text().trim();
  const content = description.length > 100 ? description : fullBody;

  if (content.length < 100) throw new Error("Content too short");

  const formatted = [
    title && `Poste: ${title}`,
    company && `Entreprise: ${company}`,
    location && `Lieu: ${location}`,
    "",
    content.replace(/\s+/g, " ").trim(),
  ]
    .filter(Boolean)
    .join("\n");

  return { success: true, content: formatted, title, company, location };
}

async function firecrawlStrategy(url: string): Promise<ScrapeResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("No Firecrawl API key");

  const firecrawl = new FirecrawlApp({ apiKey });
  const result = await firecrawl.scrape(url, { formats: ["markdown"] }) as { markdown?: string };

  if (!result.markdown) {
    throw new Error("Firecrawl failed");
  }

  if (result.markdown.length < 200) throw new Error("Content too short");
  if (isBlockedContent(result.markdown))
    throw new Error("Blocked by anti-bot");

  return { success: true, content: result.markdown };
}

async function jinaReaderStrategy(url: string): Promise<ScrapeResult> {
  const response = await fetch(`https://r.jina.ai/${url}`, {
    headers: {
      Accept: "text/markdown",
      "X-Return-Format": "markdown",
    },
  });

  if (!response.ok) throw new Error(`Jina returned ${response.status}`);

  const content = await response.text();
  if (content.length < 200) throw new Error("Content too short");
  if (isBlockedContent(content)) throw new Error("Blocked by anti-bot");

  return { success: true, content };
}

async function cheerioStrategy(url: string): Promise<ScrapeResult> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });

  if (!response.ok) throw new Error(`Fetch returned ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);

  $("script, style, nav, footer, header, aside").remove();

  const title =
    $('meta[property="og:title"]').attr("content") || $("title").text() || "";
  const content = $("main, article, [role=main], .job-description, .content")
    .text()
    .trim();
  const fallbackContent = $("body").text().trim();
  const finalContent = content.length > 200 ? content : fallbackContent;

  if (finalContent.length < 100) throw new Error("Content too short");

  return {
    success: true,
    content: finalContent.replace(/\s+/g, " ").trim(),
    title,
  };
}

export async function scrapeJobUrl(url: string): Promise<ScrapeResult> {
  // 0. LinkedIn: use guest API (bypasses all protections)
  if (url.includes("linkedin.com/jobs/view/")) {
    try {
      const result = await linkedInGuestStrategy(url);
      if (result.content.length > 100) return result;
    } catch {
      // fall through to generic strategies
    }
  }

  // 1. Firecrawl (handles Cloudflare, JS-heavy sites)
  try {
    const result = await firecrawlStrategy(url);
    if (result.content.length > 200) return result;
  } catch {
    // fall through
  }

  // 2. Jina Reader
  try {
    const result = await jinaReaderStrategy(url);
    if (result.content.length > 200) return result;
  } catch {
    // fall through
  }

  // 3. Direct fetch + Cheerio
  try {
    const result = await cheerioStrategy(url);
    if (result.content.length > 100) return result;
  } catch {
    // fall through
  }

  return {
    success: false,
    content: "",
    needsManualInput: true,
  };
}
