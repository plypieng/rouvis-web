import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { encode } from "next-auth/jwt";
import fs from "node:fs";
import path from "node:path";

function resolveNextAuthSecret(): string {
  if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET;

  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return "dev-secret";

  const envRaw = fs.readFileSync(envPath, "utf8");
  const matched = envRaw.match(/^\s*NEXTAUTH_SECRET\s*=\s*(.+)\s*$/m);
  if (!matched?.[1]) return "dev-secret";

  return matched[1].replace(/^['"]|['"]$/g, "").trim();
}

const SESSION_SECRET = resolveNextAuthSecret();
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3002";

async function attachAuthenticatedSession(context: BrowserContext) {
  const userId = process.env.PLAYWRIGHT_AUTH_USER_ID || "e2e-user-map-1";
  const workspaceId =
    process.env.PLAYWRIGHT_AUTH_WORKSPACE_ID || `ws_${userId}`;
  const role = process.env.PLAYWRIGHT_AUTH_ROLE || "owner";
  const token = await encode({
    secret: SESSION_SECRET,
    token: {
      sub: userId,
      id: userId,
      email: process.env.PLAYWRIGHT_AUTH_EMAIL || "e2e@example.com",
      name: process.env.PLAYWRIGHT_AUTH_NAME || "E2E User",
      workspaceId,
      role,
      profileComplete: true,
      onboardingComplete: true,
    },
    maxAge: 30 * 24 * 60 * 60,
  });

  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: token,
      url: BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function setupFieldStudioRoutes(page: Page) {
  await page.route("**/api/v1/telemetry/events", async (route) => {
    await route.fulfill({ status: 204, body: "" });
  });

  await page.route("**/api/v1/agents/subagents/status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ runs: [] }),
    });
  });

  await page.route("**/api/weather/alerts**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        alerts: [],
        meta: {
          fetchedAt: new Date().toISOString(),
          validUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          isStale: false,
        },
      }),
    });
  });

  await page.route("**/api/weather/overview**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        location: { label: "Nagaoka" },
        current: {
          temperature: 19,
          temperatureRange: { min: 11, max: 22 },
          condition: { code: 3, label: "Cloudy", icon: "03d" },
          windSpeedKmh: 12,
          windDirectionLabel: "NE",
          precipitationMm: 1,
          observedAt: new Date().toISOString(),
        },
        daily: [],
        alerts: [],
        schedulingRisks: [
          {
            severity: "watch",
            reason: "Rain window in 48h",
            confidence: 0.74,
          },
        ],
      }),
    });
  });

  await page.route("**/api/v1/fields", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        fields: [
          {
            id: "field-1",
            name: "テスト圃場",
            crop: "Tomato",
            color: "#16a34a",
            geoStatus: "verified",
            areaSqm: 1200,
            environmentType: "open_field",
            weatherSamplingMode: "hybrid",
            centroid: { lat: 37.4, lon: 138.9 },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [138.898, 37.399],
                  [138.902, 37.399],
                  [138.902, 37.401],
                  [138.898, 37.401],
                  [138.898, 37.399],
                ],
              ],
            },
          },
        ],
      }),
    });
  });
}

test.describe("Field Studio smoke", () => {
  test.beforeEach(async ({ context }) => {
    await attachAuthenticatedSession(context);
  });

  test("loads the map canvas, field rail, and scoped weather panel", async ({
    page,
  }) => {
    await setupFieldStudioRoutes(page);

    await page.goto("/ja/map");

    await expect(page.getByText("テスト圃場")).toBeVisible();
    await expect(page.getByTestId("field-map-canvas")).toBeVisible();
    await expect(page.getByTestId("maplibre-canvas")).toBeVisible();
    await expect(page.getByText("圃場ピンポイント気象")).toBeVisible();
    await expect(page.getByText("Rain window in 48h")).toBeVisible();
    await expect(page.getByText("Nagaoka")).toBeVisible();
  });
});
