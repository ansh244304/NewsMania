import mongoose from "mongoose";
import dns from "node:dns";
import dotenv from "dotenv";
import News from "../models/News.js";
import {
  generateNewsAnalysis,
  SUMMARY_WORD_COUNT
} from "../services/aiService.js";

dotenv.config();
dns.setServers(["8.8.8.8", "1.1.1.1"]);
await mongoose.connect(process.env.MONGO_URI);

const doc = await News.findOne({
  sourceUrl: { $regex: "timesnownews.*badrinath" }
});

if (!doc) {
  console.log("Badrinath article not found");
  await mongoose.disconnect();
  process.exit(0);
}

console.log("content chars:", doc.content.length);

const result = await generateNewsAnalysis(doc.content);

const words = result.summary.trim().split(/\s+/).filter(Boolean);

console.log("\n=== SUMMARY ===");
console.log(result.summary);
console.log("\nword count:", words.length, "(target", SUMMARY_WORD_COUNT + ")");

console.log("\nfacts:", result.facts.length);
result.facts.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));

console.log("\nkeywords:", result.keywords.length, "->", result.keywords.join(", "));
console.log("exams:", result.exams.length, "->", result.exams.join(", "));

await mongoose.disconnect();
