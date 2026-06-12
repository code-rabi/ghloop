# acpx-gh-action

`acpx-gh-action` scaffolds an ACPX-powered GitHub Actions workflow plus a matching `flows/*.ts` file.

The default scaffold listens for a specific GitHub issue label, runs a chosen coding agent against that issue inside the repository checkout, and opens a PR if the run produces changes.

This repo also now ships a reusable composite action at `.github/actions/run-acpx-flow`, so generated workflows can reference a real `uses:` target instead of inlining the `acpx` bootstrap.

For ACPX runtime and flow authoring docs, see:

- https://github.com/openclaw/acpx

## What it generates

- `.github/workflows/<flow-name>.yml`
- `flows/<flow-name>.ts`

The scaffold source lives in Handlebars templates:

- `templates/default/workflow.yml.hbs`
- `templates/default/flow.ts.hbs`

## Usage

```bash
pnpm install
pnpm run build
node dist/cli.js init
```

## CI And Publishing

This repo includes:

- `.github/workflows/ci.yml` to run `pnpm install --frozen-lockfile`, `pnpm run build`, and `pnpm run test`
- `.github/workflows/publish.yml` to publish to npm from GitHub Actions using trusted publishing

To use secure npm publishing, configure npm to trust this repository and the `.github/workflows/publish.yml` workflow as a trusted publisher. With npm trusted publishing on GitHub-hosted runners, OIDC is used instead of an `NPM_TOKEN`, and provenance is generated automatically.

The CLI prompts for:

- flow name
- workflow display name
- reusable action reference
- coding agent from the current `acpx` built-in list
- runner setup command for `acpx` plus the chosen agent
- primary auth secret env var to expose
- GitHub issue label to respond to
- extra GitHub secret names to expose as environment variables
- target repository directory

## Generated workflow behavior

The scaffolded workflow:

1. Triggers on `issues.opened` and `issues.labeled`
2. Runs only when the configured label is present on the issue
3. Checks out the target repository
4. Calls a reusable action via `uses: <your-action-ref>`
5. Runs `acpx --approve-all flow run flows/<flow>.ts`
6. Opens a PR and comments on the issue when code changes were produced

Example:

```yaml
- name: Run Codex Review
  uses: code-rabi/acpx-gh-action/.github/actions/run-acpx-flow@main
  with:
    flow-path: flows/issue-label-agent.ts
    default-agent: codex
    input-json: '{"repo":"${{ github.repository }}","issueNumber":${{ github.event.issue.number }}}'
    setup-command: npm install -g acpx @openai/codex
    github-token: ${{ github.token }}
    agent-auth-key: OPENAI_API_KEY
    agent-auth-value: ${{ secrets.OPENAI_API_KEY }}
```

## Secrets

Known default auth secret suggestions:

- `codex`: `OPENAI_API_KEY`
- `claude`: `ANTHROPIC_API_KEY`
- `gemini`: `GEMINI_API_KEY`

Other agents vary, so the CLI lets you override the primary auth env var and setup command directly. Any extra secret names entered in the CLI are added to the workflow `env` block as `${{ secrets.NAME }}`.
