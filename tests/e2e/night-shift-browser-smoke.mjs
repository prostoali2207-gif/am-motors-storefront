import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = "https://am-motors-storefront.vercel.app";
const output = "artifacts/night-shift-browser";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const width of [320, 390, 768, 1440]) {
    const height = width < 700 ? 844 : 900;
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let ready = false;

    // Vercel deploy on the same push as this smoke run; wait until the new
    // production commit is routed to the public domain before asserting.
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await page.goto(base, { waitUntil: "domcontentloaded", timeout: 45000 });
      if (await page.locator(".ns-photo-grid > li").count() > 0) {
        ready = true;
        break;
      }
      await page.waitForTimeout(7000);
    }
    assert(ready, "New catalog was not routed to production in time");

    const count = Number(await page.locator(".ns-stock-count strong").innerText());
    const cards = await page.locator(".ns-photo-grid > li").count();
    const images = await page.locator(".ns-photo-card-media img").count();
    const unavailable = await page.locator(".ns-photo-card-unavailable").count();
    const whatsApp = await page.locator(".ns-card-whatsapp").count();

    assert(count > 0, "No available cars");
    assert.equal(cards, count, "Every available car needs its own card");
    assert.equal(images + unavailable, count, "Every car needs a real cover or missing-photo state");
    assert.equal(whatsApp, count, "WhatsApp action must belong to each car");
    assert.equal(await page.locator(".ns-feature").count(), 0, "Old selection viewer must be gone");
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      "Horizontal page overflow at width " + width);
    const link = await page.locator(".ns-card-view").first().getAttribute("href");
    assert(link?.startsWith("/cars/"), "Real first vehicle URL missing");
    assert((await page.locator(".ns-card-whatsapp").first().getAttribute("href"))?.includes("wa.me/971503432337"));
    assert.equal(errors.length, 0, "JavaScript errors: " + errors.join("; "));

    // The page renders server-side before Next/Image has downloaded its optimized
    // same-origin JPEGs. Verify the *pixels* really load, including lazy covers,
    // before we claim that the photo-first catalog works or take screenshots.
    const covers = page.locator(".ns-photo-card-media img");
    for (let imageIndex = 0; imageIndex < await covers.count(); imageIndex += 1) {
      const image = covers.nth(imageIndex);
      await image.scrollIntoViewIfNeeded();
      await page.waitForFunction(
        (element) => element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0,
        await image.elementHandle(),
        { timeout: 60000 },
      );
      // Vercel's broken /_next/image lambda must never be on the request path.
      const imagePath = await image.evaluate((element) => new URL(element.currentSrc).pathname);
      assert(imagePath.startsWith("/media/"), "Cover is not served directly from /media/: " + imagePath);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(200);

    await page.screenshot({ path: output + "/catalog-" + width + ".png" });
    if (width === 390 || width === 1440) {
      await page.screenshot({ path: output + "/catalog-full-" + width + ".png", fullPage: true });
    }

    if (width === 390) {
      const makeFilter = page.locator(".ns-filters button").nth(1);
      await makeFilter.click();
      assert.equal(await makeFilter.getAttribute("aria-pressed"), "true");
      assert(await page.locator(".ns-photo-grid > li").count() <= cards);
      const vdp = await page.locator(".ns-card-view").first().getAttribute("href");
      assert(vdp, "No VDP path after filtering");
      await page.goto(base + vdp, { waitUntil: "domcontentloaded" });
      assert.equal(await page.locator(".vehicle").count(), 1);
      const leadPhoto = page.locator(".photo-slide img").first();
      if (await leadPhoto.count()) {
        await page.waitForFunction(
          (element) => element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0,
          await leadPhoto.elementHandle(),
          { timeout: 60000 },
        );
        const imagePath = await leadPhoto.evaluate((element) => new URL(element.currentSrc).pathname);
        assert(imagePath.startsWith("/media/"), "VDP image is not served directly from /media/: " + imagePath);
      }
      await page.screenshot({ path: output + "/vdp-390.png" });
    }
    await page.close();
    console.log(JSON.stringify({ width, count, covers: images, missingPhotos: unavailable, whatsApp, overflow: false, errors: 0 }));
  }
} finally {
  await browser.close();
}
