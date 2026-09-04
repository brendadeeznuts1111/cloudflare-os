import { describe, expect, it } from "vitest";
import { boundAgentCatalog } from "@gadgets/workshop-shared/gatekeeper";
import {
  CustomSessionImpl,
  CustomSlashCommandProvider,
  describeCustomAccount,
  describeCustomVendor,
  invokeCompanySkillCommand,
} from "../src/custom.js";
import {
  ESTATE,
  GLOSSARY,
  PINNED_CORE_SHA,
  SKILLS,
  buildCompanyCatalogEntries,
} from "../src/company-os.js";
import { MemoryNoteStorage, NoteLedger } from "../src/notes.js";

function sessionWithQueue(options?: { submitError?: Error }) {
  const observations: unknown[] = [];
  const submitted: Array<{ action: number; description: unknown }> = [];
  const ledger = new NoteLedger(new MemoryNoteStorage());
  const session = new CustomSessionImpl(
    {
      authorizeObservation(value: unknown) {
        observations.push(value);
        return Promise.resolve();
      },
      submitAction(action: number, description: unknown) {
        if (options?.submitError) {
          return Promise.reject(options.submitError);
        }
        submitted.push({ action, description });
        return Promise.resolve();
      },
      [Symbol.dispose]() {},
    },
    { name: "Brenda OS", message: "Personal Cloudflare OS deployment for brendadeeznuts1111." },
    ledger,
  );
  return { session, observations, submitted, ledger };
}

describe("custom-gatekeeper", () => {
  it("describes an auto-provisioned singleton", () => {
    expect(describeCustomVendor()).toMatchObject({
      displayName: "Brenda OS",
      url: "https://github.com/brendadeeznuts1111/cloudflare-os",
      autoProvisionsAccount: true,
      providesAuth: false,
    });
    expect(describeCustomAccount()).toMatchObject({
      displayName: "Brenda OS",
      singleton: { tsType: "CustomSession" },
    });
  });

  it("authorizes the observation before returning deployment information", async () => {
    const { session, observations } = sessionWithQueue();

    await expect(session.getDeploymentInfo()).resolves.toEqual({
      name: "Brenda OS",
      message: "Personal Cloudflare OS deployment for brendadeeznuts1111.",
    });
    expect(observations[0]).toEqual({
      title: "Read deployment information",
      description: "Read the custom information configured by this deployment.",
    });
  });

  it("returns topology with pinned core and brenda-os Worker names", async () => {
    const { session, observations } = sessionWithQueue();
    const topology = await session.getTopology();

    expect(topology.pinnedCoreSha).toBe(PINNED_CORE_SHA);
    expect(topology.route).toBe("workers.dev");
    expect(topology.workers.map((worker) => worker.workerName)).toEqual([
      "brenda-os-router",
      "brenda-os-workshop",
      "brenda-os-context",
      "brenda-os-scheduler",
      "brenda-os-custom-gk",
      "brenda-os-errors",
    ]);
    expect(topology.deployBlockers.length).toBeGreaterThan(0);
    expect(observations[0]).toMatchObject({ title: "Read Brenda OS topology" });
  });

  it("lists official docs and company skills after observations", async () => {
    const { session, observations } = sessionWithQueue();

    const docs = await session.listOfficialDocs();
    expect(docs.some((doc) => doc.url === "https://blog.cloudflare.com/cloudflare-os/")).toBe(true);

    const skills = await session.listSkills();
    expect(skills.map((skill) => skill.id)).toEqual(SKILLS.map((skill) => skill.id));

    const local = await session.getSkill("run-local");
    expect(local?.steps[0]).toContain("git submodule update --init");
    expect(await session.getSkill("does-not-exist")).toBeNull();

    expect(observations.map((item) => (item as { title: string }).title)).toEqual([
      "Read official documentation map",
      "List company skills",
      "Read company skill",
      "Read company skill",
    ]);
  });

  it("lists glossary and estate after observations", async () => {
    const { session, observations } = sessionWithQueue();

    const glossary = await session.listGlossary();
    expect(glossary.map((entry) => entry.term)).toEqual(GLOSSARY.map((entry) => entry.term));
    expect(await session.getGlossaryEntry("gatekeeper")).toMatchObject({ term: "Gatekeeper" });
    expect(await session.getGlossaryEntry("missing")).toBeNull();

    const estate = await session.listEstate();
    expect(estate.map((worker) => worker.name)).toEqual(ESTATE.map((worker) => worker.name));
    expect(estate.some((worker) => "accountId" in worker)).toBe(false);
    expect(await session.getEstateWorker("tennis-hq")).toMatchObject({ role: "app" });
    expect(await session.getEstateWorker("unknown")).toBeNull();

    expect(observations.map((item) => (item as { title: string }).title)).toEqual([
      "List Brenda OS glossary",
      "Read glossary entry",
      "Read glossary entry",
      "List existing Worker estate",
      "Read estate Worker",
      "Read estate Worker",
    ]);
  });

  it("simulates a filed note so later reads look applied", async () => {
    const { session, submitted, ledger, observations } = sessionWithQueue();

    const note = await session.fileOperatorNote("Pin core", "Keep SHA 6478a144.");
    expect(note.title).toBe("Pin core");
    expect(note.body).toBe("Keep SHA 6478a144.");
    expect(note.id.startsWith("note-")).toBe(true);
    expect(submitted).toHaveLength(1);
    expect(submitted[0]?.action).toBe(1);
    expect(submitted[0]?.description).toMatchObject({
      title: "File operator note: Pin core",
      description: "Keep SHA 6478a144.",
      implementsRevert: true,
    });

    const listed = await session.listOperatorNotes();
    expect(listed).toEqual([note]);
    expect(listed[0] && "status" in listed[0]).toBe(false);
    expect(listed[0] && "actionId" in listed[0]).toBe(false);
    expect(await session.getOperatorNote(note.id)).toEqual(note);

    const dump = await ledger.debugDump();
    expect(dump).toEqual([
      { actionId: 1, note, status: "pending" },
    ]);

    await ledger.apply(1);
    expect(await session.listOperatorNotes()).toEqual([note]);
    expect((await ledger.debugDump())[0]?.status).toBe("applied");

    await ledger.revert(1);
    expect(await session.listOperatorNotes()).toEqual([]);
    expect(await session.getOperatorNote(note.id)).toBeNull();

    expect(observations.map((item) => (item as { title: string }).title)).toEqual([
      "List operator notes",
      "Read operator note",
      "List operator notes",
      "List operator notes",
      "Read operator note",
    ]);
  });

  it("drops a simulated note when submitAction fails or the write is rejected", async () => {
    const failing = sessionWithQueue({ submitError: new Error("queue unavailable") });
    await expect(failing.session.fileOperatorNote("Nope", "Should not stick.")).rejects.toThrow(
      "queue unavailable",
    );
    expect(await failing.session.listOperatorNotes()).toEqual([]);

    const { session, ledger } = sessionWithQueue();
    const note = await session.fileOperatorNote("Draft", "Reject me.");
    await ledger.reject(1);
    expect(await session.listOperatorNotes()).toEqual([]);
    expect(await session.getOperatorNote(note.id)).toBeNull();
  });

  it("rejects empty note titles and bodies", async () => {
    const { session, submitted } = sessionWithQueue();
    await expect(session.fileOperatorNote("  ", "body")).rejects.toThrow("title is required");
    await expect(session.fileOperatorNote("title", "   ")).rejects.toThrow("body is required");
    expect(submitted).toEqual([]);
  });

  it("builds a clamped company catalog with skills first", () => {
    const entries = buildCompanyCatalogEntries();
    expect(entries[0]).toMatchObject({ id: "skill:run-local" });
    expect(entries.some((entry) => entry.id === "glossary:Gatekeeper")).toBe(true);
    expect(entries.some((entry) => entry.id === "estate:tennis-hq")).toBe(true);

    const catalog = boundAgentCatalog(entries);
    expect(catalog.truncated).toBe(false);
    expect(catalog.entries.length).toBe(entries.length);
  });

  it("expands slash commands after an observation", async () => {
    const provider = new CustomSlashCommandProvider();
    const commands = await provider.list();
    expect(commands.map((command) => command.id)).toEqual(SKILLS.map((skill) => skill.id));

    const observations: unknown[] = [];
    const result = await invokeCompanySkillCommand("run-local", "after install", {
      authorizeObservation(value: unknown) {
        observations.push(value);
        return Promise.resolve();
      },
    });

    expect(result.skillName).toBe("Run Brenda OS locally");
    expect(result.message).toContain("pnpm --dir cloudflare-os run-local");
    expect(result.message).toContain("Arguments: after install");
    expect(observations[0]).toMatchObject({ title: "Expand /run-local" });
    await expect(
      invokeCompanySkillCommand("missing", "", {
        authorizeObservation() {
          return Promise.resolve();
        },
      }),
    ).rejects.toThrow("Unknown company skill command");
  });
});
