import { evaluateSubmission as evaluateSubmissionScore } from "../lib/submissionEvaluation.js";
import { getAiWorkflowSettings, upsertAiWorkflowSettings } from "../lib/aiWorkflowSettings.js";
import { generateWithHuggingFaceChat } from "../lib/huggingFaceChat.js";

function titleCaseWords(value = "") {
  return String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function normalizeText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function inferPriority(idea = "") {
  const text = String(idea).toLowerCase();

  if (/(urgent|asap|critical|production|security|launch|deadline)/.test(text)) {
    return "HIGH";
  }

  if (/(improve|design|dashboard|integration|bug|fix|review)/.test(text)) {
    return "MEDIUM";
  }

  return "LOW";
}

function inferEstimatedTime(idea = "") {
  const text = String(idea).toLowerCase();

  if (/(dashboard|portal|integration|analytics|workflow|admin panel)/.test(text)) {
    return "4-6 days";
  }

  if (/(login|form|page|screen|ui|component)/.test(text)) {
    return "1-2 days";
  }

  return "2-3 days";
}

function clampInteger(value, min, max, fallback = min) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(parsed)));
}

const TASK_SCORING_GUIDE = [
  "Clarity (0-25): easy to understand in one reading",
  "Completeness (0-25): includes goal, context, audience, deadline, and expected outcome",
  "Specificity (0-20): concrete deliverables and constraints",
  "Feasibility (0-15): realistic scope and execution plan",
  "Context (0-15): enough situational detail to act on",
  "Band 80-100: Strong, ready for execution with minor polish",
  "Band 60-79: Solid, usable but still benefits from extra detail",
  "Band 40-59: Partial, under-specified and needs more context",
  "Band 0-39: Weak, too vague for confident execution",
  "Final score rule: score must equal the sum of all five rubric values",
].join("\n");

const TASK_SCORE_BANDS = [
  { min: 80, label: "Strong", description: "ready for execution with minor polish" },
  { min: 60, label: "Solid", description: "usable but still benefits from extra detail" },
  { min: 40, label: "Partial", description: "under-specified and needs more context" },
  { min: 0, label: "Weak", description: "too vague for confident execution" },
];

function buildScoreBreakdown(input = {}) {
  const idea = normalizeText(input.idea);
  const context = normalizeText(input.context);
  const audience = normalizeText(input.audience);
  const deadline = normalizeText(input.deadline);
  const priority = normalizeText(input.priority);
  const text = `${idea} ${context} ${audience} ${deadline} ${priority}`.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const hasSpecificTerms = /(dashboard|page|screen|workflow|api|integration|report|approval|upload|review|team|admin|user|deadline|priority|validation|analytics)/.test(text);
  const hasActionVerb = /(build|create|design|implement|review|update|improve|prepare|draft|generate|fix|submit|approve|reject)/.test(text);
  const hasContext = Boolean(context || audience || deadline || priority);

  const clarity = clampInteger(
    (hasActionVerb ? 10 : 5) +
      (idea ? Math.min(10, Math.max(4, Math.round(idea.length / 12))) : 0) +
      (wordCount >= 8 ? 5 : 2) +
      (hasContext ? 5 : 2),
    0,
    25,
    12,
  );

  const completeness = clampInteger(
    (idea ? 8 : 2) +
      (context ? 7 : 2) +
      (audience ? 5 : 1) +
      (deadline ? 3 : 1) +
      (priority ? 2 : 1),
    0,
    25,
    10,
  );

  const specificity = clampInteger(
    (hasSpecificTerms ? 8 : 3) +
      (/[0-9]/.test(text) ? 4 : 0) +
      (wordCount >= 12 ? 5 : 2) +
      (/(email|pdf|ppt|doc|website|form|table|chart|notification|approval|submission)/.test(text) ? 8 : 3),
    0,
    20,
    8,
  );

  const feasibility = clampInteger(
    (wordCount <= 40 ? 6 : 4) +
      (hasContext ? 4 : 2) +
      (/(urgent|asap|critical|today|tomorrow)/.test(text) ? 2 : 5) +
      (/(dashboard|integration|workflow|analytics|admin panel)/.test(text) ? 2 : 4),
    0,
    15,
    8,
  );

  const contextScore = clampInteger(
    (context ? 6 : 2) +
      (audience ? 4 : 1) +
      (deadline ? 3 : 1) +
      (priority ? 2 : 1),
    0,
    15,
    6,
  );

  return {
    clarity,
    completeness,
    specificity,
    feasibility,
    context: contextScore,
  };
}

function sumScoreBreakdown(scoreBreakdown = {}) {
  return clampInteger(
    Number(scoreBreakdown.clarity || 0) +
      Number(scoreBreakdown.completeness || 0) +
      Number(scoreBreakdown.specificity || 0) +
      Number(scoreBreakdown.feasibility || 0) +
      Number(scoreBreakdown.context || 0),
    0,
    100,
    0,
  );
}

function buildScoreAnalysis(scoreBreakdown = {}, fallbackText = "") {
  const total = sumScoreBreakdown(scoreBreakdown);
  const band = TASK_SCORE_BANDS.find((entry) => total >= entry.min) || TASK_SCORE_BANDS[TASK_SCORE_BANDS.length - 1];
  const strengths = [];
  const gaps = [];

  if (scoreBreakdown.clarity >= 18) strengths.push("clear task intent");
  else gaps.push("clarity");

  if (scoreBreakdown.completeness >= 18) strengths.push("good context coverage");
  else gaps.push("completeness");

  if (scoreBreakdown.specificity >= 14) strengths.push("specific deliverables");
  else gaps.push("specificity");

  if (scoreBreakdown.feasibility >= 10) strengths.push("practical scope");
  else gaps.push("feasibility");

  if (scoreBreakdown.context >= 10) strengths.push("strong audience/deadline context");
  else gaps.push("context");

  const lead = `${band.label} task brief: ${band.description}.`;

  const strengthsText = strengths.length ? `Strong areas: ${strengths.join(", ")}.` : "Strong areas were limited.";
  const gapsText = gaps.length ? `Needs improvement in: ${gaps.join(", ")}.` : "Few rubric gaps detected.";
  const fallbackSuffix = fallbackText ? ` ${fallbackText}` : "";

  return `${lead} ${strengthsText} ${gapsText}${fallbackSuffix}`.trim();
}

function buildFallbackDraft(input = {}) {
  const idea = normalizeText(input.idea);
  const audience = normalizeText(input.audience) || "the target user";
  const context = normalizeText(input.context);
  const title = titleCaseWords(idea || "Task");
  const priority = inferPriority(`${idea} ${context}`);
  const estimatedTime = inferEstimatedTime(`${idea} ${context}`);
  const scoreBreakdown = buildScoreBreakdown({
    idea,
    context,
    audience,
    deadline: input.deadline,
    priority,
  });

  const requirements = [
    "Implement the core user flow end to end.",
    "Validate inputs and handle empty states gracefully.",
    "Keep the UI responsive and consistent with DTMS styling.",
  ];

  const acceptanceCriteria = [
    "The feature works for the intended user role.",
    "The flow includes validation and a clear success state.",
    "The result is ready for review and testing.",
  ];

  return {
    title: title || "Task Draft",
    description: idea
      ? `Build ${idea.toLowerCase()} for ${audience}. ${context ? `Context: ${context}. ` : ""}Focus on clarity, usability, and a polished delivery.`
      : "Describe the task goal, target users, and expected outcome.",
    requirements,
    acceptanceCriteria,
    priority,
    estimatedTime,
    scoreBreakdown,
    score: sumScoreBreakdown(scoreBreakdown),
    analysis: buildScoreAnalysis(scoreBreakdown, "Generated from the local DTMS fallback assistant."),
    notes: "Generated from the local DTMS fallback assistant.",
    source: "fallback",
  };
}

function extractJsonCandidate(text = "") {
  const cleaned = String(text)
    .replace(/```json/gi, "```")
    .replace(/```/g, "")
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : cleaned;
}

function normalizeAiDraft(rawDraft = {}, fallback = {}, source = "fallback") {
  const title = normalizeText(rawDraft.title) || fallback.title;
  const description = normalizeText(rawDraft.description) || fallback.description;
  const requirements = Array.isArray(rawDraft.requirements)
    ? rawDraft.requirements.map((item) => normalizeText(item)).filter(Boolean).slice(0, 6)
    : fallback.requirements;
  const acceptanceCriteria = Array.isArray(rawDraft.acceptanceCriteria)
    ? rawDraft.acceptanceCriteria.map((item) => normalizeText(item)).filter(Boolean).slice(0, 6)
    : fallback.acceptanceCriteria;
  const priority = ["LOW", "MEDIUM", "HIGH"].includes(String(rawDraft.priority || "").toUpperCase())
    ? String(rawDraft.priority).toUpperCase()
    : fallback.priority;
  const estimatedTime = normalizeText(rawDraft.estimatedTime) || fallback.estimatedTime;
  const notes = normalizeText(rawDraft.notes) || fallback.notes;
  const analysis = normalizeText(rawDraft.analysis) || normalizeText(rawDraft.scoreAnalysis) || fallback.analysis;
  const rawBreakdown = rawDraft.scoreBreakdown && typeof rawDraft.scoreBreakdown === "object" ? rawDraft.scoreBreakdown : {};
  const scoreBreakdown = {
    clarity: clampInteger(rawBreakdown.clarity, 0, 25, fallback.scoreBreakdown?.clarity ?? 0),
    completeness: clampInteger(rawBreakdown.completeness, 0, 25, fallback.scoreBreakdown?.completeness ?? 0),
    specificity: clampInteger(rawBreakdown.specificity, 0, 20, fallback.scoreBreakdown?.specificity ?? 0),
    feasibility: clampInteger(rawBreakdown.feasibility, 0, 15, fallback.scoreBreakdown?.feasibility ?? 0),
    context: clampInteger(rawBreakdown.context, 0, 15, fallback.scoreBreakdown?.context ?? 0),
  };
  const score = sumScoreBreakdown(scoreBreakdown);

  return {
    title,
    description,
    requirements,
    acceptanceCriteria,
    priority,
    estimatedTime,
    scoreBreakdown,
    score,
    analysis,
    notes,
    source: rawDraft.source || source || fallback.source,
  };
}

async function generateWithOpenAI(input, fallbackDraft, promptRules = "") {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_TASK_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const prompt = `
You are an expert DTMS task planner.
Return ONLY valid JSON that matches the schema.

Task idea: ${input.idea}
Context: ${input.context || "N/A"}
Audience: ${input.audience || "N/A"}
Current title: ${input.currentTitle || "N/A"}
Current description: ${input.currentDescription || "N/A"}
Deadline hint: ${input.deadline || "N/A"}
Priority hint: ${input.priority || "N/A"}

Prompt rules:
${promptRules || `Score against the task idea, context, audience, deadline, and priority hints.\n${TASK_SCORING_GUIDE}`}
`.trim();

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      instructions:
        `Generate a task draft and score it with the provided rubric. The final score must equal the sum of the scoreBreakdown fields. Return valid JSON only.\n${TASK_SCORING_GUIDE}`,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "task_draft",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: [
              "title",
              "description",
              "priority",
              "estimatedTime",
              "score",
              "scoreBreakdown",
              "requirements",
              "acceptanceCriteria",
              "analysis",
              "notes",
            ],
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
              estimatedTime: { type: "string" },
              score: { type: "integer" },
              scoreBreakdown: {
                type: "object",
                additionalProperties: false,
                required: ["clarity", "completeness", "specificity", "feasibility", "context"],
                properties: {
                  clarity: { type: "integer" },
                  completeness: { type: "integer" },
                  specificity: { type: "integer" },
                  feasibility: { type: "integer" },
                  context: { type: "integer" },
                },
              },
              requirements: {
                type: "array",
                items: { type: "string" },
              },
              acceptanceCriteria: {
                type: "array",
                items: { type: "string" },
              },
              analysis: { type: "string" },
              notes: { type: "string" },
            },
          },
        },
      },
      temperature: 0.3,
      max_output_tokens: 700,
    }),
  });

  if (!response.ok) {
    let errorBody = null;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = null;
    }

    const providerError = new Error(
      errorBody?.error?.message || `OpenAI request failed with status ${response.status}`,
    );
    providerError.provider = "openai";
    providerError.code = errorBody?.error?.code || `http_${response.status}`;
    providerError.status = response.status;
    throw providerError;
  }

  const payload = await response.json();
  const text = payload?.output_text || payload?.output?.[0]?.content?.[0]?.text || "";
  if (!text) {
    throw new Error("OpenAI returned an empty response");
  }

  const parsed = JSON.parse(extractJsonCandidate(text));
  return normalizeAiDraft(parsed, fallbackDraft, "openai");
}

async function generateWithGemini(input, fallbackDraft, promptRules = "") {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  const prompt = `
You are an expert DTMS task planner.
Return ONLY valid JSON with these keys:
title (string),
description (string),
requirements (array of strings),
acceptanceCriteria (array of strings),
priority (LOW, MEDIUM, or HIGH),
estimatedTime (string),
score (integer 0-100),
scoreBreakdown (object with clarity, completeness, specificity, feasibility, context),
analysis (string explaining the score),
notes (string).

Rules:
${promptRules || `Score against the task idea, context, audience, deadline, and priority hints.\n${TASK_SCORING_GUIDE}`}
The final score must equal the sum of the scoreBreakdown values exactly.

Write a concise, production-ready task draft for this request:
Task idea: ${input.idea}
Context: ${input.context || "N/A"}
Audience: ${input.audience || "N/A"}
Current title: ${input.currentTitle || "N/A"}
Current description: ${input.currentDescription || "N/A"}
Deadline hint: ${input.deadline || "N/A"}
Priority hint: ${input.priority || "N/A"}
`.trim();

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
          temperature: 0.4,
          maxOutputTokens: 700,
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

  const parsed = JSON.parse(extractJsonCandidate(text));
  return normalizeAiDraft(parsed, fallbackDraft, "gemini");
}

async function generateWithHuggingFace(input, fallbackDraft, promptRules = "") {
  const token = process.env.HF_TOKEN;
  if (!token) {
    return null;
  }

  const model = process.env.HF_MODEL || "deepseek-ai/DeepSeek-V3-0324";
  const prompt = `
You are an expert DTMS task planner.
Return ONLY valid JSON that matches the schema.

Task idea: ${input.idea}
Context: ${input.context || "N/A"}
Audience: ${input.audience || "N/A"}
Current title: ${input.currentTitle || "N/A"}
Current description: ${input.currentDescription || "N/A"}
Deadline hint: ${input.deadline || "N/A"}
Priority hint: ${input.priority || "N/A"}

Prompt rules:
${promptRules || `Score against the task idea, context, audience, deadline, and priority hints.\n${TASK_SCORING_GUIDE}`}
`.trim();

  const result = await generateWithHuggingFaceChat({
    token,
    model,
    temperature: 0.3,
    maxTokens: 700,
    messages: [
      {
        role: "system",
        content:
          `Generate a task draft and score it with the provided rubric. The final score must equal the sum of the scoreBreakdown fields. Return valid JSON only.\n${TASK_SCORING_GUIDE}`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  if (!result) {
    return null;
  }

  return normalizeAiDraft(result.json, fallbackDraft, "huggingface");
}

export async function generateTaskDraft(input = {}) {
  const normalizedIdea = normalizeText(input.idea);
  if (!normalizedIdea) {
    throw new Error("Task idea is required");
  }

  const settings = await getAiWorkflowSettings().catch(() => null);
  const promptRules = settings?.aiPromptRules || "";
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY);
  const hasHuggingFaceKey = Boolean(process.env.HF_TOKEN);
  const fallbackDraft = buildFallbackDraft({
    idea: normalizedIdea,
    context: input.context || "",
    audience: input.audience || "",
    deadline: input.deadline || "",
    priority: input.priority || "",
  });

  const requestInput = {
    idea: normalizedIdea,
    context: input.context || "",
    audience: input.audience || "",
    currentTitle: input.currentTitle || "",
    currentDescription: input.currentDescription || "",
    deadline: input.deadline || "",
    priority: input.priority || "",
  };

  if (hasHuggingFaceKey) {
    try {
      const hfDraft = await generateWithHuggingFace(requestInput, fallbackDraft, promptRules);
      if (hfDraft) {
        return {
          draft: hfDraft,
          provider: "huggingface",
          message: "Task draft generated successfully with Hugging Face.",
        };
      }
    } catch (error) {
      // Fall through to the other providers and the local fallback.
    }
  }

  if (hasGeminiKey) {
    try {
      const geminiDraft = await generateWithGemini(requestInput, fallbackDraft, promptRules);
      if (geminiDraft) {
        return {
          draft: geminiDraft,
          provider: "gemini",
          message: "Task draft generated successfully with Gemini.",
        };
      }
    } catch (error) {
      const providerMessage =
        error?.message || "Gemini request failed. Generated a local task draft instead.";
      return {
        draft: fallbackDraft,
        provider: "fallback-gemini",
        message: providerMessage,
      };
    }
  }

  if (hasOpenAiKey) {
    try {
      const openAiDraft = await generateWithOpenAI(requestInput, fallbackDraft, promptRules);
      if (openAiDraft) {
        return {
          draft: openAiDraft,
          provider: "openai",
          message: "Task draft generated successfully with OpenAI.",
        };
      }
    } catch (error) {
      const providerMessage =
        error?.code === "insufficient_quota"
          ? "OpenAI quota is exhausted for this API key. Generated a local task draft instead."
          : error?.message || "OpenAI request failed. Generated a local task draft instead.";
      return {
        draft: fallbackDraft,
        provider: "fallback-openai",
        message: providerMessage,
      };
    }
  }

  return {
    draft: fallbackDraft,
    provider: "fallback",
    message: "Generated a local task draft because no AI key was configured.",
  };
}

export async function generateTaskDescription(req, res, next) {
  try {
    const {
      idea,
      context = "",
      audience = "",
      currentTitle = "",
      currentDescription = "",
      deadline = "",
      priority = "",
    } = req.body || {};

    const normalizedIdea = normalizeText(idea);
    if (!normalizedIdea) {
      return res.status(400).json({ message: "Task idea is required" });
    }

    const result = await generateTaskDraft({
      idea: normalizedIdea,
      context,
      audience,
      currentTitle,
      currentDescription,
      deadline,
      priority,
    });

    return res.status(200).json({
      draft: result.draft,
      provider: result.provider,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

export async function evaluateSubmission(req, res, next) {
  try {
    const task =
      req.body?.task ||
      req.body?.taskSnapshot ||
      req.body?.taskData ||
      req.body?.existingTask ||
      req.body?.taskInfo ||
      null;
    const submission = req.body?.submission || req.body || {};
    const settings = await getAiWorkflowSettings().catch(() => null);
    const evaluation = await evaluateSubmissionScore(task, submission, {
      aiWorkflowSettings: settings || undefined,
    });

    return res.status(200).json({
      evaluation,
      message: "Submission evaluated successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function getAiSettings(req, res, next) {
  try {
    const settings = await getAiWorkflowSettings();
    return res.status(200).json({ settings });
  } catch (error) {
    next(error);
  }
}

export async function updateAiSettings(req, res, next) {
  try {
    const settings = await upsertAiWorkflowSettings(req.body || {});
    return res.status(200).json({
      settings,
      message: "AI settings updated successfully",
    });
  } catch (error) {
    next(error);
  }
}
