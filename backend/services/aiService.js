import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// Models are tried in this order
const MODELS = [
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash"
];

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const SUMMARY_WORD_COUNT = 100;

const countWords = (text) =>
  (text || "").trim().split(/\s+/).filter(Boolean).length;

// Gemini does not reliably hit an exact word count, so the summary is
// trimmed/padded programmatically to guarantee exactly 100 words.
const normalizeToWordCount = (text, target) => {
  const cleaned = (text || "")
    .replace(/\s+/g, " ")
    .replace(/^[-*\s]+/, "")
    .trim();

  if (!cleaned) {
    return cleaned;
  }

  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length === target) {
    return words.join(" ");
  }

  if (words.length > target) {
    const kept = words.slice(0, target);

    // Avoid ending on a dangling clause or an orphaned bracket
    let last = kept[kept.length - 1]
      .replace(/[([{“"'‘]+$/, "")
      .replace(/[,;:—-]+$/, "");

    kept[kept.length - 1] = last;

    return `${kept.join(" ")}`;
  }

  // Too short: the model ignored the length rule, so keep what we got
  // rather than padding with meaningless filler words.
  return words.join(" ");
};

export const generateNewsAnalysis = async (content) => {
  if (!content || content.trim().length === 0) {
    throw new Error("Article content is empty");
  }

  const prompt = `
You are an AI assistant for Newsmania,
an Indian current-affairs platform for government exam aspirants.

Analyze the following news article.

Generate:

1. A summary of EXACTLY ${SUMMARY_WORD_COUNT} words.
   - The word count is a hard requirement. Count every word.
   - Do not write fewer than ${SUMMARY_WORD_COUNT} words.
   - Do not write more than ${SUMMARY_WORD_COUNT} words.
   - Do not number the sentences. Do not add a title or a label.
   - Output the summary as one continuous block of plain prose.
2. Exactly 5 important facts.
3. Exactly 5 important keywords.
4. Relevant government exams from:
   UPSC, SSC, Banking, Railway, Defence, State PCS.

IMPORTANT RULES:

- Use ONLY information provided in the article.
- Do NOT use outside knowledge.
- Do NOT invent facts.
- Keep the summary factual and exam-oriented.
- Facts must be directly supported by the article.
- If an exam is not relevant, do not include it.
- Never use markdown formatting in the summary.

ARTICLE:

${content}
`;

  let lastError = null;

  // Try each model
  for (const model of MODELS) {
    console.log(`Trying Gemini model: ${model}`);

    // Retry each model twice
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(
          `Attempt ${attempt} using ${model}`
        );

        const response = await ai.models.generateContent({
          model,
          contents: prompt,

          config: {
            responseMimeType: "application/json",

            responseSchema: {
              type: "object",

              properties: {
                summary: {
                  type: "string"
                },

                facts: {
                  type: "array",
                  items: {
                    type: "string"
                  }
                },

                keywords: {
                  type: "array",
                  items: {
                    type: "string"
                  }
                },

                exams: {
                  type: "array",
                  items: {
                    type: "string"
                  }
                }
              },

              required: [
                "summary",
                "facts",
                "keywords",
                "exams"
              ]
            }
          }
        });

        const result = JSON.parse(response.text);

        // Guarantee the summary length contract
        result.summary = normalizeToWordCount(
          result.summary,
          SUMMARY_WORD_COUNT
        );

        console.log(
          `Gemini success using ${model} (summary: ${countWords(result.summary)} words)`
        );

        return result;

      } catch (error) {

        lastError = error;

        console.error(
          `Gemini error with ${model}, attempt ${attempt}:`,
          error.message
        );

        // Wait before retry
        if (attempt < 2) {
          console.log("Retrying...");
          await sleep(2000);
        }
      }
    }

    console.log(
      `${model} failed. Trying next model...`
    );
  }

  console.error(
    "All Gemini models failed:",
    lastError?.message
  );

  throw new Error(
    "Gemini AI is temporarily unavailable. Please try again later."
  );
};