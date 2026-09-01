/** Curated Brenda OS context. Not secrets — agents and Gadgets may read this after an observation. */

export const PINNED_CORE_SHA = "6478a1448a11524e2f7c2575ad66fab0bc47c433";

export const WORKERS = [
  {
    bindingRole: "router",
    workerName: "brenda-os-router",
    role: "Only public route. Serves the frontend and proxies /api and /gatekeeper/*.",
  },
  {
    bindingRole: "workshop",
    workerName: "brenda-os-workshop",
    role: "Kernel. Durable Objects hold users, workspaces, gadgets, and the agent loop.",
  },
  {
    bindingRole: "context",
    workerName: "brenda-os-context",
    role: "Ambient Context Gatekeeper for curated company knowledge collections.",
  },
  {
    bindingRole: "scheduler",
    workerName: "brenda-os-scheduler",
    role: "Ambient Scheduler Gatekeeper for delayed and recurring agent work.",
  },
  {
    bindingRole: "customGatekeeper",
    workerName: "brenda-os-custom-gk",
    role: "This Worker. Company context, topology, docs, skills, estate inventory, and operator notes.",
  },
  {
    bindingRole: "errorReporter",
    workerName: "brenda-os-errors",
    role: "Private structured error destination. No public route.",
  },
] as const;

export const DEPLOY_BLOCKERS = [
  "accountId — 32-character Cloudflare account ID",
  "publicBaseUrl — https://brenda-os-router.<subdomain>.workers.dev",
  "access.issuer — https://<team>.cloudflareaccess.com",
  "access.audience — Access application AUD tag",
  "access.admins — verified admin email list",
  "wrangler login — OAuth session on the deploy machine",
] as const;

export const OFFICIAL_DOCS = [
  { title: "Product site", url: "https://os.cloudflare.app" },
  { title: "Hosted deploy", url: "https://os.cloudflare.app/deploy" },
  { title: "Announcement", url: "https://blog.cloudflare.com/cloudflare-os/" },
  { title: "Core repository", url: "https://github.com/cloudflare/cloudflare-os" },
  { title: "Official starter", url: "https://github.com/cloudflare/cloudflare-os-starter" },
  { title: "This deployment", url: "https://github.com/brendadeeznuts1111/cloudflare-os" },
  { title: "Blueprints", url: "https://github.com/cloudflare/cloudflare-os/blob/main/docs/blueprints.md" },
  { title: "Sharing", url: "https://github.com/cloudflare/cloudflare-os/blob/main/docs/sharing.md" },
  { title: "Observers", url: "https://github.com/cloudflare/cloudflare-os/blob/main/docs/observers.md" },
  { title: "Durable Objects", url: "https://developers.cloudflare.com/durable-objects/" },
  { title: "Dynamic Workers", url: "https://blog.cloudflare.com/dynamic-workers/" },
  { title: "Facets", url: "https://blog.cloudflare.com/durable-object-facets-dynamic-workers/" },
  { title: "AI Gateway", url: "https://developers.cloudflare.com/ai-gateway/" },
  { title: "Cloudflare Access", url: "https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/" },
] as const;

export const SKILLS = [
  {
    id: "run-local",
    title: "Run Brenda OS locally",
    summary: "Start the pinned core on workerd without a Cloudflare account.",
    steps: [
      "From the repo root: git submodule update --init",
      "If the gitlink is missing: git submodule add https://github.com/cloudflare/cloudflare-os.git cloudflare-os && git -C cloudflare-os checkout 6478a1448a11524e2f7c2575ad66fab0bc47c433",
      "bash scripts/sync-upstream-generated.sh",
      "Use Node.js 24.19+ and pnpm 11.17",
      "pnpm --dir cloudflare-os install",
      "pnpm --dir cloudflare-os run-local",
      "Open http://localhost:8787",
    ],
  },
  {
    id: "fill-deploy-config",
    title: "Fill deployment.jsonc for a first deploy",
    summary: "Replace the remaining Access and account placeholders, then check before deploying.",
    steps: [
      "Set accountId to the 32-character Cloudflare account ID",
      "Keep Worker names as brenda-os-* unless those names are taken",
      "Leave the router on workersDev: true for evaluation",
      "Set publicBaseUrl to https://brenda-os-router.<subdomain>.workers.dev",
      "Create a self-hosted Access application for that origin",
      "Set access.issuer, access.audience, and access.admins",
      "Run pnpm exec wrangler login, then pnpm check, then pnpm deploy",
      "Open /admin and set site name, logo, accent, and connector policy",
      "Do not guess an account ID from other public Workers or repositories",
    ],
  },
  {
    id: "upgrade-core",
    title: "Upgrade the pinned Cloudflare OS core",
    summary: "Move the submodule gitlink only after reviewing catalog and Wrangler base configs.",
    steps: [
      "Record the current cloudflare-os gitlink for rollback",
      "Update the submodule to the intended upstream commit",
      "Diff cloudflare-os/pnpm-workspace.yaml catalog against this repo's catalog and re-sync",
      "Review Workshop and Context Wrangler base-config changes",
      "pnpm install && pnpm --dir cloudflare-os install && pnpm lint && pnpm check",
      "Deploy and verify Access, admin, storage, AI, Context, custom observations, and error reports",
    ],
  },
  {
    id: "extend-this-gatekeeper",
    title: "Add a real organization API to this Gatekeeper",
    summary: "Keep deployment-owned Gatekeepers in packages/ and follow the write-gatekeeper skill.",
    steps: [
      "Design the Session API in src/types.d.ts around capabilities, not a god-object",
      "Mirror the same text in src/types-code.ts — that string is what agents see",
      "Authorize every read with authorizeObservation before returning data",
      "Submit writes with submitAction and apply them only in applyAction",
      "Never mention the write pipeline in Session JSDoc — simulation keeps it invisible",
      "Never put secrets in wrangler.jsonc or deployment.jsonc",
      "Read packages/custom-gatekeeper/README.md and the upstream write-gatekeeper skill",
    ],
  },
  {
    id: "file-operator-note",
    title: "File an operator note",
    summary: "Write a durable note through the custom Session and read it back immediately.",
    steps: [
      "Call fileOperatorNote(title, body) on the custom Session",
      "List notes with listOperatorNotes() — the new note is visible immediately",
      "Read one note with getOperatorNote(id) using the id from the file or list result",
    ],
  },
] as const;

export const GLOSSARY = [
  {
    term: "Cloudflare OS",
    meaning:
      "Open-source AI workspace (not a replacement OS). Agents work through Gatekeepers; code and data live in Gadgets.",
  },
  {
    term: "Gadget",
    meaning:
      "A sandboxed workspace: a Dynamic Worker plus a Durable Object Facet with SQLite. Isolated per user.",
  },
  {
    term: "Gatekeeper",
    meaning:
      "A capability driver. Reads are observed. Writes become visible immediately on the Session; a human may later revert them.",
  },
  {
    term: "Facet",
    meaning:
      "A named Durable Object binding on the Overseer (`gadget`, `gadget${id}`, `gatekeeper${id}`) so many DO classes share one Worker.",
  },
  {
    term: "Context Gatekeeper",
    meaning:
      "Official kernel Gatekeeper that stores git-backed SKILL.md collections. Distinct from this wrapper-owned custom Gatekeeper.",
  },
  {
    term: "Custom Gatekeeper",
    meaning:
      "This Worker (packages/custom-gatekeeper). Company topology, glossary, estate inventory, and operator notes. No OAuth.",
  },
  {
    term: "deployment.jsonc",
    meaning:
      "Wrapper trust-and-infra config: account, routes, Access, Worker names, custom Gatekeeper branding. Prefer this over forking core.",
  },
] as const;

/**
 * Existing Cloudflare Workers this operator already runs.
 * Names only — no account IDs, tokens, or hostnames that would leak tenancy.
 */
export const ESTATE = [
  {
    name: "bookdeskops",
    role: "production",
    notes: "Existing production Worker. Not part of the Brenda OS deploy set.",
  },
  {
    name: "bookdeskops-staging",
    role: "staging",
    notes: "Staging counterpart to bookdeskops.",
  },
  {
    name: "tennis-hq",
    role: "app",
    notes: "Existing application Worker. Keep separate from brenda-os-* names.",
  },
  {
    name: "bet-ticker-worker",
    role: "app",
    notes: "Existing application Worker.",
  },
  {
    name: "fantasy402-ingestion",
    role: "ingestion",
    notes: "Existing ingestion Worker.",
  },
  {
    name: "factory-wager-r2",
    role: "storage",
    notes: "Existing R2-backed Worker.",
  },
] as const;

export type CompanySkill = (typeof SKILLS)[number];
export type GlossaryEntry = (typeof GLOSSARY)[number];
export type EstateWorker = (typeof ESTATE)[number];

export function listSkillSummaries() {
  return SKILLS.map(({ id, title, summary }) => ({ id, title, summary }));
}

export function getSkillById(id: string): CompanySkill | null {
  return SKILLS.find((skill) => skill.id === id) ?? null;
}

export function listGlossaryEntries() {
  return GLOSSARY.map((entry) => ({ ...entry }));
}

export function getGlossaryEntry(term: string): GlossaryEntry | null {
  const needle = term.trim().toLowerCase();
  return GLOSSARY.find((entry) => entry.term.toLowerCase() === needle) ?? null;
}

export function listEstateWorkers() {
  return ESTATE.map((entry) => ({ ...entry }));
}

export function getEstateWorker(name: string): EstateWorker | null {
  return ESTATE.find((entry) => entry.name === name) ?? null;
}

/** Discovery index for Gatekeeper.getAgentCatalog(). Skills first so they survive the clamp. */
export function buildCompanyCatalogEntries() {
  return [
    ...SKILLS.map((skill) => ({
      id: `skill:${skill.id}`,
      title: skill.title,
      description: skill.summary,
    })),
    ...GLOSSARY.map((entry) => ({
      id: `glossary:${entry.term}`,
      title: entry.term,
      description: entry.meaning,
    })),
    ...ESTATE.map((entry) => ({
      id: `estate:${entry.name}`,
      title: entry.name,
      description: `${entry.role} — ${entry.notes}`,
    })),
  ];
}
