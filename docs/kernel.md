# Kernel map

How this wrapper sits on the official Cloudflare OS kernel. The core lives in the pinned `cloudflare-os` submodule (`6478a1448a11524e2f7c2575ad66fab0bc47c433`) and is not patched here.

## Where the kernel is

| Piece | Path in the submodule |
| --- | --- |
| Overseer / workspace Durable Object | `packages/workshop-backend/src/overseer.ts` |
| Gatekeeper contract | `packages/workshop-shared/src/gatekeeper.ts` |
| Agent catalog clamp | `boundAgentCatalog()` in that same file |
| Slash-command dispatch | `packages/workshop-backend/src/slash-commands.ts` |
| Context Library (git-backed skills) | `packages/gatekeeper-context/` |
| Scheduler | `packages/gatekeeper-scheduler/` |
| Write-gatekeeper skill | `.agents/skills/write-gatekeeper/SKILL.md` |

The Overseer names gadget facets `gadget` / `gadget${id}` and gatekeeper facets `gatekeeper${id}` so storage keys cannot collide.

## How this custom Gatekeeper is bound

`scripts/deploy.ts` generates a `GATEKEEPER_CUSTOM` service binding on the Workshop Worker and injects `CUSTOM_NAME` / `CUSTOM_MESSAGE` from `deployment.jsonc`. The backend auto-discovers vendors from `GATEKEEPER_`-prefixed bindings.

The custom Worker is auto-provisioned: `GatekeeperVendor.createAccount()` returns `CustomAccount`, which returns `CustomGatekeeper` as the singleton. There is no OAuth connect flow.

## Read and write contract

From `workshop-shared` `ApprovalQueue`:

1. Reads call `authorizeObservation({ title, description })` and wait before returning data.
2. Writes call `submitAction(action: number, description)`. The ID is assigned by the Gatekeeper, not by the kernel.
3. The kernel later calls `applyAction(action)`, `rejectAction(action)`, or `revertAction(action)` on the Gatekeeper Durable Object.
4. Session JSDoc must not mention this pipeline. Simulation makes pending writes look applied on later reads.

Operator notes in `packages/custom-gatekeeper` follow that contract:

- `fileOperatorNote` allocates the next integer ID, queues a pending note, then `submitAction`s.
- `listOperatorNotes` / `getOperatorNote` authorize an observation and merge pending over applied.
- Reject or a failed submit drops the pending record. Revert removes an applied note.

## Context vs this Gatekeeper

| | Context (`brenda-os-context`) | Custom (`brenda-os-custom-gk`) |
| --- | --- | --- |
| Owner | Official core | This wrapper |
| Data | Git-backed `SKILL.md` collections | Topology, glossary, estate, operator notes |
| Writes | Read-only library | Simulated operator notes |
| Catalog | Collections and skills | Company skills, glossary, estate |
| Slash commands | Collection skills | Company skills in `src/company-os.ts` |

Keep both. Context is the kernel skill store. The custom Gatekeeper is company operating context.

## What this repo will not do

- Patch the `cloudflare-os` submodule
- Guess a Cloudflare account ID from other public Workers
- Run `pnpm deploy` while `deployment.jsonc` still has `<...>` placeholders
- Start a new OAuth / external-service Gatekeeper without an operator review of `types.d.ts`
