# How this Cloudflare OS is built

Cloudflare OS is an AI workspace, not a desktop OS. This repository is the **deployment wrapper**. The kernel lives in the pinned `cloudflare-os` submodule and is not patched here.

## Three layers

| Layer | What it is | Where it lives |
| --- | --- | --- |
| Admin UI | Branding, agent instructions, featured blueprints, connector policy | `/admin` after deploy — no redeploy |
| Deployment config | Account, Worker names, Access, AI Gateway, storage | [`deployment.jsonc`](../deployment.jsonc) |
| Wrapper-owned code | Company Gatekeepers and error reporting | [`packages/`](../packages/) |

Prefer a higher layer. Patch the submodule only when a Worker boundary cannot express the behavior.

## Kernel analogy

The official core uses operating-system vocabulary on purpose:

| Traditional OS | This deployment |
| --- | --- |
| Kernel | `cloudflare-os/packages/workshop-backend` — especially `OverseerImpl` in `overseer.ts` |
| Device drivers | Gatekeepers (`packages/gatekeeper-*` upstream, `packages/custom-gatekeeper` here) |
| Shell | `cloudflare-os/packages/workshop-frontend` |
| Processes | Gadgets — each a Dynamic Worker Facet with its own SQLite |
| Executables | Blueprints — shareable gadget source, not live state |
| Missing in a normal OS | Agents — they write and run code, and must stay accountable to a human |

Every workspace is its own Durable Object. The Overseer names gadget facets `gadget` / `gadget${id}` and gatekeeper facets `gatekeeper${id}` so their storage keys cannot collide (`overseer.ts` `gadgetFacetName`).

## Trust boundary

```
Browser
  -> Cloudflare Access (deployed mode)
  -> brenda-os-router          // only public route
       /api           -> brenda-os-workshop
       /gatekeeper/*  -> matching Gatekeeper binding
```

Workshop, Context, Scheduler, Custom Gatekeeper, and Error Reporter have no public route. Gadgets cannot reach the internet except through capabilities you introduce. Server code runs in a Dynamic Worker with outbound networking disabled. Client code runs in a sandboxed iframe.

A Gatekeeper is not an MCP server with ambient tools. Agents start with no access. You introduce a specific resource; the Gatekeeper holds the credential, logs observations, and simulates writes until a human approves them.

## This wrapper's Gatekeeper

`packages/custom-gatekeeper` is the company-context capability for Brenda OS. It is auto-provisioned (no OAuth). It is no longer read-only: operator notes use the official write path.

An agent bound to it can call:

- `getDeploymentInfo()` — name and guidance from `deployment.jsonc`
- `getTopology()` — Worker names, pinned core SHA, remaining deploy blockers
- `listOfficialDocs()` — official Cloudflare OS and platform docs
- `listSkills()` / `getSkill(id)` — curated operating skills (`run-local`, `fill-deploy-config`, `upgrade-core`, `extend-this-gatekeeper`, `file-operator-note`)
- `listGlossary()` / `getGlossaryEntry(term)` — Cloudflare OS vocabulary
- `listEstate()` / `getEstateWorker(name)` — existing Worker inventory (no account IDs)
- `fileOperatorNote(title, body)` / `listOperatorNotes()` / `getOperatorNote(id)` — durable notes

Every read records an observation before returning data. That is the same pattern a GitHub or Google Gatekeeper uses for reads.

Writes call `submitAction(actionId, { title, description, implementsRevert: true })` with a sequential integer ID, then queue a pending record. `listOperatorNotes()` merges pending over applied and never returns status. The Durable Object applies, rejects, or reverts only in `applyAction` / `rejectAction` / `revertAction`. If `submitAction` fails, the pending record is dropped.

This catalog is wrapper-owned and parallel to the official Context Gatekeeper (`brenda-os-context`), which stores git-backed `SKILL.md` collections. Do not replace Context with these company skills.

Workshop extras:

- `getAgentCatalog()` — skills first, then glossary, then estate, passed through `boundAgentCatalog()`
- `getSlashCommandProvider()` — `/run-local` and the other company skills expand after an observation
- `describe().hasSlashCommands = true`

To add a real organization API (issues, CRM, warehouse), keep the Worker in `packages/`, follow [`packages/custom-gatekeeper/README.md`](../packages/custom-gatekeeper/README.md), and load the upstream [`write-gatekeeper` skill](https://github.com/cloudflare/cloudflare-os/blob/main/.agents/skills/write-gatekeeper/SKILL.md). Design `types.d.ts` and stop for review before adding a new external-service Gatekeeper.

## What deploy creates

Six Workers, derived from upstream Wrangler base configs by `scripts/deploy.ts`:

1. `brenda-os-errors`
2. `brenda-os-custom-gk`, `brenda-os-context`, `brenda-os-scheduler`
3. `brenda-os-workshop`
4. `brenda-os-router` last, because it binds the others

Context and Scheduler are ambient (`PREINSTALL`). The hosted flow at [os.cloudflare.app/deploy](https://os.cloudflare.app/deploy) installs the same upstream release without this repo.

## Local vs hosted

| Path | Command | Needs Cloudflare account |
| --- | --- | --- |
| Local demo | `pnpm --dir cloudflare-os run-local` → http://localhost:8787 | No |
| This repo | Fill `deployment.jsonc`, `wrangler login`, `pnpm deploy` | Yes |
| Hosted | https://os.cloudflare.app/deploy | Yes |

Remaining deploy blockers are listed by `getTopology().deployBlockers` and in [DEPLOY.md](../DEPLOY.md).
