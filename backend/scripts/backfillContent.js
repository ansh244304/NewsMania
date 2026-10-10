import mongoose from "mongoose";
import dns from "node:dns";
import dotenv from "dotenv";
import News from "../models/News.js";
import { isTruncated, scrapeArticle } from "../services/articleScraper.js";

dotenv.config();
dns.setServers(["8.8.8.8", "1.1.1.1"]);
await mongoose.connect(process.env.MONGO_URI);

const docs = await News.find({ source: { $ne: "PIB" } });

console.log("non-PIB docs:", docs.length);

let upgraded = 0;
let alreadyFull = 0;
let failed = 0;

for (const doc of docs) {
  if (!isTruncated(doc.content) && doc.content.length > 400) {
    alreadyFull++;
    continue;
  }

  const before = doc.content.length;
  const stripped = doc.content.replace(/\s*\.\.\.\s*\[\d+\s+chars?\]\s*$/i, "").trim();

  const scraped = await scrapeArticle(doc.sourceUrl);

  if (scraped && scraped.content.length > before) {
    doc.content = scraped.content;
    if (scraped.imageUrl && !doc.imageUrl) doc.imageUrl = scraped.imageUrl;
    if (scraped.publishedAt && !doc.publishedAt) doc.publishedAt = scraped.publishedAt;
    await doc.save();
    upgraded++;
    console.log(`  OK  ${before} -> ${doc.content.length}  ${doc.source}`);
  } else {
    // Keep whatever we have, but never leave the dangling truncation marker
    if (doc.content !== stripped) {
      doc.content = stripped;
      await doc.save();
    }
    failed++;
    console.log(`  --  ${before} (blocked) ${doc.source}`);
  }
}

console.log(`\nupgraded: ${upgraded} | already full: ${alreadyFull} | blocked: ${failed}`);

const stillShort = await News.countDocuments({
  source: { $ne: "PIB" },
  content: { $regex: "\\[\\d+\\s+chars?\\]\\s*$", $options: "i" }
});
console.log("docs still showing a truncation marker:", stillShort);

await mongoose.disconnect();
