import {
  DurableObject,
  RpcStub,
  RpcTarget,
  WorkerEntrypoint,
} from "cloudflare:workers";
import { skipRpcValidation, validateRpc } from "capnweb-validate";
import type {
  AccountDescription,
  ActionDescription,
  AgentCatalog,
  ApprovalQueue,
  Gatekeeper,
  GatekeeperConnectCallback,
  GatekeeperConnectOptions,
  GatekeeperUser,
  GatekeeperUserVerifier,
  ObservationAuthorizer,
  ResourceConfiguratorFrame,
  ResourceDescription,
  SlashCommandDescriptor,
  SlashCommandProvider,
  SlashCommandResult,
  SupportedResource,
  VendorDescription,
} from "@gadgets/workshop-shared/gatekeeper";
import { boundAgentCatalog } from "@gadgets/workshop-shared/gatekeeper";
import type {
  CompanySkill,
  CustomDeploymentInfo,
  CustomSession,
  DeploymentTopology,
  EstateWorker,
  GlossaryEntry,
  OfficialDoc,
  OperatorNote,
} from "./types.js";
import TYPES_CODE from "./types-code.js";
import {
  DEPLOY_BLOCKERS,
  OFFICIAL_DOCS,
  PINNED_CORE_SHA,
  SKILLS,
  WORKERS,
  buildCompanyCatalogEntries,
  getEstateWorker,
  getGlossaryEntry,
  getSkillById,
  listEstateWorkers,
  listGlossaryEntries,
  listSkillSummaries,
} from "./company-os.js";
import {
  NoteLedger,
  newOperatorNote,
  storageFromDurableObjectState,
} from "./notes.js";

const CUSTOM_ICON = {
  url:
    "data:image/svg+xml," +
    encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' fill='none' stroke='currentColor' stroke-width='20'><path d='M52 72h152v112H52z'/><path d='m52 88 76 52 76-52'/></svg>",
    ),
};

type SessionQueue = Pick<ApprovalQueue, "authorizeObservation" | "submitAction"> &
  Partial<{ [Symbol.dispose](): void }>;

export function describeCustomVendor(): VendorDescription {
  return {
    displayName: "Brenda OS",
    url: "https://github.com/brendadeeznuts1111/cloudflare-os",
    logo: CUSTOM_ICON,
    color: "#e8f2ff",
    tagline: "Personal Cloudflare OS deployment",
    description:
      "Company-context Gatekeeper for the brendadeeznuts1111 Cloudflare OS instance. Topology, glossary, estate inventory, and operator notes.",
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
  readonly #approvalQueue: SessionQueue;
  readonly #info: CustomDeploymentInfo;
  readonly #ledger: NoteLedger;

  constructor(approvalQueue: SessionQueue, info: CustomDeploymentInfo, ledger: NoteLedger) {
    super();
    this.#approvalQueue = approvalQueue;
    this.#info = info;
    this.#ledger = ledger;
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

  async listGlossary(): Promise<GlossaryEntry[]> {
    await this.#approvalQueue.authorizeObservation({
      title: "List Brenda OS glossary",
      description: "Read curated Cloudflare OS terms for this deployment.",
    });
    return listGlossaryEntries();
  }

  async getGlossaryEntry(term: string): Promise<GlossaryEntry | null> {
    await this.#approvalQueue.authorizeObservation({
      title: "Read glossary entry",
      description: `Read the glossary entry "${term}".`,
    });
    const entry = getGlossaryEntry(term);
    return entry ? { ...entry } : null;
  }

  async listEstate(): Promise<EstateWorker[]> {
    await this.#approvalQueue.authorizeObservation({
      title: "List existing Worker estate",
      description: "Read names and roles of Workers this operator already runs.",
    });
    return listEstateWorkers();
  }

  async getEstateWorker(name: string): Promise<EstateWorker | null> {
    await this.#approvalQueue.authorizeObservation({
      title: "Read estate Worker",
      description: `Read the estate inventory entry "${name}".`,
    });
    const worker = getEstateWorker(name);
    return worker ? { ...worker } : null;
  }

  async fileOperatorNote(title: string, body: string): Promise<OperatorNote> {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle) {
      throw new Error("Operator note title is required.");
    }
    if (!trimmedBody) {
      throw new Error("Operator note body is required.");
    }

    const actionId = await this.#ledger.nextActionId();
    const note = newOperatorNote(trimmedTitle, trimmedBody);
    await this.#ledger.queuePending(actionId, note);

    const description: ActionDescription = {
      title: `File operator note: ${trimmedTitle}`,
      description: trimmedBody,
      implementsRevert: true,
    };

    try {
      await this.#approvalQueue.submitAction(actionId, description);
    } catch (error) {
      await this.#ledger.reject(actionId);
      throw error;
    }

    return { ...note };
  }

  async listOperatorNotes(): Promise<OperatorNote[]> {
    await this.#approvalQueue.authorizeObservation({
      title: "List operator notes",
      description: "Read operator notes filed through this Gatekeeper.",
    });
    return this.#ledger.list();
  }

  async getOperatorNote(id: string): Promise<OperatorNote | null> {
    await this.#approvalQueue.authorizeObservation({
      title: "Read operator note",
      description: `Read the operator note "${id}".`,
    });
    return this.#ledger.get(id);
  }

  [Symbol.dispose](): void {
    this.#approvalQueue[Symbol.dispose]?.();
  }
}

export async function invokeCompanySkillCommand(
  id: string,
  args: string,
  authorizer: Pick<ObservationAuthorizer, "authorizeObservation">,
): Promise<SlashCommandResult> {
  const skill = getSkillById(id);
  if (!skill) {
    throw new Error(`Unknown company skill command: ${id}`);
  }
  await authorizer.authorizeObservation({
    title: `Expand /${skill.id}`,
    description: `Read the operating skill "${skill.id}".`,
  });
  const steps = skill.steps.join("\n");
  const trimmed = args.trim();
  return {
    skillName: skill.title,
    message: trimmed ? `${steps}\n\nArguments: ${trimmed}` : steps,
  };
}

@validateRpc()
export class CustomSlashCommandProvider extends RpcTarget implements SlashCommandProvider {
  list(): Promise<SlashCommandDescriptor[]> {
    return Promise.resolve(
      SKILLS.map((skill) => ({
        id: skill.id,
        name: skill.id,
        description: skill.summary,
      })),
    );
  }

  invoke(
    id: string,
    args: string,
    authorizer: RpcStub<ObservationAuthorizer>,
  ): Promise<SlashCommandResult> {
    return invokeCompanySkillCommand(id, args, authorizer);
  }
}

@validateRpc()
export class CustomGatekeeper extends DurableObject<Cloudflare.Env> implements Gatekeeper<CustomSession> {
  #ledger(): NoteLedger {
    return new NoteLedger(storageFromDurableObjectState(this.ctx));
  }

  async describe(): Promise<ResourceDescription> {
    return {
      url: "custom://deployment-info",
      title: "Deployment information",
      snippet:
        "Brenda OS topology, glossary, estate inventory, operator notes, and operating skills.",
      suggestedBindingName: "CUSTOM",
      tsType: "CustomSession",
      hasSlashCommands: true,
    };
  }

  async getTypeScriptTypes(): Promise<string> {
    return TYPES_CODE;
  }

  async getAutoApprovableActions(): Promise<[]> {
    return [];
  }

  async startSession(approvalQueue: RpcStub<ApprovalQueue>): Promise<CustomSession> {
    return new CustomSessionImpl(
      approvalQueue.dup(),
      {
        name: this.env.CUSTOM_NAME,
        message: this.env.CUSTOM_MESSAGE,
      },
      this.#ledger(),
    );
  }

  async getAgentCatalog(authorizer: RpcStub<ObservationAuthorizer>): Promise<AgentCatalog> {
    const entries = buildCompanyCatalogEntries();
    await authorizer.authorizeObservation({
      title: "Company catalog",
      description: `Listed ${entries.length} Brenda OS catalog item(s).`,
    });
    return boundAgentCatalog(entries);
  }

  async getSlashCommandProvider(): Promise<CustomSlashCommandProvider> {
    return new CustomSlashCommandProvider();
  }

  async addObserver(_id: string, _user: Fetcher<GatekeeperUserVerifier>): Promise<void> {}
  async removeObserver(_id: string): Promise<void> {}

  async applyAction(action: number): Promise<void> {
    await this.#ledger().apply(action);
  }

  async rejectAction(action: number): Promise<void> {
    await this.#ledger().reject(action);
  }

  async revertAction(action: number): Promise<void> {
    await this.#ledger().revert(action);
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
