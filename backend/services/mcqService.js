import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash-lite"
];

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"];

// Short PIB posts often contain only two or three real facts. Asking for five
// questions then forces the model to pad with inference filler, so cap the
// count against the amount of text actually available.
const CHARS_PER_QUESTION = 450;
const MIN_QUESTION_CHARS = 400;

export const getRequestableCount = (
  content,
  numberOfQuestions
) => {
  const length = (content || "").trim().length;

  if (length < MIN_QUESTION_CHARS) {
    return 0;
  }

  return Math.max(
    1,
    Math.min(
      numberOfQuestions,
      Math.floor(length / CHARS_PER_QUESTION)
    )
  );
};

// Scrape noise (nav bars, phone numbers, "site hosts X" metadata) used to
// leak into article bodies and produced questions like
// "What is the phone number provided for the Press Information Bureau?"
const JUNK_PATTERNS = [
  /phone\s*number/i,
  /toll\s*free/i,
  /website|web\s*site/i,
  /home\s*page/i,
  /url\b/i,
  /visitor\s*counter/i,
  /cookie/i,
  /javascript must be enabled/i,
  /screen\s*reader/i,
  /skip to content/i,
  /hyperlinking|privacy\s*policy|terms\s*of\s*use/i,
  /copyright/i,
  /all rights reserved/i,
  /subscribe to/i,
  /newsletter/i,
  /click here|read more/i,
  /advertisement/i,
  /meta\s*data|meta\s*tag/i,
  /log\s*in|sign\s*in|register/i,
  /search\s*(the\s*)?(site|website)/i,
  /browse|menu|navigation/i,
  /follow us|share this/i,
  // Questions about the article as an object rather than its subject.
  // The prompt already forbids these, so enforce it here too.
  /\b(the|this|provided|given|above|following|passage)\s+(text|passage|article|content|excerpt|document|info(?:rmation)?|body)\b/i,
  /\baccording to the (text|passage|article|content|excerpt|document)\b/i,
  /\bbased on the (provided|given|above|following) (text|passage|article|content|excerpt|document|info(?:rmation)?)\b/i,
  /\bmentioned in the (text|passage|article|content|excerpt|document)\b/i,
  /\bdescribed in the (text|passage|article|content|excerpt|document)\b/i,
  /\bwhat can be inferred\b/i,
  /\bthe author\b/i,
  // Questions about how/where something was announced rather than what
  // was announced. Short PIB posts tempt the model into these.
  /\bcommunicated to the public\b/i,
  /\baccording to the (?:official )?(?:release|statement|post|announcement|report)\b/i,
  /\bofficial (?:press )?(?:release|statement|announcement)\b/i,
  /\b(?:posted|shared|published|tweeted) on (?:x|twitter|facebook|instagram)\b/i,
  /\bvia (?:a |an )?(?:post|tweet|social media)\b/i,
  /\b(?:on|through) social media\b/i,
  /\bhow (?:was|were) (?:the |this |it |that )?[\w\s]{0,40}(?:message|statement|post|announcement) (?:communicated|shared|published|posted|distributed)\b/i
];

const isJunkQuestion = (question) => {
  if (!question) {
    return true;
  }

  return JUNK_PATTERNS.some((pattern) => pattern.test(question));
};

// Near-duplicate guard. Asking the same fact twice in one quiz wastes a
// question slot, and Gemini rarely returns byte-identical strings for it.
const STOP_WORDS = new Set([
  "a", "an", "the", "in", "on", "at", "of", "for", "to", "from", "by",
  "with", "and", "or", "is", "are", "was", "were", "did", "does", "do",
  "has", "have", "had", "which", "who", "whom", "whose", "what", "when",
  "where", "why", "how", "that", "this", "these", "those", "as", "it",
  "its", "according", "article", "mentioned", "mentions", "stated",
  "states", "described", "per", "by", "his", "her", "their", "be", "been"
]);

const toComparableTokens = (question) =>
  new Set(
    question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(
        (word) => word.length > 2 && !STOP_WORDS.has(word)
      )
  );

const isNearDuplicate = (
  question,
  acceptedQuestions
) => {
  const tokens = toComparableTokens(question);

  if (tokens.size === 0) {
    return false;
  }

  return acceptedQuestions.some((existing) => {
    const existingTokens =
      toComparableTokens(existing.question);

    if (existingTokens.size === 0) {
      return false;
    }

    let shared = 0;

    for (const token of tokens) {
      if (existingTokens.has(token)) {
        shared++;
      }
    }

    const similarity =
      shared /
      Math.max(tokens.size, existingTokens.size);

    return similarity >= 0.6;
  });
};

const buildPrompt = (
  content,
  numberOfQuestions,
  difficulty
) => `
You are an expert question setter for Newsmania,
an Indian current-affairs platform for government exam aspirants.

Read the news article below and create exactly ${numberOfQuestions}
multiple-choice questions that test a reader's understanding of THAT article.

DIFFICULTY: ${difficulty}

CRITICAL RULES:

1. Use ONLY facts stated in the article. Every question must be
   answerable from the article text alone.
2. Do NOT use outside knowledge. Do NOT invent facts.
3. Every question must be about the news itself: the event, the people,
   the organisations, the dates, the places, the figures, the schemes,
   the decisions and the stated reasons.
4. NEVER write questions about website furniture or page metadata.
   Do not ask about phone numbers, toll-free numbers, website names,
   home pages, URLs, menus, logins, visitor counters, cookies,
   privacy policy, copyright, newsletters, or navigation.
5. Do not ask about "the article", "the text", "the passage",
   "the author" or "the website". Ask about the real-world subject.
6. Each question must have exactly 4 options.
7. There must be exactly ONE correct answer, and it must match one
   of the 4 options character for character.
8. The 3 wrong options must be plausible and clearly incorrect.
9. Give a one or two sentence explanation for every question.
10. Difficulty rules:
${difficulty === "Easy"
        ? `    - Test direct recall of a single explicit fact from the article.`
        : difficulty === "Hard"
          ? `    - Require multi-step reasoning, inference about WHY something
       happened, its significance, or its implications. Combine two or
       more facts from the article. Do not ask for bare recall.`
          : `    - Mostly require understanding rather than pure recall. Mix
       direct facts with questions about reasons, significance and
       details. Avoid trivial one-word lookups.`}
11. Avoid duplicate or very similar questions. Two questions must not
    ask about the same fact, even if they are worded differently.
12. Never pad the set with filler. Do NOT ask how or where something was
    published, who announced it, or what the text says. If the subject
    has too few distinct facts to support ${numberOfQuestions} good
    questions, return fewer questions rather than weaker ones.
13. Return exactly ${numberOfQuestions} MCQs.

ARTICLE:

${content}
`;

export const generateMCQs = async (
  content,
  numberOfQuestions = 5,
  { difficulty = "Medium" } = {}
) => {
  if (!content || content.trim().length === 0) {
    throw new Error("Article content is empty");
  }

  const targetDifficulty = DIFFICULTY_LEVELS.includes(difficulty)
    ? difficulty
    : "Medium";

  const requestable = getRequestableCount(
    content,
    numberOfQuestions
  );

  if (requestable === 0) {
    throw new Error(
      "This article is too short to produce reliable questions. Fetch the full article first."
    );
  }

  if (requestable < numberOfQuestions) {
    console.log(
      `Article has ${content.trim().length} chars, limiting to ${requestable} question(s) instead of ${numberOfQuestions}`
    );
  }

  const targetCount = requestable;

  const prompt = buildPrompt(
    content,
    targetCount,
    targetDifficulty
  );

  // Ask for extra questions so junk ones can be discarded while still
  // returning the requested count.
  const requestCount = targetCount + 3;

  const buildRequestPrompt = prompt.replaceAll(
    `exactly ${targetCount}`,
    `exactly ${requestCount}`
  );

  let lastError = null;

  for (const model of MODELS) {
    console.log(`\nTrying MCQ model: ${model}`);

    // 2 attempts per model
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(
          `MCQ attempt ${attempt} using ${model}`
        );

        const response = await ai.models.generateContent({
          model,
          contents: buildRequestPrompt,

          config: {
            responseMimeType: "application/json",

            responseSchema: {
              type: "object",

              properties: {
                mcqs: {
                  type: "array",

                  items: {
                    type: "object",

                    properties: {
                      question: {
                        type: "string"
                      },

                      options: {
                        type: "array",
                        items: {
                          type: "string"
                        }
                      },

                      correctAnswer: {
                        type: "string"
                      },

                      explanation: {
                        type: "string"
                      },

                      difficulty: {
                        type: "string"
                      }
                    },

                    required: [
                      "question",
                      "options",
                      "correctAnswer",
                      "explanation",
                      "difficulty"
                    ]
                  }
                }
              },

              required: ["mcqs"]
            }
          }
        });

        if (!response.text) {
          throw new Error("Empty response from Gemini");
        }

        const result = JSON.parse(response.text);

        // -----------------------------
        // VALIDATE RESPONSE
        // -----------------------------

        if (
          !result.mcqs ||
          !Array.isArray(result.mcqs)
        ) {
          throw new Error(
            "Invalid MCQ response: mcqs array missing"
          );
        }

        const valid = [];
        const rejected = [];

        for (const mcq of result.mcqs) {
          try {
            if (!mcq.question) {
              throw new Error("MCQ question is missing");
            }

            if (
              !Array.isArray(mcq.options) ||
              mcq.options.length !== 4
            ) {
              throw new Error(
                "Each MCQ must contain exactly 4 options"
              );
            }

            if (!mcq.correctAnswer) {
              throw new Error("Correct answer is missing");
            }

            if (!mcq.options.includes(mcq.correctAnswer)) {
              throw new Error(
                "Correct answer is not present in options"
              );
            }

            if (!mcq.explanation) {
              throw new Error("MCQ explanation is missing");
            }

            const uniqueOptions = new Set(
              mcq.options.map((option) =>
                option.trim().toLowerCase()
              )
            );

            if (uniqueOptions.size !== 4) {
              throw new Error(
                "MCQ contains duplicate options"
              );
            }

            // Reject questions about page furniture or metadata
            if (isJunkQuestion(mcq.question)) {
              throw new Error(
                `Question is not about the news subject: "${mcq.question.slice(0, 60)}"`
              );
            }

            const seenQuestion = valid.some(
              (item) =>
                item.question.trim().toLowerCase() ===
                mcq.question.trim().toLowerCase()
            );

            if (seenQuestion) {
              throw new Error("Duplicate question");
            }

            if (
              isNearDuplicate(mcq.question, valid)
            ) {
              throw new Error(
                `Question overlaps an earlier one: "${mcq.question.slice(0, 60)}"`
              );
            }

            valid.push({
              question: mcq.question.trim(),
              options: mcq.options.map((option) =>
                option.trim()
              ),
              correctAnswer: mcq.correctAnswer.trim(),
              explanation: mcq.explanation.trim(),
              difficulty: DIFFICULTY_LEVELS.includes(mcq.difficulty)
                ? mcq.difficulty
                : targetDifficulty
            });
          } catch (error) {
            rejected.push({
              question: (mcq.question || "").slice(0, 70),
              reason: error.message
            });
          }
        }

        if (rejected.length) {
          console.log(
            `Discarded ${rejected.length} low-quality MCQ(s):`
          );
          rejected.forEach((item) =>
            console.log(`  - ${item.reason}`)
          );
        }

        if (valid.length < targetCount) {
          throw new Error(
            `Only ${valid.length} usable MCQ(s) from ${result.mcqs.length} generated, need ${targetCount}`
          );
        }

        const selected = valid.slice(0, targetCount);

        console.log(
          `MCQs generated successfully using ${model} (${selected.length} kept, difficulty=${targetDifficulty})`
        );

        return selected;

      } catch (error) {
        lastError = error;

        console.error(
          `MCQ error with ${model}, attempt ${attempt}:`,
          error.message
        );

        // Wait before retry
        if (attempt < 2) {
          await sleep(3000);
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
    "Failed to generate MCQs. All Gemini models are currently unavailable."
  );
};