import axios from "axios";
import * as cheerio from "cheerio";

const SCRAPE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9"
};

// GNews free plan returns a preview capped at 266 chars and marks the
// cut with a trailing "... [NNNN chars]" marker.
const GNEWS_TRUNCATION_MARKER = /\[\d+\s+chars?\]\s*$/i;

export const isTruncated = (content) => {
  if (!content) {
    return true;
  }

  return GNEWS_TRUNCATION_MARKER.test(content.trim());
};

const BOILERPLATE = [
  "also read",
  "click here",
  "read more",
  "follow us",
  "download the app",
  "advertisement",
  "subscribe",
  "newsletter",
  "copyright",
  "all rights reserved",
  "terms of use",
  "privacy policy",
  "watch live tv",
  "related stories",
  "trending news"
];

const looksLikeBoilerplate = (text) => {
  const lower = text.toLowerCase();

  return BOILERPLATE.some((phrase) => lower.startsWith(phrase));
};

const collectParagraphs = ($, scope) => {
  const seen = new Set();
  const parts = [];

  scope.find("p").each((index, element) => {
    const text = $(element)
      .text()
      .replace(/\s+/g, " ")
      .trim();

    if (text.length < 40) {
      return;
    }

    if (looksLikeBoilerplate(text)) {
      return;
    }

    if (seen.has(text)) {
      return;
    }

    seen.add(text);
    parts.push(text);
  });

  return parts;
};

const scoreCandidate = ($, element) => {
  const $element = $(element);

  const paragraphs = collectParagraphs($, $element);

  if (paragraphs.length < 2) {
    return null;
  }

  const text = paragraphs.join(" ");

  if (text.length < 300) {
    return null;
  }

  const linkText = $element
    .find("a")
    .text()
    .replace(/\s+/g, " ")
    .trim();

  // Heavy link density means navigation or a related-links rail
  const linkPenalty = text.length
    ? linkText.length / text.length
    : 1;

  return {
    text,
    paragraphs: paragraphs.length,
    score: text.length * (1 - Math.min(linkPenalty, 0.9))
  };
};

export const scrapeArticle = async (url) => {
  if (!url || !/^https?:\/\//i.test(url)) {
    return null;
  }

  try {
    const response = await axios.get(url, {
      headers: SCRAPE_HEADERS,
      timeout: 25000,
      validateStatus: () => true,
      maxRedirects: 5
    });

    if (response.status !== 200 || !response.data) {
      console.log(
        `Scrape skipped (HTTP ${response.status}):`,
        url
      );
      return null;
    }

    const $ = cheerio.load(response.data);

    $("script, style, noscript, iframe, svg, form").remove();

    const title =
      $('meta[property="og:title"]').attr("content") ||
      $("h1").first().text().trim() ||
      null;

    const publishedAtRaw =
      $('meta[property="article:published_time"]').attr("content") ||
      $('meta[name="pubdate"]').attr("content") ||
      $('meta[name="date"]').attr("content") ||
      null;

    let publishedAt = null;

    if (publishedAtRaw) {
      const parsed = new Date(publishedAtRaw);
      if (!Number.isNaN(parsed.getTime())) {
        publishedAt = parsed;
      }
    }

    const imageUrl =
      $('meta[property="og:image"]').attr("content") || "";

    const scopes = [
      $("article").first(),
      $("main").first(),
      $('[itemprop="articleBody"]').first(),
      $(".article-content, .article-body, .story-content, .post-content, .entry-content").first(),
      $("body")
    ];

    let best = null;

    for (const scope of scopes) {
      if (!scope || !scope.length) {
        continue;
      }

      const candidates = [];

      scope.find("div, section, td").each((index, element) => {
        const scored = scoreCandidate($, element);

        if (scored) {
          candidates.push(scored);
        }
      });

      candidates.sort((a, b) => b.score - a.score);

      if (candidates[0] && (!best || candidates[0].score > best.score)) {
        best = candidates[0];
      }

      if (best && best.paragraphs >= 4) {
        break;
      }
    }

    if (!best) {
      console.log("Scrape found no article body:", url);
      return null;
    }

    return {
      title,
      content: best.text,
      imageUrl,
      publishedAt
    };

  } catch (error) {
    console.log(
      "Scrape failed:",
      url,
      error.message
    );
    return null;
  }
};
