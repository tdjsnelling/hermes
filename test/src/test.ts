import hermes from "@hermes/server";
import { test, expect, Page } from "@playwright/test";
import { MongoClient, Collection } from "mongodb";
import { config } from "dotenv";

config();

const wait = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let page: Page;
let collection: Collection;

test.describe.configure({ mode: "serial" });

test.describe("hermes", () => {
  test.beforeAll(async ({ browser }) => {
    await hermes({
      srv: process.env.MONGO_SRV,
      db: process.env.MONGO_DB,
      whitelist: {
        test_users: ["username", "name.first", "name.last"],
      },
    });

    page = await browser.newPage();

    const client = new MongoClient(process.env.MONGO_SRV);
    await client.connect();
    collection = client.db(process.env.MONGO_DB).collection("test_users");
    await collection.deleteMany({});
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("connection succeeds", async ({ baseURL }) => {
    await page.goto(baseURL);
    await page.waitForSelector("#hermes-app");

    const text = await page.getByTestId("connected");
    await expect(text).toContainText("true");
  });

  test("hook is correctly updated on insert", async () => {
    await collection.insertOne({
      username: "alice",
      name: { first: "Alice", middle: "B", last: "Z" },
      password: "LoremIpsum",
    });

    await wait(500);

    const container = await page.getByTestId("allusers-documents");
    const users = await container.locator("> div");
    await expect(users).toHaveCount(1);

    const firstUserAttributes = await users.first().locator("> p");
    await expect(firstUserAttributes).toHaveCount(3);

    const firstUserId = await firstUserAttributes.locator("._id");
    await expect(await firstUserId.isVisible()).toBe(true);

    const firstUserUsername = await firstUserAttributes.locator(".username");
    await expect(firstUserUsername).toHaveText("alice");

    const firstUserName = await firstUserAttributes.locator(".name");
    await expect(firstUserName).toHaveText('{"first":"Alice","last":"Z"}');

    const firstUserPassword = await firstUserAttributes.locator(".password");
    await expect(await firstUserPassword.isVisible()).toBe(false);
  });

  test("hook with query does not contain non-matching document", async () => {
    const container = await page.getByTestId("filteredusers-documents");
    const users = await container.locator("> div");
    await expect(users).toHaveCount(0);
  });

  test("hook is correctly updated on update", async () => {
    await collection.findOneAndUpdate(
      { username: "alice" },
      { $set: { "name.last": "Y" } }
    );

    await wait(500);

    const container = await page.getByTestId("allusers-documents");
    const users = await container.locator("> div");
    await expect(users).toHaveCount(1);

    const firstUserAttributes = await users.first().locator("> p");
    await expect(firstUserAttributes).toHaveCount(3);

    const firstUserName = await firstUserAttributes.locator(".name");
    await expect(firstUserName).toHaveText('{"first":"Alice","last":"Y"}');

    await collection.findOneAndUpdate(
      { username: "alice" },
      { $set: { "name.middle": "C" } }
    );

    await wait(500);

    const firstUserName2 = await firstUserAttributes.locator(".name");
    await expect(firstUserName2).toHaveText('{"first":"Alice","last":"Y"}');
  });

  test("hook is correctly updated on delete", async () => {
    await collection.deleteOne({ username: "alice" });

    await wait(500);

    const container = await page.getByTestId("allusers-documents");
    const users = await container.locator("> div");
    await expect(users).toHaveCount(0);
  });
});
