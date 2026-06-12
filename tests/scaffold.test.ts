import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AGENTS,
  parseSecretList,
  renderScaffold,
  toEnvVarName,
  toKebabCase,
  toTitleCase,
  toWorkflowName,
  type Answers,
} from "../src/scaffold.js";

function makeAnswers(overrides: Partial<Answers> = {}): Answers {
  const agent = AGENTS.find((entry) => entry.id === "codex");
  if (!agent) {
    throw new Error("Missing codex agent fixture.");
  }

  return {
    flowName: "Issue Label Agent",
    issueLabel: "auto-fix",
    agent,
    extraSecrets: ["DATABASE_URL", "NEXT_PUBLIC_APP_URL"],
    targetDir: path.resolve("/tmp/ghloop-test"),
    ...overrides,
  };
}

describe("utility transforms", () => {
  it("normalizes kebab case", () => {
    expect(toKebabCase(" Issue Label Agent ")).toBe("issue-label-agent");
  });

  it("normalizes title case", () => {
    expect(toTitleCase("issue-label-agent")).toBe("Issue Label Agent");
  });

  it("derives workflow name from agent and label", () => {
    expect(toWorkflowName("Codex", "auto-fix")).toBe("Codex - Auto Fix");
  });

  it("normalizes env vars", () => {
    expect(toEnvVarName("next public-app url")).toBe("NEXT_PUBLIC_APP_URL");
  });

  it("parses and deduplicates secrets", () => {
    expect(parseSecretList("database_url, NEXT_PUBLIC_APP_URL, database-url")).toEqual([
      "DATABASE_URL",
      "NEXT_PUBLIC_APP_URL",
    ]);
  });

  it("includes a baked-in auth key for Cursor", () => {
    const cursor = AGENTS.find((entry) => entry.id === "cursor");
    expect(cursor?.authEnvName).toBe("CURSOR_API_KEY");
  });
});

describe("renderScaffold", () => {
  it("renders a workflow with reusable action inputs and GitHub expressions intact", async () => {
    const { workflow } = await renderScaffold(makeAnswers());

    expect(workflow).toContain(
      "uses: code-rabi/ghloop/.github/actions/run-acpx-flow@main",
    );
    expect(workflow).toContain("default-agent: codex");
    expect(workflow).toContain("github-token: ${{ github.token }}");
    expect(workflow).toContain("agent-auth-key: OPENAI_API_KEY");
    expect(workflow).toContain("agent-auth-value: ${{ secrets.OPENAI_API_KEY }}");
    expect(workflow).toContain(
      `input-json: '{"repo":"\${{ github.repository }}","issueNumber":"\${{ github.event.issue.number }}","label":"auto-fix"}'`,
    );
    expect(workflow).toContain(
      `extra-env-json: '{"DATABASE_URL":"\${{ secrets.DATABASE_URL }}","NEXT_PUBLIC_APP_URL":"\${{ secrets.NEXT_PUBLIC_APP_URL }}"}'`,
    );
  });

  it("omits auth inputs when the agent has no default auth env var", async () => {
    const openclaw = AGENTS.find((entry) => entry.id === "openclaw");
    if (!openclaw) {
      throw new Error("Missing openclaw agent fixture.");
    }

    const { workflow } = await renderScaffold(
      makeAnswers({
        agent: openclaw,
        extraSecrets: [],
      }),
    );

    expect(workflow).not.toContain("agent-auth-key:");
    expect(workflow).not.toContain("agent-auth-value:");
  });

  it("renders a flow that uses the action node for publish", async () => {
    const { flow } = await renderScaffold(makeAnswers());

    expect(flow).toContain('name: "issue-label-agent"');
    expect(flow).toContain("publish: action({");
    expect(flow).toContain("async function publishResult(");
    expect(flow).not.toContain("node <<'NODE'");
  });
});
