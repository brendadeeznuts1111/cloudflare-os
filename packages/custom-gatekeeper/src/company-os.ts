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
    role: "This Worker. Company context, topology, docs, and operating skills.",
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
      "Never put secrets in wrangler.jsonc or deployment.jsonc",
      "Read packages/custom-gatekeeper/README.md and the upstream write-gatekeeper skill",
    ],
  },
] as const;

export type CompanySkill = (typeof SKILLS)[number];

export function listSkillSummaries() {
  return SKILLS.map(({ id, title, summary }) => ({ id, title, summary }));
}

export function getSkillById(id: string): CompanySkill | null {
  return SKILLS.find((skill) => skill.id === id) ?? null;
}
