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

const skip = process.argv.includes("--keep-mcqs");

await mongoose.connect(process.env.MONGO_URI);

if (!skip) {
  const deleted = await MCQ.deleteMany({});
  console.log(`Deleted ${deleted.deletedCount} MCQ(s)`);
}

const quizzes = await DailyQuiz.deleteMany({});
console.log(
  `Deleted ${quizzes.deletedCount} DailyQuiz record(s)`
);

const counts = await MCQ.aggregate([
  { $group: { _id: "$difficulty", total: { $sum: 1 } } }
]);

console.log("MCQs by difficulty:", counts);
console.log("Total MCQs:", await MCQ.countDocuments());

await mongoose.disconnect();
