import { expect, test, type Page } from "@playwright/test";

async function startCampaign(page: Page) {
  await page.goto("/");
  await page.getByTestId("input-nation-name").fill("Guidance Test Crown");
  await page.getByTestId("button-found-nation").click();
  await expect(page.getByTestId("text-current-turn")).toHaveText("1");
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem("openkingdoms-guidance-test-reset")) {
      window.localStorage.clear();
      window.sessionStorage.setItem("openkingdoms-guidance-test-reset", "1");
    }
  });
});

test("teaches inspection, legal borders, and a complete front order", async ({
  page,
}) => {
  await startCampaign(page);

  await expect(page.getByTestId("panel-campaign-primer")).toContainText(
    "Inspect Aurelian Reach",
  );
  await expect(page.getByTestId("panel-campaign-milestones")).toContainText(
    "The road to a kingdom",
  );
  await expect(page.getByTestId("milestone-hold-the-core")).toContainText(
    "1 / 3 held",
  );
  await expect(page.getByTestId("panel-campaign-primer")).toContainText(
    "Build, upgrade, or recruit here",
  );
  await expect(page.getByText("Local economy")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Inspect adjacent province Bracken March" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Inspect adjacent province Bracken March" })
    .click();
  await expect(page.getByTestId("text-selected-region-bracken")).toHaveText(
    "Bracken March",
  );
  await expect(page.getByRole("heading", { name: "Establish a front" })).toBeVisible();
  await expect(page.getByTestId("panel-campaign-primer")).toContainText(
    "Select a neighboring border to choose a player-held source",
  );

  await page.getByTestId("input-front-forces").fill("48");
  await expect(page.getByTestId("panel-front-planner")).toBeVisible();
  await page.getByTestId("button-create-front").click();
  await expect(page.getByTestId("button-select-front-front-aurelian-bracken")).toBeVisible();
  await expect(page.getByTestId("panel-campaign-milestones")).toContainText(
    "Border order recorded",
  );

  await page.getByTestId("button-advance-turn").click();
  await expect(page.getByTestId("text-current-turn")).toHaveText("2");
  await expect(page.getByTestId("panel-turn-summary")).toContainText(
    "arrived at Bracken March",
  );
  await expect(
    page.getByRole("heading", { name: "Bracken March Front" }),
  ).toBeVisible();
  await expect(page.getByTestId("panel-turn-summary")).toContainText(
    "Army movements",
  );

  await page.getByTestId("button-attack-front").click();
  await expect(page.getByTestId("panel-turn-summary")).toContainText(
    "Bracken March held the border",
  );
  await expect(page.getByTestId("panel-turn-summary")).toContainText(
    "Recovery:",
  );

  await expect
    .poll(() =>
      page.evaluate(() => {
        const saved = localStorage.getItem("openkingdoms-campaign");
        return saved ? JSON.parse(saved).lastTurnSummary?.headline : null;
      }),
    )
    .toBe("Bracken March held the border.");
  await page.reload();
  await expect(page.getByTestId("panel-campaign-primer")).toBeVisible();
  await expect(page.getByTestId("panel-campaign-milestones")).toContainText(
    "Border order recorded",
  );
  await expect(page.getByTestId("panel-turn-summary")).toContainText(
    "Recovery:",
  );
});

test("keeps the teaching rail and province controls usable on mobile", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "mobile", "Mobile project only");

  await startCampaign(page);
  await expect(page.getByTestId("panel-campaign-primer")).toBeVisible();
  await expect(page.getByTestId("panel-campaign-milestones")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Inspect adjacent province Bracken March" }),
  ).toBeVisible();
  await page.getByTestId("button-select-region-saltmere").click();
  await expect(page.getByTestId("text-selected-region-saltmere")).toHaveText(
    "Saltmere Coast",
  );
});