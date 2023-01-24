import hermes from "@hermes/server";
import { test, expect, Page } from "@playwright/test";
import { config } from "dotenv";

config();

let page: Page;

test.describe.configure({ mode: "serial" });

test.describe("hermes", () => {
  test.beforeAll(async ({ browser }) => {
    await hermes({
      srv: process.env.MONGO_SRV,
      db: process.env.MONGO_DB,
      whitelist: {
        users: ["username", "name.first", "name.last"],
      },
    });

    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("connection succeeds", async ({ page, baseURL }) => {
    await page.goto(baseURL);
    await page.waitForSelector("#hermes-app");

    const text = await page.getByTestId("connected");
    await expect(text).toContainText("true");
  });
});
