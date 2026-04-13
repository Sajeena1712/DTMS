import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import prisma from "./prisma.js";

export const DEFAULT_AI_THRESHOLDS = {
  autoApproveThreshold: 80,
  autoRejectThreshold: 50,
};

export const DEFAULT_AI_PROMPT_RULES = [
  "Score against the task title, description, requirements, and acceptance criteria.",
  "Prefer clear relevance to the task brief over generic praise.",
  "Reward complete, structured, and easy-to-review submissions.",
  "Flag submissions with weak evidence, suspiciously short answers, or missing core requirements.",
  "Explain the score in short plain language so admins can act quickly.",
].join("\n");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const automationDirectory = path.resolve(__dirname, "../../data");
const automationSettingsPath = path.join(automationDirectory, "automation-settings.json");

async function readAutomationSettingsFile() {
  try {
    const raw = await fs.readFile(automationSettingsPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeAutomationSettingsFile(data = {}) {
  await fs.mkdir(automationDirectory, { recursive: true });
  await fs.writeFile(automationSettingsPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function normalizeThreshold(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function normalizeThresholdPair(input = {}, fallback = DEFAULT_AI_THRESHOLDS) {
  let autoApproveThreshold = normalizeThreshold(input.autoApproveThreshold, fallback.autoApproveThreshold);
  let autoRejectThreshold = normalizeThreshold(input.autoRejectThreshold, fallback.autoRejectThreshold);

  if (autoApproveThreshold <= autoRejectThreshold) {
    autoApproveThreshold = Math.min(100, Math.max(autoRejectThreshold + 1, autoApproveThreshold));
  }

  if (autoRejectThreshold >= autoApproveThreshold) {
    autoRejectThreshold = Math.max(0, autoApproveThreshold - 1);
  }

  return {
    autoApproveThreshold,
    autoRejectThreshold,
  };
}

function normalizePromptRules(value, fallback = DEFAULT_AI_PROMPT_RULES) {
  const text = String(value || "").trim();
  return text || fallback;
}

export async function getAiWorkflowSettings() {
  const fileSettings = await readAutomationSettingsFile();
  const record = await prisma.aiWorkflowSettings.findFirst({
    orderBy: { createdAt: "asc" },
  }).catch(() => null);
  const recordPromptRules = record?.aiPromptRules || "";
  const promptRules = normalizePromptRules(fileSettings.aiPromptRules || recordPromptRules, DEFAULT_AI_PROMPT_RULES);

  if (!record) {
    return {
      ...DEFAULT_AI_THRESHOLDS,
      aiPromptRules: promptRules,
    };
  }

  return {
    ...normalizeThresholdPair(record, DEFAULT_AI_THRESHOLDS),
    aiPromptRules: promptRules,
  };
}

export async function upsertAiWorkflowSettings(input = {}) {
  const current = await getAiWorkflowSettings();
  const next = normalizeThresholdPair(input, current);
  const aiPromptRules = normalizePromptRules(input.aiPromptRules, current.aiPromptRules);
  const existing = await prisma.aiWorkflowSettings.findFirst({
    orderBy: { createdAt: "asc" },
  }).catch(() => null);

  const prismaData = {
    ...next,
  };

  if (existing) {
    const updated = await prisma.aiWorkflowSettings.update({
      where: { id: existing.id },
      data: prismaData,
    });

    await writeAutomationSettingsFile({
      aiPromptRules,
    });

    return {
      ...updated,
      aiPromptRules,
    };
  }

  const created = await prisma.aiWorkflowSettings.create({
    data: prismaData,
  });

  await writeAutomationSettingsFile({
    aiPromptRules,
  });

  return {
    ...created,
    aiPromptRules,
  };
}
