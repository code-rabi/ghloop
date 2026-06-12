# ghloop

Convert your repo into a full agentic SDLC loop with one command.

```bash
npx ghloop init
```

`ghloop` scaffolds an [ACPX-powered](https://github.com/openclaw/acpx) GitHub Action plus a matching flow so a GitHub issue label can trigger an agent, run a workflow, and open a PR back into the repo.

## What It Adds

- `.github/workflows/<flow-name>.yml`
- `flows/<flow-name>.ts`

Generated workflows use the reusable action from this repo:

- `code-rabi/ghloop/.github/actions/run-acpx-flow@main`

You can view the [source here](/.github/actions/run-acpx-flow/action.yml)

## What The CLI Asks

- flow name
- coding agent
- GitHub issue label

It derives the agent auth key when one is known and tells you which GitHub secrets to set at the end.

Known built-in agent secrets:

- `codex`: `OPENAI_API_KEY`
- `claude`: `ANTHROPIC_API_KEY`
- `gemini`: `GEMINI_API_KEY`
- `cursor`: `CURSOR_API_KEY`

## Example

```yaml
- name: Run Codex Review
  uses: code-rabi/ghloop/.github/actions/run-acpx-flow@main
  with:
    flow-path: flows/issue-label-agent.ts
    default-agent: codex
    input-json: '{"repo":"${{ github.repository }}","issueNumber":"${{ github.event.issue.number }}","label":"auto-fix"}'
    setup-command: pnpm add -g acpx @openai/codex
    github-token: ${{ github.token }}
    agent-auth-key: OPENAI_API_KEY
    agent-auth-value: ${{ secrets.OPENAI_API_KEY }}
```

## ACPX

For ACPX runtime and flow authoring docs:

- https://github.com/openclaw/acpx
- https://acpx.sh/flows.html

## Publishing

This repo includes:

- `.github/workflows/ci.yml` for build and test
- `.github/workflows/publish.yml` for npm trusted publishing

If you publish your own fork or package, configure npm to trust the `.github/workflows/publish.yml` workflow as a trusted publisher.

Release flow:

1. Bump `package.json` to the version you want to publish.
2. Commit and push it.
3. Create a GitHub release with tag `v<package.json version>`.

The publish workflow validates that the GitHub release tag matches `package.json`.

## Contributing

```bash
pnpm install
pnpm run build
pnpm run test
```
