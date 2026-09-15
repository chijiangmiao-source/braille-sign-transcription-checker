import { expect, test } from "@playwright/test";

test.describe("门牌盲文点位核对页面联调", () => {
  test("整份通过", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("text-input").fill("a1b 2");
    await page.getByTestId("cells-input").fill("1 3456 1 12 0 3456 12");
    await page.getByTestId("submit").click();
    await expect(page.getByTestId("verdict")).toHaveText("通过");
    await expect(page.getByTestId("error")).toBeHidden();
  });

  test("整份不通过", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("text-input").fill("a1b 2");
    await page.getByTestId("cells-input").fill("1 3456 1 12 0 3456 1");
    await page.getByTestId("submit").click();
    await expect(page.getByTestId("verdict")).toHaveText("不通过");
  });

  test("非法文本显示明确错误", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("text-input").fill("Abc 1");
    await page.getByTestId("cells-input").fill("1");
    await page.getByTestId("submit").click();
    await expect(page.getByTestId("error")).toContainText("小写");
    await expect(page.getByTestId("verdict")).toBeHidden();
  });

  test("非法点位单元显示明确错误", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("text-input").fill("a1");
    await page.getByTestId("cells-input").fill("1 3456 21");
    await page.getByTestId("submit").click();
    await expect(page.getByTestId("error")).toContainText("点位单元格式不正确");
    await expect(page.getByTestId("verdict")).toBeHidden();
  });

  test("新提交清除旧结论", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("text-input").fill("a1");
    await page.getByTestId("cells-input").fill("1 3456 1");
    await page.getByTestId("submit").click();
    await expect(page.getByTestId("verdict")).toHaveText("通过");

    await page.getByTestId("text-input").fill("a  b");
    await page.getByTestId("submit").click();
    await expect(page.getByTestId("verdict")).toBeHidden();
    await expect(page.getByTestId("error")).toContainText("连续空格");

    await page.getByTestId("text-input").fill("a1");
    await page.getByTestId("cells-input").fill("1 3456 12");
    await page.getByTestId("submit").click();
    await expect(page.getByTestId("error")).toBeHidden();
    await expect(page.getByTestId("verdict")).toHaveText("不通过");
  });

  test("API 对非法输入返回 422", async ({ request }) => {
    const badText = await request.post("/api/check", {
      data: { text: "a  b", cells: "1" },
    });
    expect(badText.status()).toBe(422);

    const badCells = await request.post("/api/check", {
      data: { text: "a", cells: "21" },
    });
    expect(badCells.status()).toBe(422);
  });
});

test.describe("核算用量", () => {
  test("普通字母门牌显示四项统计", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("text-input").fill("abc");
    await page.getByTestId("usage-submit").click();
    await expect(page.getByTestId("usage-cells")).toHaveText("单元总数：3");
    await expect(page.getByTestId("usage-dots")).toHaveText("凸点总数：5");
    await expect(page.getByTestId("usage-empty")).toHaveText("空点数：0");
    await expect(page.getByTestId("usage-number-signs")).toHaveText("数字号数：0");
    await expect(page.getByTestId("usage-error")).toBeHidden();
  });

  test("含连续数字和空格的门牌显示统计", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("text-input").fill("ab 12");
    await page.getByTestId("usage-submit").click();
    await expect(page.getByTestId("usage-cells")).toHaveText("单元总数：6");
    await expect(page.getByTestId("usage-dots")).toHaveText("凸点总数：10");
    await expect(page.getByTestId("usage-empty")).toHaveText("空点数：1");
    await expect(page.getByTestId("usage-number-signs")).toHaveText("数字号数：1");
  });

  test("非法文本后旧用量被清除", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("text-input").fill("abc");
    await page.getByTestId("usage-submit").click();
    await expect(page.getByTestId("usage")).toBeVisible();

    await page.getByTestId("text-input").fill("Abc");
    await page.getByTestId("usage-submit").click();
    await expect(page.getByTestId("usage")).toBeHidden();
    await expect(page.getByTestId("usage-error")).toContainText("小写");
  });

  test("完成用量核算后仍可按原方式提交点位记录并得到通过或不通过", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("text-input").fill("a1b 2");
    await page.getByTestId("usage-submit").click();
    await expect(page.getByTestId("usage")).toBeVisible();

    await page.getByTestId("cells-input").fill("1 3456 1 12 0 3456 12");
    await page.getByTestId("submit").click();
    await expect(page.getByTestId("verdict")).toHaveText("通过");

    await page.getByTestId("cells-input").fill("1 3456 1 12 0 3456 1");
    await page.getByTestId("submit").click();
    await expect(page.getByTestId("verdict")).toHaveText("不通过");
  });

  test("API 用量核算契约与 422", async ({ request }) => {
    const ok = await request.post("/api/usage", { data: { text: "ab 12" } });
    expect(ok.status()).toBe(200);
    expect(await ok.json()).toEqual({ cells: 6, dots: 10, empty_cells: 1, number_signs: 1 });

    const bad = await request.post("/api/usage", { data: { text: "a  b" } });
    expect(bad.status()).toBe(422);
  });
});
