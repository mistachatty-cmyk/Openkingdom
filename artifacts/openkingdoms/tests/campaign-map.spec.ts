import { expect, test, type Locator, type Page } from "@playwright/test";

const MAP_WIDTH = 760;
const MAP_HEIGHT = 390;

async function startCampaign(page: Page) {
  await page.goto("/");
  await page.getByTestId("input-nation-name").fill("Map Test Crown");
  await page.getByTestId("button-found-nation").click();
  await expect(page.getByTestId("text-current-turn")).toHaveText("1");
}

async function clickCanvasPoint(
  canvas: Locator,
  screenPoint: { x: number; y: number },
) {
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await canvas.click({
    position: {
      x: (screenPoint.x / MAP_WIDTH) * box!.width,
      y: (screenPoint.y / MAP_HEIGHT) * box!.height,
    },
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

test("keeps zoom, keyboard pan, reset, and pointer hit testing synchronized", async ({
  page,
}) => {
  await startCampaign(page);

  const canvas = page.getByTestId("canvas-campaign-map");
  const viewStatus = page.getByTestId("status-map-view");

  await expect(canvas).toBeVisible();
  await expect(viewStatus).toHaveText(
    "Realm board view at 54 percent zoom. Select a province, then drag to pan or use arrow keys to move.",
  );

  await page.getByTestId("button-map-zoom-in").click();
  await expect(page.getByText("79%")).toBeVisible();
  await expect(viewStatus).toHaveText("Map zoom set to 79 percent.");

  await canvas.focus();
  await canvas.press("ArrowRight");
  await expect(viewStatus).toHaveText(
    "Map panned right. Use the arrow keys to continue moving.",
  );
  await expect(canvas).toHaveAttribute("data-map-scale", "0.79");
  await canvas.press("ArrowDown");
  await expect(viewStatus).toHaveText(
    "Map panned down. Use the arrow keys to continue moving.",
  );
  await expect(canvas).toHaveAttribute("data-map-y", "-598.9240506329114");

  // Ironwood's authored label is at (1163, 697). At 79% zoom, the two
  // keyboard pans move that point to the transformed screen position. A stale
  // untransformed hit-test would not select Ironwood here.
  const mapView = await canvas.evaluate((element) => ({
    scale: Number(element.getAttribute("data-map-scale")),
    x: Number(element.getAttribute("data-map-x")),
    y: Number(element.getAttribute("data-map-y")),
  }));
  await clickCanvasPoint(canvas, {
    x: (1163 + mapView.x) * mapView.scale,
    y: (697 + mapView.y) * mapView.scale,
  });
  await expect(page.getByTestId("text-selected-region-ironwood")).toHaveText(
    "Ironwood",
  );

  await page.getByTestId("button-map-zoom-out").click();
  await expect(page.getByText("54%")).toBeVisible();
  await page.getByTestId("button-map-zoom-in").click();
  await page.getByTestId("button-map-reset-view").click();
  await expect(page.getByText("54%")).toBeVisible();
  await expect(viewStatus).toHaveText(
    "Realm board reset to its starting position at 54 percent zoom.",
  );
});

test("accessible region selection keeps the index, canvas, and dossier aligned", async ({
  page,
}) => {
  await startCampaign(page);

  const canvas = page.getByTestId("canvas-campaign-map");
  const regionButton = page.getByTestId("button-select-region-saltmere");

  await regionButton.click();

  await expect(regionButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("text-selected-region-saltmere")).toHaveText(
    "Saltmere Coast",
  );
  await expect(canvas).toBeVisible();
});

test("keeps the map controls and accessible index usable at mobile size", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "mobile", "Mobile project only");

  await startCampaign(page);

  const canvas = page.getByTestId("canvas-campaign-map");
  const box = await canvas.boundingBox();

  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThan(390);
  expect(box!.height).toBeGreaterThan(300);
  expect(box!.height).toBeLessThan(360);
  await expect(page.getByTestId("button-map-zoom-in")).toBeVisible();
  await expect(page.getByTestId("button-map-zoom-out")).toBeVisible();
  await expect(page.getByTestId("button-map-reset-view")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Accessible region index" }),
  ).toBeVisible();
  await expect(page.getByTestId("status-map-view")).toHaveText(
    "Realm board view at 54 percent zoom. Select a province, then drag to pan or use arrow keys to move.",
  );
});
