const TYPES_CODE = `/** Information supplied by the organization operating this CloudflareOS deployment. */
export interface CustomDeploymentInfo {
  name: string;
  message: string;
}

/** One Worker in this Brenda OS deployment. */
export interface OsWorker {
  /** Role key in deployment.jsonc, e.g. "router". */
  bindingRole: string;
  /** Cloudflare Worker service name. */
  workerName: string;
  /** What this Worker does. */
  role: string;
}

/** How this deployment is wired and what still blocks production deploy. */
export interface DeploymentTopology {
  name: string;
  message: string;
  /** Pinned cloudflare/cloudflare-os gitlink. */
  pinnedCoreSha: string;
  route: "workers.dev";
  workers: OsWorker[];
  deployBlockers: string[];
}

/** Official Cloudflare OS or platform documentation. */
export interface OfficialDoc {
  title: string;
  url: string;
}

/** A curated way of working that agents should follow in this deployment. */
export interface CompanySkill {
  id: string;
  title: string;
  summary: string;
  steps: string[];
}

/** A Brenda OS term and its meaning. */
export interface GlossaryEntry {
  term: string;
  meaning: string;
}

/** An existing Cloudflare Worker this operator already runs, outside the Brenda OS deploy set. */
export interface EstateWorker {
  name: string;
  role: string;
  notes: string;
}

/** A durable operator note filed through this Session. */
export interface OperatorNote {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

/** Capability provided to the CloudflareOS agent for this deployment. */
export interface CustomSession {
  /**
   * Returns the deployment display name and guidance from deployment.jsonc.
   */
  getDeploymentInfo(): Promise<CustomDeploymentInfo>;

  /**
   * Returns Worker names, the pinned core commit, the evaluation route, and remaining deploy blockers.
   */
  getTopology(): Promise<DeploymentTopology>;

  /**
   * Returns the official documentation map for Cloudflare OS and the Workers platform.
   */
  listOfficialDocs(): Promise<OfficialDoc[]>;

  /**
   * Lists curated operating skills. Use getSkill(id) for the full steps.
   */
  listSkills(): Promise<Array<Pick<CompanySkill, "id" | "title" | "summary">>>;

  /**
   * Returns one skill's full instructions, or null if the id is unknown.
   */
  getSkill(id: string): Promise<CompanySkill | null>;

  /**
   * Lists Brenda OS glossary terms. Use getGlossaryEntry(term) for one definition.
   */
  listGlossary(): Promise<GlossaryEntry[]>;

  /**
   * Returns one glossary entry, matching term case-insensitively, or null if unknown.
   */
  getGlossaryEntry(term: string): Promise<GlossaryEntry | null>;

  /**
   * Lists existing Cloudflare Workers this operator already runs (names and roles only).
   */
  listEstate(): Promise<EstateWorker[]>;

  /**
   * Returns one estate Worker by exact name, or null if unknown.
   */
  getEstateWorker(name: string): Promise<EstateWorker | null>;

  /**
   * Files an operator note and returns it. The note is visible immediately via listOperatorNotes()
   * and getOperatorNote(id).
   */
  fileOperatorNote(title: string, body: string): Promise<OperatorNote>;

  /**
   * Lists operator notes, newest first.
   */
  listOperatorNotes(): Promise<OperatorNote[]>;

  /**
   * Returns one operator note by id, or null if unknown.
   */
  getOperatorNote(id: string): Promise<OperatorNote | null>;
}
`;

export default TYPES_CODE;
