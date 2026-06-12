import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import Handlebars from "handlebars";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type AgentConfig = {
  id: string;
  label: string;
  setupCommand: string;
  authEnvName?: string;
};

export type Answers = {
  flowName: string;
  issueLabel: string;
  agent: AgentConfig;
  extraSecrets: string[];
  targetDir: string;
};

export const AGENTS: AgentConfig[] = [
  { id: "pi", label: "Pi Coding Agent", setupCommand: "pnpm add -g acpx" },
  { id: "openclaw", label: "OpenClaw ACP bridge", setupCommand: "pnpm add -g acpx" },
  {
    id: "codex",
    label: "Codex",
    setupCommand: "pnpm add -g acpx @openai/codex",
    authEnvName: "OPENAI_API_KEY",
  },
  {
    id: "claude",
    label: "Claude Code",
    setupCommand: "pnpm add -g acpx @anthropic-ai/claude-code",
    authEnvName: "ANTHROPIC_API_KEY",
  },
  {
    id: "gemini",
    label: "Gemini CLI",
    setupCommand: "pnpm add -g acpx @google/gemini-cli",
    authEnvName: "GEMINI_API_KEY",
  },
  {
    id: "cursor",
    label: "Cursor CLI",
    setupCommand: "pnpm add -g acpx",
    authEnvName: "CURSOR_API_KEY",
  },
  { id: "copilot", label: "GitHub Copilot CLI", setupCommand: "pnpm add -g acpx" },
  { id: "droid", label: "Factory Droid", setupCommand: "pnpm add -g acpx" },
  { id: "fast-agent", label: "fast-agent", setupCommand: "pnpm add -g acpx" },
  { id: "iflow", label: "iFlow CLI", setupCommand: "pnpm add -g acpx" },
  { id: "kilocode", label: "Kilocode", setupCommand: "pnpm add -g acpx @kilocode/cli" },
  { id: "kimi", label: "Kimi CLI", setupCommand: "pnpm add -g acpx" },
  { id: "kiro", label: "Kiro CLI", setupCommand: "pnpm add -g acpx" },
  { id: "mux", label: "Mux", setupCommand: "pnpm add -g acpx mux@^0.27.0" },
  { id: "opencode", label: "OpenCode", setupCommand: "pnpm add -g acpx opencode-ai" },
  { id: "qoder", label: "Qoder CLI", setupCommand: "pnpm add -g acpx" },
  { id: "qwen", label: "Qwen Code", setupCommand: "pnpm add -g acpx" },
  { id: "trae", label: "Trae CLI", setupCommand: "pnpm add -g acpx" },
];

type TemplateContext = {
  flowName: string;
  workflowName: string;
  issueLabel: string;
  actionRef: string;
  agentId: string;
  agentLabel: string;
  setupCommand: string;
  authEnvName?: string;
  extraEnv: Record<string, string>;
};

const handlebars = Handlebars.create();
handlebars.registerHelper("gh", (expr: string) => `\${{ ${expr} }}`);
handlebars.registerHelper("json", (value: unknown) => JSON.stringify(value));
handlebars.registerHelper("concat", (...parts: unknown[]) =>
  parts.slice(0, -1).map(String).join(""),
);
handlebars.registerHelper("object", (...parts: unknown[]) => {
  const result: Record<string, unknown> = {};
  for (let index = 0; index < parts.length - 1; index += 2) {
    result[String(parts[index])] = parts[index + 1];
  }
  return result;
});

export async function renderScaffold(answers: Answers): Promise<{
  workflow: string;
  flow: string;
}> {
  const [workflowTemplate, flowTemplate] = await Promise.all([
    readTemplate("templates/default/workflow.yml.hbs"),
    readTemplate("templates/default/flow.ts.hbs"),
  ]);

  const context: TemplateContext = {
    flowName: toKebabCase(answers.flowName),
    workflowName: toWorkflowName(answers.agent.label, answers.issueLabel),
    issueLabel: answers.issueLabel,
    actionRef: "code-rabi/aglc/.github/actions/run-acpx-flow@main",
    agentId: answers.agent.id,
    agentLabel: answers.agent.label,
    setupCommand: answers.agent.setupCommand,
    authEnvName: answers.agent.authEnvName,
    extraEnv: Object.fromEntries(
      answers.extraSecrets.map((secretName) => [secretName, `\${{ secrets.${secretName} }}`]),
    ),
  };

  return {
    workflow: handlebars.compile(workflowTemplate, { noEscape: true })(context),
    flow: handlebars.compile(flowTemplate, { noEscape: true })(context),
  };
}

export async function writeScaffold(
  answers: Answers,
  rendered: { workflow: string; flow: string },
): Promise<{ workflowPath: string; flowPath: string }> {
  const workflowPath = path.join(
    answers.targetDir,
    ".github",
    "workflows",
    `${toKebabCase(answers.flowName)}.yml`,
  );
  const flowPath = path.join(
    answers.targetDir,
    "flows",
    `${toKebabCase(answers.flowName)}.ts`,
  );

  await ensureWritable(workflowPath);
  await ensureWritable(flowPath);
  await mkdir(path.dirname(workflowPath), { recursive: true });
  await mkdir(path.dirname(flowPath), { recursive: true });

  await Promise.all([
    writeFile(workflowPath, rendered.workflow, "utf8"),
    writeFile(flowPath, rendered.flow, "utf8"),
  ]);

  return { workflowPath, flowPath };
}

export async function readTemplate(relativePath: string): Promise<string> {
  const filename = fileURLToPath(import.meta.url);
  const packageRoot = path.resolve(path.dirname(filename), "..");
  return readFile(path.join(packageRoot, relativePath), "utf8");
}

export async function ensureWritable(filePath: string): Promise<void> {
  try {
    await stat(filePath);
    throw new Error(`Refusing to overwrite existing file: ${filePath}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }
}

export function parseSecretList(raw: string): string[] {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(toEnvVarName)
    .filter((value, index, array) => array.indexOf(value) === index);
}

export function toKebabCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function toTitleCase(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function toWorkflowName(agentLabel: string, issueLabel: string): string {
  return `${agentLabel} - ${toTitleCase(toKebabCase(issueLabel))}`;
}

export function toEnvVarName(value: string): string {
  return value
    .trim()
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}
