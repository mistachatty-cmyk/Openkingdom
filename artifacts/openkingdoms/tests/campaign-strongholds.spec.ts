import { expect, test, type Page } from "@playwright/test";

async function startCampaign(page: Page) {
  await page.goto("/");
  await page.getByTestId("input-nation-name").fill("Stronghold Test Crown");
  await page.getByTestId("button-found-nation").click();
  await expect(page.getByTestId("text-current-turn")).toHaveText("1");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
});

test("offers optional county fortification and persists its first tier", async ({
  page,
}) => {
  await startCampaign(page);

  await expect(page.getByTestId("value-stronghold-aurelian")).toHaveText(
    "No stronghold",
  );
  await expect(page.getByTestId("button-upgrade-stronghold")).toContainText(
    "70 gold",
  );
  await expect(page.getByTestId("stronghold-action-reason")).toContainText(
    "Next tier: Watchpost",
  );

  await page.getByTestId("button-upgrade-stronghold").click();
  await expect(page.getByTestId("value-stronghold-aurelian")).toHaveText(
    "Watchpost",
  );
  await expect(page.getByTestId("value-gold")).toHaveText("75");
  await expect(page.getByTestId("panel-stronghold-aurelian")).toContainText(
    "Defense",
  );
  await expect(page.getByTestId("panel-stronghold-aurelian")).toContainText(
    "+8",
  );
  await expect(page.getByTestId("panel-turn-summary")).toContainText(
    "Aurelian Reach advanced to Watchpost",
  );
  await expect(page.getByTestId("text-dispatch-0")).toContainText(
    "raised a Watchpost",
  );
  await expect(page.getByTestId("button-select-region-aurelian")).toContainText(
    "Stronghold I",
  );
  await expect(page.getByTestId("button-recruit-forces")).toContainText("+12");

  await page.reload();
  await expect(page.getByTestId("value-stronghold-aurelian")).toHaveText(
    "Watchpost",
  );
  await expect(page.getByTestId("panel-turn-summary")).toContainText(
    "Aurelian Reach advanced to Watchpost",
  );
});

test("lets a peaceful player ignore strongholds and keep resolving turns", async ({
  page,
}) => {
  await startCampaign(page);

  await expect(page.getByTestId("button-upgrade-stronghold")).toBeEnabled();
  await page.getByTestId("button-advance-turn").click();
  await expect(page.getByTestId("text-current-turn")).toHaveText("2");
  if (await page.getByTestId("panel-campaign-event").isVisible()) {
    await page.locator('[data-testid^="button-event-choice-"]').first().click();
  }
  await expect(page.getByTestId("value-stronghold-aurelian")).toHaveText(
    "No stronghold",
  );
  await expect(page.getByTestId("button-advance-turn")).toBeEnabled();
});

test("explains the full progression and locks a county at Citadel", async ({
  page,
}) => {
  await startCampaign(page);
  await page.evaluate(() => {
    const raw = window.localStorage.getItem("openkingdoms-campaign");
    if (!raw) throw new Error("Expected a campaign save.");
    const campaign = JSON.parse(raw);
    campaign.gold = 500;
    window.localStorage.setItem("openkingdoms-campaign", JSON.stringify(campaign));
  });
  await page.reload();

  await page.getByTestId("button-upgrade-stronghold").click();
  await expect(page.getByTestId("value-stronghold-aurelian")).toHaveText(
    "Watchpost",
  );
  await page.getByTestId("button-upgrade-stronghold").click();
  await expect(page.getByTestId("value-stronghold-aurelian")).toHaveText(
    "Bastion",
  );
  await page.getByTestId("button-upgrade-stronghold").click();
  await expect(page.getByTestId("value-stronghold-aurelian")).toHaveText(
    "Citadel",
  );
  await expect(page.getByTestId("button-upgrade-stronghold")).toBeDisabled();
  await expect(page.getByTestId("stronghold-action-reason")).toContainText(
    "maximum stronghold level",
  );
  await expect(page.getByTestId("panel-turn-summary")).toContainText(
    "advanced to Citadel",
  );
});

test("includes a target county stronghold in front strength and combat resolution", async ({
  page,
}) => {
  await startCampaign(page);
  await page.evaluate(() => {
    const raw = window.localStorage.getItem("openkingdoms-campaign");
    if (!raw) throw new Error("Expected a campaign save.");
    const campaign = JSON.parse(raw);
    campaign.regions = campaign.regions.map((region: { id: string; strongholdLevel?: number; forces: number }) =>
      region.id === "bracken"
        ? { ...region, strongholdLevel: 2, forces: 62 }
        : region.id === "aurelian"
          ? { ...region, forces: 0 }
          : region,
    );
    campaign.forces = 70;
    campaign.fronts = [
      {
        id: "fixture-front-aurelian-bracken",
        name: "Bracken Front",
        sourceRegionId: "aurelian",
        targetRegionId: "bracken",
        committedForces: 70,
        travelTurns: 0,
        status: "arrived",
      },
    ];
    campaign.log = ["The fortification fixture begins."];
    window.localStorage.setItem("openkingdoms-campaign", JSON.stringify(campaign));
  });
  await page.reload();
  await page.getByTestId("input-region-search").fill("Bracken");
  await page.getByTestId("button-select-region-bracken").click();

  await expect(page.getByTestId("panel-front-dossier")).toContainText(
    "County stronghold",
  );
  await expect(page.getByTestId("panel-front-dossier")).toContainText(
    "+18 defense",
  );
  await expect(page.getByTestId("panel-front-dossier")).toContainText(
    "Defender strength",
  );
  await page.getByTestId("button-attack-front").click();
  await expect(page.getByTestId("panel-turn-summary")).toContainText(
    "Bastion added +18 defense",
  );
  await expect(page.getByTestId("status-feedback")).toContainText(
    "held the line",
  );
});
