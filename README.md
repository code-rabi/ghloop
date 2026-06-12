# ghloop

`ghloop` is a CLI for scaffolding ACPX-powered GitHub issue automation loops.

It generates:

- `.github/workflows/<flow-name>.yml`
- `flows/<flow-name>.ts`

The generated workflow always references the reusable action from this repo:

- `code-rabi/ghloop/.github/actions/run-acpx-flow@main`

For ACPX runtime and flow authoring docs, see:

- https://github.com/openclaw/acpx

## Usage

```bash
pnpm install
pnpm run build
node dist/cli.js init
```

Installed command:

- `ghloop`

The CLI asks for:

- flow name
- coding agent
- GitHub issue label

It always:

- generates into the current repository
- derives the agent auth secret key from the selected agent when one is known

At the end, it tells you which GitHub secrets to set and links back to this README for more details.

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

## Known Agent Secrets

- `codex`: `OPENAI_API_KEY`
- `claude`: `ANTHROPIC_API_KEY`
- `gemini`: `GEMINI_API_KEY`
- `cursor`: `CURSOR_API_KEY`

Other agents may not have a baked-in auth secret name yet.

## CI And Publishing

This repo includes:

- `.github/workflows/ci.yml` for build and test
- `.github/workflows/publish.yml` for npm trusted publishing

To use secure npm publishing, configure npm to trust this repository and the `.github/workflows/publish.yml` workflow as a trusted publisher. On GitHub-hosted runners this uses OIDC instead of an `NPM_TOKEN`, and npm provenance is generated automatically.
