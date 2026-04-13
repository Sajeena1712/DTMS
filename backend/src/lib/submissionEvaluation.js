import JSZip from "jszip";
import crypto from "crypto";
import zlib from "zlib";
import { DEFAULT_AI_PROMPT_RULES, getAiWorkflowSettings } from "./aiWorkflowSettings.js";
import { generateWithHuggingFaceChat } from "./huggingFaceChat.js";

function normalizeText(value = "") {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value = "") {
  return normalizeText(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 2);
}

function uniqueTokens(tokens) {
  return [...new Set(tokens)];
}

function truncateText(value = "", limit = 3000) {
  const text = normalizeText(value);
  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit).trim()}…`;
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers }).catch(() => null);
  if (!response?.ok) {
    return null;
  }

  return response.json().catch(() => null);
}

async function fetchText(url, headers = {}) {
  const response = await fetch(url, { headers }).catch(() => null);
  if (!response?.ok) {
    return "";
  }

  return response.text().catch(() => "");
}

function inferSubmissionType({ submissionType, fileName = "", fileUrl = "", githubUrl = "" }) {
  const normalizedType = String(submissionType || "").trim().toLowerCase();
  if (normalizedType) {
    return normalizedType;
  }

  const value = `${fileName} ${fileUrl} ${githubUrl}`.toLowerCase();
  if (value.includes("github.com")) return "github";
  if (value.includes(".pdf")) return "pdf";
  if (value.includes(".pptx")) return "pptx";
  if (value.includes(".ppt")) return "ppt";
  if (value.includes(".docx")) return "docx";
  if (value.includes(".doc")) return "doc";
  if (value.includes(".zip")) return "zip";
  if (/^https?:\/\//i.test(String(fileUrl || ""))) return "website";
  return "text";
}

function parseDataUrl(dataUrl = "") {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

function decodeXmlEntities(value = "") {
  return String(value)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractTextBetweenTags(xml = "", tagName = "t") {
  const matches = [...String(xml).matchAll(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "g"))];
  return matches.map((match) => decodeXmlEntities(match[1])).join(" ");
}

async function extractDocxText(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) {
    return "";
  }

  const xml = await documentFile.async("string");
  return normalizeText(extractTextBetweenTags(xml, "w:t") || extractTextBetweenTags(xml, "t"));
}

async function extractPptxText(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.values(zip.files).filter((file) => /^ppt\/slides\/slide\d+\.xml$/i.test(file.name));
  const textParts = [];

  for (const file of slideFiles) {
    const xml = await file.async("string");
    const slideText = normalizeText(extractTextBetweenTags(xml, "a:t") || extractTextBetweenTags(xml, "t"));
    if (slideText) {
      textParts.push(slideText);
    }
  }

  return textParts.join(" ");
}

function extractPdfText(buffer) {
  function decodePdfLiteralString(value = "") {
    let output = "";
    for (let index = 0; index < value.length; index += 1) {
      const char = value[index];
      if (char !== "\\") {
        output += char;
        continue;
      }

      const next = value[index + 1];
      if (!next) {
        continue;
      }

      if (/\d/.test(next)) {
        const octal = value.slice(index + 1, index + 4).match(/^[0-7]{1,3}/)?.[0] || "";
        if (octal) {
          output += String.fromCharCode(parseInt(octal, 8));
          index += octal.length;
          continue;
        }
      }

      if (next === "n") output += "\n";
      else if (next === "r") output += "\r";
      else if (next === "t") output += "\t";
      else if (next === "b") output += "\b";
      else if (next === "f") output += "\f";
      else if (next === "(" || next === ")" || next === "\\") output += next;
      else if (next === "\n" || next === "\r") {
        // Line continuation inside PDF literal strings.
      } else {
        output += next;
      }

      index += 1;
    }
    return output;
  }

  function extractTextFromContent(content = "") {
    const parts = [];
    const literalMatches = [...String(content).matchAll(/\((?:\\.|[^()]){1,800}\)\s*T[Jj]/g)].map((match) => {
      const inner = match[0].match(/\(([\s\S]*)\)\s*T[Jj]/)?.[1] || "";
      return decodePdfLiteralString(inner);
    });
    const hexMatches = [...String(content).matchAll(/<([0-9A-Fa-f\s]+)>\s*T[Jj]/g)].map((match) => {
      try {
        return Buffer.from(match[1].replace(/\s+/g, ""), "hex").toString("utf8");
      } catch {
        return "";
      }
    });
    const arrayMatches = [...String(content).matchAll(/\[(.*?)\]\s*TJ/gs)].flatMap((match) =>
      [...match[1].matchAll(/\((?:\\.|[^()]){1,800}\)|<([0-9A-Fa-f\s]+)>/g)].map((token) => {
        if (token[0].startsWith("(")) {
          const inner = token[0].slice(1, -1);
          return decodePdfLiteralString(inner);
        }

        if (token[1]) {
          try {
            return Buffer.from(token[1].replace(/\s+/g, ""), "hex").toString("utf8");
          } catch {
            return "";
          }
        }

        return "";
      }),
    );

    parts.push(...literalMatches, ...hexMatches, ...arrayMatches);
    return normalizeText(parts.join(" "));
  }

  const rawText = buffer.toString("latin1");
  const extractedParts = [extractTextFromContent(rawText)];

  for (const match of rawText.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
    const streamText = match[1] || "";
    const streamBuffer = Buffer.from(streamText, "latin1");
    const decodedVariants = [streamBuffer];

    try {
      decodedVariants.push(zlib.inflateSync(streamBuffer));
    } catch {
      try {
        decodedVariants.push(zlib.inflateRawSync(streamBuffer));
      } catch {
        // Ignore non-compressed streams.
      }
    }

    for (const variant of decodedVariants) {
      extractedParts.push(extractTextFromContent(variant.toString("latin1")));
    }
  }

  return normalizeText(extractedParts.join(" "));
}

async function extractWebsiteText(url) {
  if (!/^https?:\/\//i.test(String(url || ""))) {
    return "";
  }

  const response = await fetch(url, {
    headers: {
      "user-agent": "DTMS/1.0",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch website (${response.status})`);
  }

  const html = await response.text();
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
  const headings = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((match) => normalizeText(match[1]))
    .filter(Boolean)
    .slice(0, 6);
  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => normalizeText(match[1]))
    .filter(Boolean)
    .slice(0, 8);
  const metaDescription = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || "";
  const bodyText = normalizeText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );

  return normalizeText([title, metaDescription, ...headings, ...paragraphs, bodyText].join(" "));
}

function buildTokensFromText(value = "") {
  return uniqueTokens(tokenize(value));
}

function parseGithubRepoUrl(url = "") {
  const match = String(url).trim().match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)(?:\/|$)/i);
  if (!match) {
    return null;
  }

  return {
    owner: decodeURIComponent(match[1]),
    repo: decodeURIComponent(match[2]).replace(/\.git$/i, ""),
  };
}

async function extractGithubRepositoryText(url) {
  const parsed = parseGithubRepoUrl(url);
  if (!parsed) {
    return "";
  }

  const headers = {
    "user-agent": "DTMS/1.0",
    accept: "application/vnd.github+json,text/plain,text/html",
  };

  const repoApiUrl = `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`;
  const repoData = await fetchJson(repoApiUrl, headers);

  const defaultBranch = String(repoData?.default_branch || "main").trim() || "main";
  const repoSummaryParts = [
    repoData?.full_name || `${parsed.owner}/${parsed.repo}`,
    repoData?.description || "",
    repoData?.language ? `Primary language: ${repoData.language}` : "",
    Array.isArray(repoData?.topics) && repoData.topics.length ? `Topics: ${repoData.topics.slice(0, 8).join(", ")}` : "",
    repoData?.homepage ? `Homepage: ${repoData.homepage}` : "",
    repoData?.license?.name ? `License: ${repoData.license.name}` : "",
    repoData?.default_branch ? `Default branch: ${repoData.default_branch}` : "",
    repoData?.created_at ? `Created: ${repoData.created_at}` : "",
    repoData?.pushed_at ? `Updated: ${repoData.pushed_at}` : "",
  ].filter(Boolean);

  const rootContentsUrl = `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/contents`;
  const rootContents = (await fetchJson(rootContentsUrl, headers)) || [];
  const rootNames = rootContents
    .map((entry) => entry?.name)
    .filter(Boolean);
  const interestingNames = rootNames.slice(0, 20);

  const filePriority = [
    /^readme(\.[a-z0-9]+)?$/i,
    /^package\.json$/i,
    /^pyproject\.toml$/i,
    /^requirements(\.txt)?$/i,
    /^setup\.py$/i,
    /^vite\.config\.(js|ts|mjs|cjs)$/i,
    /^next\.config\.(js|mjs|cjs|ts)$/i,
    /^tsconfig\.json$/i,
    /^app\.(js|jsx|ts|tsx|py)$/i,
    /^main\.(js|jsx|ts|tsx|py)$/i,
    /^index\.(js|jsx|ts|tsx)$/i,
    /^server\.(js|jsx|ts|tsx|py)$/i,
  ];
  const directoryPriority = new Set(["src", "app", "client", "frontend", "backend", "server", "pages", "components"]);
  const candidateEntries = [];

  for (const entry of rootContents) {
    if (!entry || entry.type !== "file") {
      continue;
    }

    if (filePriority.some((pattern) => pattern.test(entry.name))) {
      candidateEntries.push(entry);
    }
  }

  for (const entry of rootContents) {
    if (!entry || entry.type !== "dir" || !directoryPriority.has(String(entry.name || "").toLowerCase())) {
      continue;
    }

    const nestedEntries = (await fetchJson(entry.url, headers)) || [];
    for (const nested of nestedEntries) {
      if (!nested || nested.type !== "file") {
        continue;
      }

      if (filePriority.some((pattern) => pattern.test(nested.name))) {
        candidateEntries.push(nested);
      }
    }
  }

  const selectedEntries = candidateEntries
    .filter((entry, index, items) => items.findIndex((item) => item.path === entry.path) === index)
    .slice(0, 6);

  const fileEvidence = [];
  for (const entry of selectedEntries) {
    const fileText = truncateText(await fetchText(entry.download_url, headers), 1800);
    if (!fileText) {
      continue;
    }

    fileEvidence.push(`File: ${entry.path}\n${fileText}`);
  }

  const evidenceSummary = [
    `Repo files: ${interestingNames.slice(0, 15).join(", ") || "none detected"}`,
    fileEvidence.length ? `Key file snippets:\n${fileEvidence.join("\n\n")}` : "",
  ].filter(Boolean).join("\n");

  return normalizeText([repoSummaryParts.join(" "), evidenceSummary].join(" "));
}

function scoreOverlap(expectedText = "", submissionText = "") {
  const expectedTokens = buildTokensFromText(expectedText);
  const submissionTokens = buildTokensFromText(submissionText);
  if (!expectedTokens.length || !submissionTokens.length) {
    return { overlap: 0, matchedTokens: [], missingTokens: expectedTokens.slice(0, 8) };
  }

  const matchedTokens = expectedTokens.filter((token) => submissionTokens.includes(token));
  const overlap = Math.round((matchedTokens.length / Math.max(1, expectedTokens.length)) * 100);
  const missingTokens = expectedTokens.filter((token) => !matchedTokens.includes(token)).slice(0, 8);
  return { overlap, matchedTokens, missingTokens };
}

function deriveTaskRubric(task) {
  const description = normalizeText(task?.description || "");
  const taskTitle = normalizeText(task?.title || "");
  const submission = task?.submission || {};
  const keywords = uniqueTokens([
    ...tokenize(taskTitle),
    ...tokenize(description),
    ...tokenize(submission.text || ""),
  ]).slice(0, 18);

  return { description, keywords };
}

function buildFallbackEvaluation(task, submissionText, sourceSummary, submissionType) {
  const rubric = deriveTaskRubric(task);
  const expectedText = `${task?.title || ""} ${rubric.description} ${rubric.keywords.join(" ")}`;
  const overlap = scoreOverlap(expectedText, submissionText);
  const lengthScore = Math.min(100, Math.round((tokenize(submissionText).length / Math.max(10, rubric.keywords.length * 2)) * 100));
  const githubRichSource = /GitHub repository:/i.test(sourceSummary || "");
  const structureScore =
    submissionType === "website"
      ? 75
      : submissionType === "pptx" || submissionType === "ppt"
        ? 82
        : githubRichSource
          ? 85
          : 78;
  const predictedScore = Math.max(
    25,
    Math.min(98, Math.round(overlap.overlap * 0.55 + lengthScore * 0.25 + structureScore * 0.2)),
  );
  const confidence = predictedScore >= 80 ? "high" : predictedScore >= 60 ? "medium" : "low";
  const flagged = predictedScore < 60 || overlap.matchedTokens.length < Math.max(2, Math.floor(rubric.keywords.length / 4));

  const verdict = predictedScore >= 80 ? "AUTO_APPROVED" : predictedScore < 50 ? "AUTO_REJECTED" : "REVIEW";
  const verdictLabel = verdict === "AUTO_APPROVED" ? "Auto-approved" : verdict === "AUTO_REJECTED" ? "Auto-rejected" : "Needs review";

  return {
    predictedScore,
    confidence,
    flagged,
    verdict,
    verdictLabel,
    verdictReason:
      verdict === "AUTO_APPROVED"
        ? "Strong keyword overlap and enough detail to match the task brief."
        : verdict === "AUTO_REJECTED"
          ? "Low content overlap or too little evidence was found in the submission."
          : "The submission is partially aligned, but it needs a final human review.",
    summary: sourceSummary || "A local heuristic score was generated because no AI model was available.",
    feedback:
      predictedScore >= 80
        ? "Strong coverage of the task brief and a solid submission structure."
        : "The submission covers part of the brief, but it needs more detail and stronger alignment with the task description.",
    categoryScores: {
      relevance: Math.max(25, overlap.overlap),
      completeness: Math.max(30, lengthScore),
      structure: structureScore,
      clarity: Math.max(35, Math.round((lengthScore + overlap.overlap) / 2)),
    },
    matchedTokens: overlap.matchedTokens,
    missingTokens: overlap.missingTokens,
    recommendation: flagged ? "Admin review recommended" : "Likely acceptable",
    source: "fallback",
    submissionType,
    sourceSummary,
  };
}

function buildScoringPrompt({ task, submissionText, sourceSummary, submissionType, submissionMeta }) {
  return `
You are a strict but helpful DTMS evaluator.
Return ONLY valid JSON with these keys:
predictedScore (number from 0-100),
confidence ("low" | "medium" | "high"),
flagged (boolean),
verdict ("AUTO_APPROVED" | "AUTO_REJECTED" | "REVIEW"),
verdictLabel (string),
verdictReason (string),
summary (string),
feedback (string),
recommendation (string),
categoryScores (object with relevance, completeness, structure, clarity from 0-100),
matchedTokens (array of strings),
missingTokens (array of strings).

Score the submission against the task brief and requirements.
Be specific and grounded in the evidence. Do not give generic praise.
If the submission is weak, say exactly what is missing or incomplete.
If the GitHub repo is thin, incomplete, or lacks implementation evidence, reduce the score.
If the uploaded file is useful, use it together with the repo evidence.
Task title: ${task?.title || "N/A"}
Task description: ${task?.description || "N/A"}
Task priority: ${task?.priority || "MEDIUM"}
Expected keywords: ${(submissionMeta?.expectedKeywords || []).join(", ") || "N/A"}
AI scoring rules:
${submissionMeta?.promptRules || DEFAULT_AI_PROMPT_RULES}
Submission type: ${submissionType}
Submission source summary: ${sourceSummary || "N/A"}
Evidence highlights:
${submissionMeta?.evidenceSummary || "No extracted evidence available."}
Submission text:
${submissionText || "No text could be extracted."}
`.trim();
}

function normalizePromptRules(value, fallback = DEFAULT_AI_PROMPT_RULES) {
  const text = String(value || "").trim();
  return text || fallback;
}

async function generateWithGemini(task, submissionText, sourceSummary, submissionType, submissionMeta) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return buildFallbackEvaluation(task, submissionText, sourceSummary, submissionType);
  }

  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const prompt = buildScoringPrompt({ task, submissionText, sourceSummary, submissionType, submissionMeta });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 900,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
  const normalizedScore = Number(parsed.predictedScore);
  const predictedScore = Number.isFinite(normalizedScore)
    ? Math.min(100, Math.max(0, Math.round(normalizedScore)))
    : 0;

  return {
    predictedScore,
    confidence: ["low", "medium", "high"].includes(String(parsed.confidence || "").toLowerCase())
      ? String(parsed.confidence).toLowerCase()
      : predictedScore >= 80
        ? "high"
        : predictedScore >= 60
          ? "medium"
          : "low",
    flagged: Boolean(parsed.flagged),
    verdict:
      ["AUTO_APPROVED", "AUTO_REJECTED", "REVIEW"].includes(String(parsed.verdict || "").toUpperCase())
        ? String(parsed.verdict).toUpperCase()
        : predictedScore >= 80
          ? "AUTO_APPROVED"
          : predictedScore < 50
            ? "AUTO_REJECTED"
            : "REVIEW",
    verdictLabel:
      normalizeText(parsed.verdictLabel) ||
      (predictedScore >= 80 ? "Auto-approved" : predictedScore < 50 ? "Auto-rejected" : "Needs review"),
    verdictReason:
      normalizeText(parsed.verdictReason) ||
      (predictedScore >= 80
        ? "The submission strongly matches the task brief."
        : predictedScore < 50
          ? "The submission does not cover enough of the task requirements."
          : "The submission is partial and should be reviewed by an admin."),
    summary: normalizeText(parsed.summary) || sourceSummary || "AI evaluation completed.",
    feedback: normalizeText(parsed.feedback) || "AI analysis completed successfully.",
    recommendation: normalizeText(parsed.recommendation) || "Admin review recommended",
    categoryScores: {
      relevance: Math.min(100, Math.max(0, Number(parsed.categoryScores?.relevance) || predictedScore)),
      completeness: Math.min(100, Math.max(0, Number(parsed.categoryScores?.completeness) || predictedScore)),
      structure: Math.min(100, Math.max(0, Number(parsed.categoryScores?.structure) || predictedScore)),
      clarity: Math.min(100, Math.max(0, Number(parsed.categoryScores?.clarity) || predictedScore)),
    },
    matchedTokens: Array.isArray(parsed.matchedTokens) ? parsed.matchedTokens.slice(0, 20).map((item) => normalizeText(item)).filter(Boolean) : [],
    missingTokens: Array.isArray(parsed.missingTokens) ? parsed.missingTokens.slice(0, 20).map((item) => normalizeText(item)).filter(Boolean) : [],
    source: "gemini",
    submissionType,
    sourceSummary,
  };
}

async function generateWithHuggingFace(task, submissionText, sourceSummary, submissionType, submissionMeta) {
  const token = process.env.HF_TOKEN;
  if (!token) {
    return buildFallbackEvaluation(task, submissionText, sourceSummary, submissionType);
  }

  const model = process.env.HF_MODEL || "deepseek-ai/DeepSeek-V3-0324";
  const prompt = buildScoringPrompt({ task, submissionText, sourceSummary, submissionType, submissionMeta });

  const result = await generateWithHuggingFaceChat({
    token,
    model,
    temperature: 0.2,
    maxTokens: 900,
    messages: [
      {
        role: "system",
        content:
          `You are a strict but helpful DTMS evaluator. Return valid JSON only.\n${DEFAULT_AI_PROMPT_RULES}`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const parsed = result.json;
  const normalizedScore = Number(parsed.predictedScore);
  const predictedScore = Number.isFinite(normalizedScore)
    ? Math.min(100, Math.max(0, Math.round(normalizedScore)))
    : 0;

  return {
    predictedScore,
    confidence: ["low", "medium", "high"].includes(String(parsed.confidence || "").toLowerCase())
      ? String(parsed.confidence).toLowerCase()
      : predictedScore >= 80
        ? "high"
        : predictedScore >= 60
          ? "medium"
          : "low",
    flagged: Boolean(parsed.flagged),
    verdict:
      ["AUTO_APPROVED", "AUTO_REJECTED", "REVIEW"].includes(String(parsed.verdict || "").toUpperCase())
        ? String(parsed.verdict).toUpperCase()
        : predictedScore >= 80
          ? "AUTO_APPROVED"
          : predictedScore < 50
            ? "AUTO_REJECTED"
            : "REVIEW",
    verdictLabel:
      normalizeText(parsed.verdictLabel) ||
      (predictedScore >= 80 ? "Auto-approved" : predictedScore < 50 ? "Auto-rejected" : "Needs review"),
    verdictReason:
      normalizeText(parsed.verdictReason) ||
      (predictedScore >= 80
        ? "The submission strongly matches the task brief."
        : predictedScore < 50
          ? "The submission does not cover enough of the task requirements."
          : "The submission is partial and should be reviewed by an admin."),
    summary: normalizeText(parsed.summary) || sourceSummary || "AI evaluation completed.",
    feedback: normalizeText(parsed.feedback) || "AI analysis completed successfully.",
    recommendation: normalizeText(parsed.recommendation) || "Admin review recommended",
    categoryScores: {
      relevance: Math.min(100, Math.max(0, Number(parsed.categoryScores?.relevance) || predictedScore)),
      completeness: Math.min(100, Math.max(0, Number(parsed.categoryScores?.completeness) || predictedScore)),
      structure: Math.min(100, Math.max(0, Number(parsed.categoryScores?.structure) || predictedScore)),
      clarity: Math.min(100, Math.max(0, Number(parsed.categoryScores?.clarity) || predictedScore)),
    },
    matchedTokens: Array.isArray(parsed.matchedTokens) ? parsed.matchedTokens.slice(0, 20).map((item) => normalizeText(item)).filter(Boolean) : [],
    missingTokens: Array.isArray(parsed.missingTokens) ? parsed.missingTokens.slice(0, 20).map((item) => normalizeText(item)).filter(Boolean) : [],
    source: "huggingface",
    submissionType,
    sourceSummary,
  };
}

async function extractSubmissionText({ submissionType, fileName, fileUrl, githubUrl, fileData, submissionText }) {
  const resolvedLink = String(githubUrl || fileUrl || "").trim();
  const sourceSummary = [];
  let extractedText = normalizeText(submissionText || "");
  let extractedSource = inferSubmissionType({ submissionType, fileName, fileUrl: resolvedLink, githubUrl });

  if (String(resolvedLink).includes("github.com")) {
    const githubText = await extractGithubRepositoryText(resolvedLink);
    extractedText = normalizeText([extractedText, githubText].join(" "));
    sourceSummary.push(`GitHub repository: ${resolvedLink}`);
    if (githubText) {
      sourceSummary.push("Repository metadata and README extracted");
    }
    extractedSource = "github";
  } else if (resolvedLink) {
    const url = resolvedLink;
    const websiteText = await extractWebsiteText(url);
    extractedText = normalizeText([extractedText, websiteText].join(" "));
    sourceSummary.push(`Website URL: ${url}`);
  } else {
    extractedSource = inferSubmissionType({ submissionType, fileName, fileUrl, githubUrl: "" });
  }

  const parsedData = parseDataUrl(fileData);
  const extension = String(fileName || fileUrl || "").toLowerCase();
  const buffer = parsedData?.buffer || null;
  if (buffer) {
    if (extractedSource === "docx" || extension.includes(".docx")) {
      extractedText = normalizeText([extractedText, await extractDocxText(buffer)].join(" "));
      sourceSummary.push("Uploaded DOCX document");
    } else if (extractedSource === "pptx" || extension.includes(".pptx")) {
      extractedText = normalizeText([extractedText, await extractPptxText(buffer)].join(" "));
      sourceSummary.push("Uploaded PPTX presentation");
    } else if (extractedSource === "ppt" || extension.includes(".ppt")) {
      extractedText = normalizeText([extractedText, await extractPptxText(buffer)].join(" "));
      sourceSummary.push("Uploaded PowerPoint presentation");
    } else if (extractedSource === "pdf" || extension.includes(".pdf")) {
      extractedText = normalizeText([extractedText, extractPdfText(buffer)].join(" "));
      sourceSummary.push("Uploaded PDF document");
    } else {
      extractedText = normalizeText([extractedText, buffer.toString("utf8")].join(" "));
      sourceSummary.push(`Uploaded ${String(extractedSource || "file").toUpperCase()} file`);
    }
  }

  if (!sourceSummary.length && fileName) {
    sourceSummary.push(`File: ${fileName}`);
  }

  return {
    submissionType: resolvedType,
    submissionText: extractedText,
    sourceSummary: sourceSummary.join(" | "),
    evidenceSummary: extractedText,
    extractedSource,
  };
}

export async function evaluateSubmission(task, submission = {}, options = {}) {
  const workflowSettings = options.aiWorkflowSettings || (await getAiWorkflowSettings().catch(() => null));
  const promptRules = normalizePromptRules(workflowSettings?.aiPromptRules);
  const { submissionType, submissionText, fileName, fileUrl, githubUrl, fileData } = submission;
  const extracted = await extractSubmissionText({
    submissionType,
    fileName,
    fileUrl,
    githubUrl,
    fileData,
    submissionText,
  });

  const rubric = deriveTaskRubric(task);
  const expectedKeywords = uniqueTokens([
    ...tokenize(task?.title || ""),
    ...tokenize(task?.description || ""),
    ...tokenize(Array.isArray(task?.requirements) ? task.requirements.join(" ") : ""),
    ...tokenize(Array.isArray(task?.acceptanceCriteria) ? task.acceptanceCriteria.join(" ") : ""),
  ]).slice(0, 24);

  const sourceSummary = extracted.sourceSummary || `Submission type: ${extracted.submissionType}`;
  const scoreSeed = extracted.submissionText || normalizeText(fileName || fileUrl || "");

  const llmEvaluation =
    (await generateWithHuggingFace(
      task,
      scoreSeed,
      sourceSummary,
      extracted.submissionType,
      { expectedKeywords, rubric, promptRules, evidenceSummary: extracted.evidenceSummary || extracted.submissionText || "" },
    ).catch(() => null)) ||
    (await generateWithGemini(
      task,
      scoreSeed,
      sourceSummary,
      extracted.submissionType,
      { expectedKeywords, rubric, promptRules, evidenceSummary: extracted.evidenceSummary || extracted.submissionText || "" },
    ).catch(() => null));

  const baselineEvaluation = buildFallbackEvaluation(task, scoreSeed, sourceSummary, extracted.submissionType);
  const evaluation = {
    ...baselineEvaluation,
    summary: normalizeText(llmEvaluation?.summary) || baselineEvaluation.summary,
    feedback: normalizeText(llmEvaluation?.feedback) || baselineEvaluation.feedback,
    recommendation: normalizeText(llmEvaluation?.recommendation) || baselineEvaluation.recommendation,
    llmSource: llmEvaluation?.source || baselineEvaluation.source,
    llmVerdict: llmEvaluation?.verdict || baselineEvaluation.verdict,
  };

  const finalEvaluation = {
    ...evaluation,
    evaluatedAt: new Date().toISOString(),
    submissionType: extracted.submissionType,
    sourceSummary,
    taskKeywords: expectedKeywords,
    analysisId: crypto.randomUUID(),
    expectedScoreRange: {
      autoApprove: 80,
      autoReject: 50,
    },
  };

  finalEvaluation.flagged = Boolean(
    finalEvaluation.flagged ||
      finalEvaluation.predictedScore < 60 ||
      finalEvaluation.confidence === "low" ||
      (finalEvaluation.categoryScores?.relevance ?? 100) < 55,
  );

  return finalEvaluation;
}
