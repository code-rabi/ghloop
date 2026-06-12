#!/usr/bin/env node

import path from "node:path";
import { input, select } from "@inquirer/prompts";
import {
  AGENTS,
  type Answers,
  renderScaffold,
  toKebabCase,
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
  const secrets = [answers.agent.authEnvName, ...answers.extraSecrets].filter(Boolean);
  const readmeUrl = "https://github.com/code-rabi/aglc#readme";
  if (secrets.length > 0) {
    console.log(`2. Set these GitHub secrets: ${secrets.join(", ")}.`);
  } else {
    console.log("2. No default agent secret was derived for this agent.");
  }
  console.log(`3. See ${readmeUrl} for setup details.`);
}

async function promptForAnswers(): Promise<Answers> {
  const flowName = toKebabCase(
    await input({
      message: "Flow name",
      default: "issue-label-agent",
    }),
  );
  const agentId = await select({
    message: "Choose the coding agent for this flow",
    pageSize: 12,
    choices: AGENTS.map((agent) => ({
      name: `${agent.label} (${agent.id})`,
      value: agent.id,
      description: agent.authEnvName
        ? `Uses ${agent.authEnvName} by default`
        : "No default auth secret derived",
    })),
  });
  const agent = AGENTS.find((entry) => entry.id === agentId);
  if (!agent) {
    throw new Error(`Unknown agent selected: ${agentId}`);
  }

  const issueLabel = (
    await input({
      message: "GitHub issue label to respond to",
      default: "auto-fix",
    })
  ).trim();

  return {
    flowName,
    issueLabel,
    agent,
    extraSecrets: [],
    targetDir: path.resolve(process.cwd()),
  };
}

void main();
