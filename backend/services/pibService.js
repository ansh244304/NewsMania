import axios from "axios";
import * as cheerio from "cheerio";
import News from "../models/News.js";

const PIB_URL =
  "https://www.pib.gov.in/indexd.aspx?reg=48&lang=1";


// =====================================================
// PIB
// =====================================================

const PIB_FRAME_URL =
  "https://www.pib.gov.in/PressReleasePage.aspx?PRID=";

const PIB_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9"
};

const PIB_MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

const PIB_MINISTRY_CATEGORY = [
  [/ministry of (finance|commerce|industry|corporate affairs)/i, "Economy"],
  [/ministry of (environment|forest|climate|earth|water)/i, "Environment"],
  [/ministry of (defence|armed forces)/i, "Defence"],
  [/ministry of (science|technology|space|it|electronics)/i, "Technology"],
  [/ministry of (health|family welfare)/i, "Other"],
  [/ministry of (sports|youth affairs)/i, "Sports"],
  [/ministry of (external affairs|foreign|ambassador)/i, "International"],
  [/election commission|president|prime minister|parliament|rajya sabha| lok sabha|supreme court|high court|central bureau|pollution control/i, "Polity"]
];

const guessPIBCategory = (ministry) => {
  for (const [pattern, category] of PIB_MINISTRY_CATEGORY) {
    if (pattern.test(ministry)) {
      return category;
    }
  }
  return "National";
};

const parsePIBDate = (text) => {
  const match = text.match(
    /Posted On:\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*([APap])\.?[Mm]\.?/i
  );

  if (!match) {
    return null;
  }

  const month = PIB_MONTHS[match[2].slice(0, 3).toLowerCase()];

  if (month === undefined) {
    return null;
  }

  let hours = Number(match[4]);

  if (match[6].toLowerCase() === "p" && hours < 12) {
    hours += 12;
  }

  const date = new Date(
    Number(match[3]),
    month,
    Number(match[1]),
    hours,
    Number(match[5])
  );

  return Number.isNaN(date.getTime()) ? null : date;
};

const summarize = (content) => {
  if (content.length <= 300) {
    return content;
  }

  const cut = content.slice(0, 300);
  const lastStop = Math.max(
    cut.lastIndexOf(". "),
    cut.lastIndexOf("! "),
    cut.lastIndexOf("? ")
  );

  return lastStop > 120 ? cut.slice(0, lastStop + 1) : `${cut.trim()}...`;
};

export const fetchPIBNews = async () => {
  try {

    const response = await axios.get(
      PIB_URL,
      { headers: PIB_HEADERS }
    );

    const $ = cheerio.load(response.data);

    // ==================================================
    // COLLECT RELEASE IDS FROM THE LISTING
    // ==================================================

    const seen = new Set();
    const releases = [];

    $('a[href*="PressReleaseDetail.aspx?PRID="]').each(
      (index, element) => {

        const link = $(element).attr("href");
        const pridMatch = link.match(/PRID=(\d+)/);

        if (!pridMatch) {
          return;
        }

        const prid = pridMatch[1];

        if (seen.has(prid)) {
          return;
        }

        seen.add(prid);

        releases.push({
          prid,
          listTitle: $(element)
            .text()
            .replace(/\s+/g, " ")
            .trim()
        });
      }
    );

    console.log(
      "PIB releases found:",
      releases.length
    );

    if (releases.length === 0) {
      throw new Error(
        "PIB listing returned no press releases"
      );
    }

    const savedNews = [];

    for (const release of releases) {

      try {

        const sourceUrl = `${PIB_FRAME_URL}${release.prid}`;

        // ==============================================
        // SKIP IF ALREADY STORED
        // ==============================================

        const existingNews = await News.findOne({
          sourceUrl
        });

        if (existingNews) {
          continue;
        }

        // ==============================================
        // BODY LIVES IN AN IFRAME, NOT THE DETAL PAGE
        // ==============================================

        const articleResponse = await axios.get(
          sourceUrl,
          { headers: PIB_HEADERS }
        );

        const article$ = cheerio.load(
          articleResponse.data
        );

        article$(
          "script, style, noscript, iframe"
        ).remove();

        const container = article$("#PdfDiv").first();

        const scope = container.length
          ? container
          : article$("body");

        const rawText = scope
          .text()
          .replace(/\s+/g, " ")
          .trim();

        if (rawText.length < 120) {
          console.log(
            "PIB release too short, skipping:",
            release.prid
          );
          continue;
        }

        // ==============================================
        // TITLE / MINISTRY / DATE
        // ==============================================

        const heading = article$("h2")
          .map((i, el) =>
            article$(el).text().replace(/\s+/g, " ").trim()
          )
          .get()
          .find((text) => text.length > 15);

        const title =
          heading ||
          release.listTitle;

        if (!title) {
          continue;
        }

        const publishedAt =
          parsePIBDate(rawText) || new Date();

        // ==============================================
        // STRIP THE HEADER BLOCK FROM THE BODY
        // ==============================================

        const content = rawText

          // Release footer, e.g. "*** MJPS/SS/PRK (Release ID: 2315360)"
          .replace(
            /\s*\*+\s*[A-Z]{2,6}(?:\/[A-Za-z0-9]+)*\s*\(Release ID:\s*\d+\)\s*$/i,
            ""
          )

          // Embedded social post block, e.g.
          // "pic.twitter.com/xxxx - PMO India (@PMOIndia) September 26, 2026"
          .replace(
            /\s*pic\.(?:twitter|x)\.com\/\S+\s*[-–]?\s*[\w\s().@]+\(\s*@[\w]+\s*\)\s*[A-Za-z]+\s+\d{1,2},\s*\d{4}\s*/gi,
            ""
          )

          .replace(
            /Posted On:.*?by PIB[ ]*[A-Za-z ]*?(?=[A-Z0-9(])/i,
            " "
          )

          .replace(/\s+/g, " ")
          .trim();

        const ministryMatch = rawText.match(
          /^(Ministry of [A-Za-z &]+|Election Commission|Secretariat of [A-Za-z &]+|Prime Minister'?s Office|Government of India|Reserve Bank of India|Supreme Court of India|Office of the [A-Za-z &]+)/i
        );

        const ministry = ministryMatch
          ? ministryMatch[1].trim()
          : "PIB";

        const news = await News.create({

          title: title.slice(0, 300),

          content:

            content.length > 20000
              ? `${content.slice(0, 20000)}...`
              : content,

          summary: summarize(content),

          facts: [],

          keywords: [],

          exams: [],

          source: "PIB",

          sourceUrl: sourceUrl,

          category: guessPIBCategory(ministry),

          publishedAt: publishedAt,

          imageUrl: "",

          tags: []

        });

        savedNews.push(news);

        console.log(
          "PIB Saved:",
          news.title.slice(0, 60),
          "|",
          news.publishedAt.toISOString()
        );

      } catch (articleError) {

        console.log(
          "PIB release failed:",
          release.prid,
          articleError.message
        );

      }

    }

    console.log(
      "PIB new releases saved:",
      savedNews.length
    );

    return savedNews;

  } catch (error) {

    console.error(
      "PIB fetch error:",
      error.message
    );

    throw new Error(
      error.message || "Failed to fetch PIB news"
    );
  }
};
