import { expect, test, type Page } from "@playwright/test";

async function startCampaign(page: Page) {
  await page.goto("/");
  await page.getByTestId("input-nation-name").fill("Events Test Crown");
  await page.getByTestId("button-found-nation").click();
  await expect(page.getByTestId("text-current-turn")).toHaveText("1");
}

async function resolveFirstEventChoice(page: Page) {
  const eventPanel = page.getByTestId("panel-campaign-event");
  await expect(eventPanel).toBeVisible();
  await eventPanel.getByRole("button").first().click();
  await expect(eventPanel).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem("openkingdoms-events-test-reset")) {
      window.localStorage.clear();
      window.sessionStorage.setItem("openkingdoms-events-test-reset", "1");
    }
  });
});

test("surfaces a peaceful border event, blocks the next turn, and persists the response", async ({
  page,
}) => {
  await startCampaign(page);

  await page.getByTestId("button-advance-turn").click();
  await expect(page.getByTestId("text-current-turn")).toHaveText("2");
  await expect(page.getByTestId("panel-campaign-event")).toContainText(
    "Bracken March raises its watchfires",
  );
  await expect(page.getByTestId("panel-campaign-event")).toContainText(
    "How should the crown answer",
  );
  await expect(page.getByTestId("button-advance-turn")).toBeDisabled();

  await page.getByTestId("button-event-choice-border-scouts").click();
  await expect(page.getByTestId("status-feedback")).toContainText(
    "Learn the border’s weakness",
  );
  await expect(page.getByTestId("panel-turn-summary")).toContainText(
    "Event choice: Bracken March raises its watchfires",
  );
  await expect(page.getByTestId("button-advance-turn")).toBeEnabled();

  await page.reload();
  await expect(page.getByTestId("panel-campaign-event")).toHaveCount(0);
  await expect(page.getByTestId("panel-turn-summary")).toContainText(
    "Event choice: Bracken March raises its watchfires",
  );
  await expect(page.getByTestId("text-dispatch-0")).toContainText(
    "scouts mapped the watchfires",
  );
});

test("cycles through authored event categories without requiring combat", async ({
  page,
}) => {
  await startCampaign(page);

  const expectedTitles = [
    "Bracken March raises its watchfires",
    "Wayfinders arrive from Saltmere Coast",
    "The harvest reaches Aurelian Reach",
  ];

  for (const title of expectedTitles) {
    await page.getByTestId("button-advance-turn").click();
    await expect(page.getByTestId("panel-campaign-event")).toContainText(title);
    await resolveFirstEventChoice(page);
  }

  await expect(page.getByTestId("text-current-turn")).toHaveText("4");
  await expect(page.getByTestId("text-dispatch-0")).toContainText(
    "harvest reaches Aurelian Reach",
  );
  await expect(page.getByTestId("button-attack-front")).toHaveCount(0);
});

test("applies a settlement event choice to treasury and reputation", async ({
  page,
}) => {
  await startCampaign(page);

  await page.evaluate(() => {
    const raw = window.localStorage.getItem("openkingdoms-campaign");
    if (!raw) throw new Error("Expected a campaign save.");
    const campaign = JSON.parse(raw);
    campaign.turn = 7;
    window.localStorage.setItem("openkingdoms-campaign", JSON.stringify(campaign));
  });
  await page.reload();

  await page.getByTestId("button-advance-turn").click();
  await expect(page.getByTestId("panel-campaign-event")).toContainText(
    "A new season in Aurelian Reach",
  );
  await page.getByTestId("button-event-choice-settlement-fair").click();

  await expect(page.getByTestId("value-gold")).toHaveText("159");
  await expect(page.getByTestId("status-feedback")).toContainText(
    "Spend 10 gold and gain 3 reputation",
  );
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem("openkingdoms-campaign");
        return raw ? JSON.parse(raw).reputation : null;
      }),
    )
    .toBe(53);
  await expect(page.getByTestId("panel-turn-summary")).toContainText(
    "Event choice: A new season in Aurelian Reach",
  );
});