import axios from "axios";
import * as cheerio from "cheerio";
import mongoose from "mongoose";
import dns from "node:dns";
import dotenv from "dotenv";
import News from "../models/News.js";

dotenv.config();
dns.setServers(["8.8.8.8", "1.1.1.1"]);
await mongoose.connect(process.env.MONGO_URI);

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

const extract = (html) => {
  const $ = cheerio.load(html);
  $("script, style, noscript, iframe, svg, form, nav, footer, header, aside").remove();

  const cands = [];
  $("article, div, section, main").each((i, el) => {
    const $e = $(el);
    const ps = $e.find("p");
    if (ps.length < 3) return;
    const t = $e.text().replace(/\s+/g, " ").trim();
    if (t.length < 300) return;
    cands.push({ len: t.length, paras: ps.length, text: t });
  });
  cands.sort((a, b) => a.len - b.len);
  return cands[0] || null;
};

const docs = await News.find({ source: { $ne: "PIB" } }).limit(14);

for (const d of docs) {
  let status = "?";
  let got = 0;
  try {
    const res = await axios.get(d.sourceUrl, {
      headers: HEADERS,
      timeout: 25000,
      validateStatus: () => true
    });
    status = res.status;
    if (res.status === 200) {
      const best = extract(res.data);
      if (best) got = best.text.length;
    }
  } catch (e) {
    status = "ERR";
  }
  console.log(
    `${String(status).padEnd(4)} scraped=${String(got).padEnd(6)} gnews=${String(d.content.length).padEnd(5)} ${d.source}`
  );
}

await mongoose.disconnect();
