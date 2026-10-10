import dns from "node:dns";
import dotenv from "dotenv";

dotenv.config();

// The system resolver refuses SRV queries in this environment, which breaks
// mongodb+srv resolution. Point lookups at a public resolver instead so the
// hostname (and therefore TLS SNI) is preserved.
const patchedResolver = new dns.promises.Resolver();
patchedResolver.setServers(["8.8.8.8", "1.1.1.1"]);

dns.promises.resolveSrv = (name) =>
  patchedResolver.resolveSrv(name);
dns.promises.resolveTxt = (name) =>
  patchedResolver.resolveTxt(name);

const mongoose = (await import("mongoose")).default;

const MCQ = (await import("../models/MCQ.js")).default;
const DailyQuiz = (await import("../models/Dailyquiz.js")).default;
const News = (await import("../models/News.js")).default;

await mongoose.connect(process.env.MONGO_URI);

console.log("Connected to MongoDB\n");

console.log("--- BEFORE ---");
console.log("News:", await News.countDocuments());
console.log("MCQs:", await MCQ.countDocuments());
console.log("DailyQuizzes:", await DailyQuiz.countDocuments());

console.log("\n--- EXISTING MCQs ---");
for (const m of await MCQ.find().populate("newsId", "title")) {
  console.log(
    `[${m.difficulty || "none"}] ${m.question.slice(0, 90)}`
  );
  console.log(
    `   article: ${m.newsId?.title?.slice(0, 60) || "MISSING"}`
  );
}

const deleted = await MCQ.deleteMany({});
console.log(`\nDeleted ${deleted.deletedCount} MCQ(s)`);

const quizzes = await DailyQuiz.deleteMany({});
console.log(
  `Deleted ${quizzes.deletedCount} DailyQuiz record(s)`
);

console.log("\n--- AFTER ---");
console.log("MCQs:", await MCQ.countDocuments());
console.log("DailyQuizzes:", await DailyQuiz.countDocuments());

await mongoose.disconnect();
