#!/usr/bin/env node

import path from "node:path";
import { stdin as input, stdout as output } from "node:process";
import readline from "node:readline/promises";
import {
  AGENTS,
  type AgentConfig,
  type Answers,
  parseSecretList,
  renderScaffold,
  toEnvVarName,
  toKebabCase,
  toTitleCase,
  writeScaffold,
} from "./scaffold.js";

async function main(): Promise<void> {
  const command = process.argv[2] ?? "init";
  if (command !== "init") {
    console.error(`Unknown command "${command}". Only "init" is supported.`);
    process.exitCode = 1;
    return;
  }

  const answers = await promptForAnswers();
  const rendered = await renderScaffold(answers);
  const { workflowPath, flowPath } = await writeScaffold(answers, rendered);

  console.log("");
  console.log(`Created ${workflowPath}`);
  console.log(`Created ${flowPath}`);
  console.log("");
  console.log("Next steps:");
  console.log("1. Commit the generated files.");
  if (answers.authEnvName) {
    console.log(
      `2. Add ${answers.authEnvName} as a GitHub Actions secret in the target repository.`,
    );
  }
  if (answers.extraSecrets.length > 0) {
    console.log(
      `${answers.authEnvName ? "3" : "2"}. Add these extra secrets too: ${answers.extraSecrets.join(", ")}`,
    );
  }
}

async function promptForAnswers(): Promise<Answers> {
  const rl = readline.createInterface({ input, output });
  try {
    const flowName = toKebabCase(await ask(rl, "Flow name", "issue-label-agent"));
    const workflowName = await ask(rl, "Workflow display name", toTitleCase(flowName));
    const actionRef = await ask(
      rl,
      "Reusable action reference",
      "OWNER/REPO/.github/actions/run-acpx-flow@main",
    );
    const issueLabel = (await ask(rl, "Issue label to respond to", "auto-fix")).trim();
    const agent = await askForAgent(rl);
    const setupCommand = await ask(
      rl,
      "Runner setup command for acpx and this agent",
      agent.setupCommand,
    );
    const authEnvName = toEnvVarName(
      await ask(rl, "Primary auth secret env var to expose", agent.authEnvName ?? ""),
    );
    const extraSecrets = parseSecretList(
      await ask(
        rl,
        "Extra GitHub secret names to expose as env vars (comma-separated)",
        "",
      ),
    );
    const targetDir = path.resolve(
      (await ask(rl, "Target repository directory", process.cwd())).trim(),
    );

    return {
      flowName,
      workflowName,
      issueLabel,
      actionRef,
      agent,
      setupCommand,
      authEnvName: authEnvName || undefined,
      extraSecrets,
      targetDir,
    };
  } finally {
    rl.close();
  }
}

async function ask(
  rl: readline.Interface,
  label: string,
  fallback: string,
): Promise<string> {
  const suffix = fallback ? ` [${fallback}]` : "";
  const answer = await rl.question(`${label}${suffix}: `);
  return answer.trim() || fallback;
}

async function askForAgent(rl: readline.Interface): Promise<AgentConfig> {
  while (true) {
    console.log("");
    console.log("Choose coding agent:");
    for (const [index, agent] of AGENTS.entries()) {
      console.log(`${index + 1}. ${agent.id} - ${agent.label}`);
    }
    const raw = (await ask(rl, "Agent", "1")).toLowerCase();
    const byIndex = Number(raw);
    if (Number.isInteger(byIndex) && byIndex >= 1 && byIndex <= AGENTS.length) {
      return AGENTS[byIndex - 1];
    }
    const byId = AGENTS.find((agent) => agent.id === raw);
    if (byId) {
      return byId;
    }
    console.log(
      `Enter 1-${AGENTS.length} or one of: ${AGENTS.map((agent) => agent.id).join(", ")}.`,
    );
  }
}

void main();
