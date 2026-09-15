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
