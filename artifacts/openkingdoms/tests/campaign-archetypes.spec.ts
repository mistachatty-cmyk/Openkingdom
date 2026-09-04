import { expect, test, type Page } from "@playwright/test";

async function startWith(page: Page, archetype = "ironbound", emblem = "star") {
  await page.goto("/");
  await page.getByTestId(`button-archetype-${archetype}`).click();
  await page.getByTestId(`button-emblem-${emblem}`).click();
  await page.getByTestId("input-nation-name").fill("Archetype Test Crown");
  await page.getByTestId("button-found-nation").click();
  await expect(page.getByTestId("text-current-turn")).toHaveText("1");
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem("openkingdoms-archetype-test-reset")) {
      window.localStorage.clear();
      window.sessionStorage.setItem("openkingdoms-archetype-test-reset", "1");
    }
  });
});

test("choosing an archetype and emblem changes the preview, campaign identity, and starting strengths", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByTestId("founding-preview-canvas")).toBeVisible();
  await page.getByTestId("button-archetype-ironbound").click();
  await page.getByTestId("button-emblem-star").click();

  await expect(page.getByTestId("founding-archetype-summary")).toContainText(
    "Ironbound March",
  );
  await expect(page.getByTestId("founding-archetype-summary")).toContainText(
    "+12 starting soldiers",
  );
  await expect(page.getByTestId("founding-preview")).toHaveAttribute(
    "aria-label",
    /Ironbound March.*North star/,
  );
  await expect(page.getByTestId("button-archetype-ironbound")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("button-emblem-star")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByTestId("input-nation-name").fill("Iron Crown");
  await page.getByTestId("button-found-nation").click();

  await expect(page.getByTestId("campaign-identity")).toContainText(
    "Ironbound March",
  );
  await expect(page.getByTestId("campaign-identity")).toContainText(
    "North star emblem",
  );
  await expect(page.getByTestId("value-forces")).toHaveText("60");
  await expect(page.getByTestId("value-gold")).toHaveText("127");
  await expect(page.getByTestId("button-recruit-forces")).toContainText("+14");

  await page.reload();
  await expect(page.getByTestId("campaign-identity")).toContainText(
    "Ironbound March",
  );
  await expect(page.getByTestId("campaign-identity")).toContainText(
    "North star emblem",
  );
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem("openkingdoms-campaign");
        const saved = raw ? JSON.parse(raw) : null;
        return saved ? [saved.archetypeId, saved.emblemId] : null;
      }),
    )
    .toEqual(["ironbound", "star"]);
});

test("applies the Riverward settlement discount through the existing charter action", async ({
  page,
}) => {
  await startWith(page, "riverward", "wave");

  await expect(page.getByTestId("value-food")).toHaveText("140");
  await expect(page.getByTestId("value-gold")).toHaveText("140");
  await expect(page.getByTestId("button-upgrade-settlement")).toContainText(
    "95 gold",
  );
  await expect(page.getByTestId("campaign-identity")).toContainText(
    "Riverward League",
  );
});

test("migrates an older campaign to neutral archetype and crown emblem", async ({
  page,
}) => {
  await startWith(page, "merchant", "oak");
  await page.evaluate(() => {
    const raw = window.localStorage.getItem("openkingdoms-campaign");
    if (!raw) throw new Error("Expected a campaign save.");
    const saved = JSON.parse(raw);
    delete saved.archetypeId;
    delete saved.emblemId;
    delete saved.featureVersion;
    window.localStorage.setItem("openkingdoms-campaign", JSON.stringify(saved));
  });

  await page.reload();
  await expect(page.getByTestId("campaign-identity")).toContainText(
    "Freeholders",
  );
  await expect(page.getByTestId("campaign-identity")).toContainText(
    "Crown emblem",
  );
  await expect(page.getByTestId("value-forces")).toHaveText("40");
});

test("keeps founding usable with a WebGL fallback", async ({ page }) => {
  await page.addInitScript(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type === "webgl" || type === "webgl2") return null;
      return originalGetContext.call(this, type, ...args as [any]);
    };
  });
  await page.goto("/");

  await expect(page.getByTestId("founding-preview-fallback")).toBeVisible();
  await page.getByTestId("button-archetype-lantern").click();
  await expect(page.getByTestId("founding-archetype-summary")).toContainText(
    "Lantern Court",
  );
  await page.getByTestId("input-nation-name").fill("Fallback Crown");
  await page.getByTestId("button-found-nation").click();
  await expect(page.getByTestId("campaign-identity")).toContainText(
    "Lantern Court",
  );
});

test("keeps the archetype chooser readable at mobile size", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile", "Mobile project only");
  await page.goto("/");

  await expect(page.getByRole("radiogroup", { name: "Nation archetypes" })).toBeVisible();
  await expect(page.getByTestId("founding-preview")).toBeVisible();
  await expect(page.getByTestId("button-archetype-freeholders")).toBeVisible();
  await expect(page.getByTestId("button-emblem-crown")).toBeVisible();
});