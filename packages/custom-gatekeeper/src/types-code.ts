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
}
`;

export default TYPES_CODE;
