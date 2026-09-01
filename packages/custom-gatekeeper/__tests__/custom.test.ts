import { describe, expect, it } from "vitest";
import {
  CustomSessionImpl,
  describeCustomAccount,
  describeCustomVendor,
} from "../src/custom.js";
import { PINNED_CORE_SHA, SKILLS } from "../src/company-os.js";

function sessionWithQueue() {
  const observations: unknown[] = [];
  const session = new CustomSessionImpl(
    {
      authorizeObservation(value: unknown) {
        observations.push(value);
        return Promise.resolve();
      },
      [Symbol.dispose]() {},
    },
    { name: "Brenda OS", message: "Personal Cloudflare OS deployment for brendadeeznuts1111." },
  );
  return { session, observations };
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
});
