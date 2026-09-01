import {
  DurableObject,
  RpcStub,
  RpcTarget,
  WorkerEntrypoint,
} from "cloudflare:workers";
import { skipRpcValidation, validateRpc } from "capnweb-validate";
import type {
  AccountDescription,
  ApprovalQueue,
  Gatekeeper,
  GatekeeperConnectCallback,
  GatekeeperConnectOptions,
  GatekeeperUser,
  GatekeeperUserVerifier,
  ResourceConfiguratorFrame,
  ResourceDescription,
  SupportedResource,
  VendorDescription,
} from "@gadgets/workshop-shared/gatekeeper";
import type { CompanySkill, CustomDeploymentInfo, CustomSession, DeploymentTopology, OfficialDoc } from "./types.js";
import TYPES_CODE from "./types-code.js";
import {
  DEPLOY_BLOCKERS,
  OFFICIAL_DOCS,
  PINNED_CORE_SHA,
  WORKERS,
  getSkillById,
  listSkillSummaries,
} from "./company-os.js";

const CUSTOM_ICON = {
  url:
    "data:image/svg+xml," +
    encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' fill='none' stroke='currentColor' stroke-width='20'><path d='M52 72h152v112H52z'/><path d='m52 88 76 52 76-52'/></svg>",
    ),
};

type ObservationQueue = Pick<ApprovalQueue, "authorizeObservation"> &
  Partial<{ [Symbol.dispose](): void }>;

export function describeCustomVendor(): VendorDescription {
  return {
    displayName: "Brenda OS",
    url: "https://github.com/brendadeeznuts1111/cloudflare-os",
    logo: CUSTOM_ICON,
    color: "#e8f2ff",
    tagline: "Personal Cloudflare OS deployment",
    description:
      "Example Gatekeeper for the brendadeeznuts1111 Cloudflare OS instance. Replace this with your organization's systems.",
    autoProvisionsAccount: true,
    providesAuth: false,
  };
}

export function describeCustomAccount(): AccountDescription {
  return {
    displayName: "Brenda OS",
    avatar: CUSTOM_ICON,
    singleton: { tsType: "CustomSession" },
  };
}

@validateRpc()
export class CustomSessionImpl extends RpcTarget implements CustomSession {
  readonly #approvalQueue: ObservationQueue;
  readonly #info: CustomDeploymentInfo;

  constructor(approvalQueue: ObservationQueue, info: CustomDeploymentInfo) {
    super();
    this.#approvalQueue = approvalQueue;
    this.#info = info;
  }

  async getDeploymentInfo(): Promise<CustomDeploymentInfo> {
    await this.#approvalQueue.authorizeObservation({
      title: "Read deployment information",
      description: "Read the custom information configured by this deployment.",
    });
    return this.#info;
  }

  async getTopology(): Promise<DeploymentTopology> {
    await this.#approvalQueue.authorizeObservation({
      title: "Read Brenda OS topology",
      description: "Read Worker names, the pinned core commit, and remaining deploy blockers.",
    });
    return {
      name: this.#info.name,
      message: this.#info.message,
      pinnedCoreSha: PINNED_CORE_SHA,
      route: "workers.dev",
      workers: WORKERS.map((worker) => ({ ...worker })),
      deployBlockers: [...DEPLOY_BLOCKERS],
    };
  }

  async listOfficialDocs(): Promise<OfficialDoc[]> {
    await this.#approvalQueue.authorizeObservation({
      title: "Read official documentation map",
      description: "Read the official Cloudflare OS and platform documentation list.",
    });
    return OFFICIAL_DOCS.map((doc) => ({ ...doc }));
  }

  async listSkills(): Promise<Array<Pick<CompanySkill, "id" | "title" | "summary">>> {
    await this.#approvalQueue.authorizeObservation({
      title: "List company skills",
      description: "List curated operating skills for this Brenda OS deployment.",
    });
    return listSkillSummaries();
  }

  async getSkill(id: string): Promise<CompanySkill | null> {
    await this.#approvalQueue.authorizeObservation({
      title: "Read company skill",
      description: `Read the operating skill "${id}".`,
    });
    const skill = getSkillById(id);
    return skill ? { ...skill, steps: [...skill.steps] } : null;
  }

  [Symbol.dispose](): void {
    this.#approvalQueue[Symbol.dispose]?.();
  }
}

@validateRpc()
export class CustomGatekeeper extends DurableObject<Cloudflare.Env> implements Gatekeeper<CustomSession> {
  async describe(): Promise<ResourceDescription> {
    return {
      url: "custom://deployment-info",
      title: "Deployment information",
      snippet: "Brenda OS topology, official docs, and operating skills for this deployment.",
      suggestedBindingName: "CUSTOM",
      tsType: "CustomSession",
    };
  }

  async getTypeScriptTypes(): Promise<string> {
    return TYPES_CODE;
  }

  async getAutoApprovableActions(): Promise<[]> {
    return [];
  }

  async startSession(approvalQueue: RpcStub<ApprovalQueue>): Promise<CustomSession> {
    return new CustomSessionImpl(approvalQueue.dup(), {
      name: this.env.CUSTOM_NAME,
      message: this.env.CUSTOM_MESSAGE,
    });
  }

  async addObserver(_id: string, _user: Fetcher<GatekeeperUserVerifier>): Promise<void> {}
  async removeObserver(_id: string): Promise<void> {}

  async applyAction(action: number): Promise<void> {
    throw new Error(`Custom Gatekeeper has no actions (${action}).`);
  }

  async rejectAction(_action: number): Promise<void> {}

  async revertAction(_action: number): Promise<void> {
    throw new Error("Custom Gatekeeper has no actions to revert.");
  }
}

@validateRpc()
export class CustomAccount extends WorkerEntrypoint<Cloudflare.Env> implements GatekeeperUser {
  async describe(): Promise<AccountDescription> {
    return describeCustomAccount();
  }

  async getSingletonGatekeeperClass(): Promise<DurableObjectClass<Gatekeeper<CustomSession>>> {
    return this.ctx.exports.CustomGatekeeper({});
  }

  async getSupportedResources(): Promise<SupportedResource[]> {
    return [];
  }

  getGatekeeperClassFor(_url: string): never {
    throw new Error("Custom Gatekeeper has no URL-addressed resources.");
  }

  startResourceConfigurator(_resourceUrlPattern: string): Promise<ResourceConfiguratorFrame> {
    throw new Error("Custom Gatekeeper has no URL-addressed resources.");
  }

  async ensureResources(_resourceUrlPatterns: string[]): Promise<{ url?: string }> {
    return {};
  }

  async revoke(): Promise<void> {}

  reconnect(): Promise<{ url: string }> {
    throw new Error("Custom Gatekeeper has no credentials to reconnect.");
  }

  async getAuthenticatedEmail(): Promise<string | null> {
    return null;
  }

  @skipRpcValidation()
  async getVerifier(): Promise<Fetcher<GatekeeperUserVerifier>> {
    return this.ctx.exports.CustomVerifier({});
  }
}

@validateRpc()
export class CustomVerifier extends WorkerEntrypoint<Cloudflare.Env> implements GatekeeperUserVerifier {
  verify(): void {}
}

@validateRpc()
export class GatekeeperVendor extends WorkerEntrypoint<Cloudflare.Env> {
  async describe(): Promise<VendorDescription> {
    return describeCustomVendor();
  }

  @skipRpcValidation()
  async createAccount(): Promise<Fetcher<GatekeeperUser>> {
    return this.ctx.exports.CustomAccount({});
  }

  connectAccount(
    _callback: Fetcher<GatekeeperConnectCallback>,
    _options?: GatekeeperConnectOptions,
  ): Promise<{ url: string }> {
    throw new Error("Custom Gatekeeper is auto-provisioned and has no connect flow.");
  }

  async getSupportedResources(_options?: { userId?: string }): Promise<SupportedResource[]> {
    return [];
  }

  async getTypeScriptTypes(): Promise<string> {
    return TYPES_CODE;
  }
}
