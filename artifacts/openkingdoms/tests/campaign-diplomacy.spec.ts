import { expect, test, type Page } from "@playwright/test";

type TreatyKind =
  | "trade"
  | "non-aggression"
  | "defensive-alliance"
  | "military-aid"
  | "peace";

type TreatyScenario = {
  kind: TreatyKind;
  label: string;
  relationship: "friendly" | "trading" | "allied" | "war";
  buttonTestId: string;
  refusal?: string;
};

const TREATY_SCENARIOS: TreatyScenario[] = [
  {
    kind: "trade",
    label: "Trade agreement",
    relationship: "trading",
    buttonTestId: "button-propose-trade",
  },
  {
    kind: "non-aggression",
    label: "Non-aggression pact",
    relationship: "friendly",
    buttonTestId: "button-propose-nap",
  },
  {
    kind: "defensive-alliance",
    label: "Defensive alliance",
    relationship: "friendly",
    buttonTestId: "button-propose-alliance",
  },
  {
    kind: "military-aid",
    label: "Military aid charter",
    relationship: "allied",
    buttonTestId: "button-request-military-aid",
  },
  {
    kind: "peace",
    label: "Peace terms",
    relationship: "war",
    buttonTestId: "button-offer-peace",
    refusal:
      "Bracken March refused the proposal; its peace terms is already active.",
  },
];

async function startDiplomacyCampaign(page: Page) {
  await page.goto("/");
  await page.getByTestId("input-nation-name").fill("Diplomacy Test Crown");
  await page.getByTestId("button-pack-preset-all").click();
  await page.getByTestId("button-found-nation").click();
  await expect(page.getByTestId("text-current-turn")).toHaveText("1");
  await expect(
    page.getByRole("heading", { name: "Diplomacy", exact: true }),
  ).toBeVisible();
}

async function selectRegion(page: Page, regionId: string) {
  const regionNames: Record<string, string> = {
    bracken: "Bracken",
    saltmere: "Saltmere",
  };
  await page.getByTestId("input-region-search").fill(regionNames[regionId] ?? regionId);
  await page.getByTestId(`button-select-region-${regionId}`).click();
}

async function expectCourtReply(page: Page, message: string) {
  await expect(page.getByTestId("status-feedback")).toHaveText(message);
  await expect(page.getByTestId("text-dispatch-0")).toHaveText(message);
  await expect(
    page.locator('[data-testid^="text-dispatch-"]').filter({ hasText: message }),
  ).toHaveCount(1);
}

async function expectPersistedReply(page: Page, message: string) {
  await expect(page.locator('[data-testid^="text-dispatch-"]').filter({ hasText: message })).toHaveCount(1);
}

async function seedActiveTreaty(
  page: Page,
  scenario: TreatyScenario,
  duration = 6,
) {
  await page.evaluate(
    ({ kind, relationship, duration: treatyDuration }) => {
      const raw = window.localStorage.getItem("openkingdoms-campaign");
      if (!raw) throw new Error("Expected a campaign save before seeding diplomacy.");
      const campaign = JSON.parse(raw);
      campaign.relationships = {
        ...campaign.relationships,
        bracken: relationship,
      };
      campaign.diplomacy = {
        ...campaign.diplomacy,
        influence: 100,
        envoyCooldowns: {},
      };
      campaign.embargoes = [];
      campaign.treaties = [
        {
          id: `fixture-${kind}`,
          partnerRegionId: "bracken",
          kind,
          startedTurn: campaign.turn,
          duration: treatyDuration,
        },
      ];
      campaign.log = ["The fixture chronicle begins."];
      window.localStorage.setItem(
        "openkingdoms-campaign",
        JSON.stringify(campaign),
      );
    },
    {
      kind: scenario.kind,
      relationship: scenario.relationship,
      duration,
    },
  );
  await page.reload();
  await expect(page.getByTestId("text-current-turn")).toHaveText("1");
  await selectRegion(page, "bracken");
}

async function seedFriendlyPartner(page: Page) {
  await page.evaluate(() => {
    const raw = window.localStorage.getItem("openkingdoms-campaign");
    if (!raw) throw new Error("Expected a campaign save before seeding diplomacy.");
    const campaign = JSON.parse(raw);
    campaign.relationships = {
      ...campaign.relationships,
      bracken: "friendly",
    };
    campaign.diplomacy = {
      ...campaign.diplomacy,
      influence: 100,
      envoyCooldowns: {},
    };
    campaign.treaties = [];
    campaign.embargoes = [];
    campaign.log = ["The fixture chronicle begins."];
    window.localStorage.setItem(
      "openkingdoms-campaign",
      JSON.stringify(campaign),
    );
  });
  await page.reload();
  await expect(page.getByTestId("text-current-turn")).toHaveText("1");
  await selectRegion(page, "bracken");
}

async function readTreatyCounts(page: Page) {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem("openkingdoms-campaign");
    if (!raw) throw new Error("Expected a campaign save.");
    const campaign = JSON.parse(raw);
    return campaign.treaties.reduce(
      (counts: Record<string, number>, treaty: { kind: string }) => ({
        ...counts,
        [treaty.kind]: (counts[treaty.kind] ?? 0) + 1,
      }),
      {},
    );
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
});

test("records accepted and embargo-refused envoys once and preserves both replies after refresh", async ({
  page,
}) => {
  await startDiplomacyCampaign(page);

  await selectRegion(page, "saltmere");
  await page.getByTestId("button-send-envoy").click();
  const acceptedReply =
    "Saltmere Coast accepted the envoy and offered a warmer diplomatic channel.";
  await expectCourtReply(page, acceptedReply);

  await selectRegion(page, "bracken");
  await page.getByTestId("button-toggle-embargo").click();
  await expect(page.getByTestId("status-feedback")).toHaveText(
    "Trade with Bracken March is embargoed.",
  );
  await page.getByTestId("button-send-envoy").click();
  const refusedReply =
    "Bracken March refused the envoy; the embargo has closed its court to your seal.";
  await expectCourtReply(page, refusedReply);

  await page.reload();
  await expectPersistedReply(page, acceptedReply);
  await expectPersistedReply(page, refusedReply);
});

test("accepts every treaty in sequence without duplicate court replies or treaties", async ({
  page,
}) => {
  await startDiplomacyCampaign(page);
  await seedFriendlyPartner(page);

  const acceptedTreaties: Array<{
    kind: TreatyKind;
    buttonTestId: string;
    label: string;
    reply: string;
  }> = [
    {
      kind: "trade",
      buttonTestId: "button-propose-trade",
      label: "Trade agreement",
      reply:
        "Bracken March accepted your trade agreement proposal and sealed the terms.",
    },
    {
      kind: "non-aggression",
      buttonTestId: "button-propose-nap",
      label: "Non-aggression pact",
      reply:
        "Bracken March accepted your non-aggression pact proposal and sealed the terms.",
    },
    {
      kind: "defensive-alliance",
      buttonTestId: "button-propose-alliance",
      label: "Defensive alliance",
      reply:
        "Bracken March accepted your defensive alliance proposal and sealed the terms.",
    },
    {
      kind: "military-aid",
      buttonTestId: "button-request-military-aid",
      label: "Military aid charter",
      reply:
        "Bracken March accepted your military aid charter proposal and sealed the terms.",
    },
  ];

  for (const treaty of acceptedTreaties) {
    await page.getByTestId(treaty.buttonTestId).click();
    await expectCourtReply(page, treaty.reply);
    await expect(page.getByTestId(`treaty-${treaty.kind}`)).toHaveCount(1);
  }

  const counts = await readTreatyCounts(page);
  expect(counts).toEqual({
    trade: 1,
    "non-aggression": 1,
    "defensive-alliance": 1,
    "military-aid": 1,
  });

  await page.reload();
  for (const treaty of acceptedTreaties) {
    await expectPersistedReply(page, treaty.reply);
  }
  expect(await readTreatyCounts(page)).toEqual(counts);
});

for (const scenario of TREATY_SCENARIOS) {
  test(`does not duplicate an active ${scenario.label.toLowerCase()}`, async ({
    page,
  }) => {
    await startDiplomacyCampaign(page);
    await seedActiveTreaty(page, scenario);

    await expect(page.getByTestId(`treaty-${scenario.kind}`)).toHaveCount(1);
    const proposal = page.getByTestId(scenario.buttonTestId);

    if (scenario.refusal) {
      await expect(proposal).toBeEnabled();
      await proposal.click();
      await expectCourtReply(page, scenario.refusal);
    } else {
      await expect(proposal).toBeDisabled();
    }

    await page.reload();
    await selectRegion(page, "bracken");
    await expect(page.getByTestId(`treaty-${scenario.kind}`)).toHaveCount(1);
    expect(await readTreatyCounts(page)).toEqual({ [scenario.kind]: 1 });
    if (scenario.refusal) {
      await expectPersistedReply(page, scenario.refusal);
    }
  });
}

for (const scenario of TREATY_SCENARIOS) {
  test(`reopens a ${scenario.label.toLowerCase()} proposal after its obligation expires`, async ({
    page,
  }) => {
    await startDiplomacyCampaign(page);
    await seedActiveTreaty(page, scenario, 1);

    await expect(page.getByTestId(`treaty-${scenario.kind}`)).toHaveCount(1);
    await page.getByTestId("button-advance-turn").click();
    await expect(page.getByTestId("text-current-turn")).toHaveText("2");
    await expect(page.getByTestId(`treaty-${scenario.kind}`)).toHaveCount(0);
    await expect(page.getByTestId(scenario.buttonTestId)).toBeEnabled();

  });
}