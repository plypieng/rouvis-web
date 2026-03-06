import {
  test,
  expect,
  type BrowserContext,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { encode } from "next-auth/jwt";
import fs from "node:fs";
import path from "node:path";

type MockTask = {
  id: string;
  title: string;
  dueDate: string;
  status: "pending" | "completed";
  priority: "low" | "medium" | "high";
  isBackfilled?: boolean;
  isAssumed?: boolean;
  fieldId: string;
};

type RevisionSummary = {
  id: string;
  type: "baseline" | "replan";
  mode: "replace_open" | "replace_all";
  source: "wizard_initial" | "project_replan";
  preferenceTemplate?: string | null;
  summary: Record<string, unknown>;
  note?: string | null;
  createdAt: string;
  triggeredByUserId: string;
};

type RevisionDetail = RevisionSummary & {
  projectId: string;
  workspaceId: string;
  schedulingPreferences?: Record<string, unknown> | null;
  beforeTasksSnapshot: Record<string, unknown>[];
  afterTasksSnapshot: Record<string, unknown>[];
};

type MockState = {
  project: {
    id: string;
    name: string;
    crop: string;
    variety?: string;
    startDate: string;
    targetHarvestDate?: string;
    status: string;
    notes?: string;
    primaryFieldId: string;
    fieldIds: string[];
    tasks: MockTask[];
    schedulingPreferences: Record<string, unknown> | null;
  };
  revisions: RevisionSummary[];
  revisionDetails: Record<string, RevisionDetail>;
  revisionCounter: number;
  taskCounter: number;
  createdProjectCalls: number;
  lastReplanMode: "replace_open" | "replace_all" | null;
  lastReplanSource: "wizard_initial" | "project_replan" | null;
};

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
  const userId = process.env.PLAYWRIGHT_AUTH_USER_ID || "e2e-user-1";
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

function createMockState(initialTasks: MockTask[]): MockState {
  return {
    project: {
      id: "project-1",
      name: "Tomato 2026",
      crop: "Tomato",
      variety: "Momotaro",
      startDate: "2026-02-10",
      targetHarvestDate: "2026-06-10",
      status: "active",
      notes: "Initial plan",
      primaryFieldId: "field-1",
      fieldIds: ["field-1"],
      tasks: [...initialTasks],
      schedulingPreferences: {
        maxTasksPerDay: 4,
      },
    },
    revisions: [],
    revisionDetails: {},
    revisionCounter: 1,
    taskCounter: 100,
    createdProjectCalls: 0,
    lastReplanMode: null,
    lastReplanSource: null,
  };
}

function toSnapshot(tasks: MockTask[]) {
  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    dueDate: task.dueDate,
    status: task.status,
    priority: task.priority,
    isBackfilled: Boolean(task.isBackfilled),
    isAssumed: Boolean(task.isAssumed),
    fieldId: task.fieldId,
    createdAt: "2026-02-19T00:00:00.000Z",
    updatedAt: "2026-02-19T00:00:00.000Z",
  }));
}

function addUtcDays(base: string, days: number): string {
  const parsed = new Date(base);
  const fallback = Number.isFinite(parsed.getTime())
    ? parsed
    : new Date("2026-02-25T06:00:00.000Z");
  fallback.setUTCDate(fallback.getUTCDate() + days);
  return fallback.toISOString();
}

function buildGeneratedTasks(
  state: MockState,
  params: {
    source: "wizard_initial" | "project_replan";
    mode: "replace_open" | "replace_all";
    startDate?: string;
  },
): MockTask[] {
  const seedDate = params.startDate
    ? `${params.startDate}T06:00:00.000Z`
    : "2026-02-25T06:00:00.000Z";
  const prefix = params.source === "wizard_initial" ? "Initial " : "";

  const drafts = [
    {
      title: `${prefix}Irrigation check`,
      dueDate: addUtcDays(seedDate, 0),
      priority: "medium" as const,
      status: "pending" as const,
    },
    {
      title: `${prefix}Leaf inspection`,
      dueDate: addUtcDays(seedDate, 1),
      priority: "high" as const,
      status: "pending" as const,
    },
    {
      title: `${prefix}Future task`,
      dueDate: addUtcDays(seedDate, 7),
      priority: "low" as const,
      status: "pending" as const,
    },
  ];

  return drafts.map((task) => ({
    id: `task-${state.taskCounter++}`,
    title: task.title,
    dueDate: task.dueDate,
    status: task.status,
    priority: task.priority,
    fieldId: state.project.primaryFieldId,
  }));
}

function recordRevisionSummary(state: MockState, revision: RevisionDetail) {
  state.revisions = [
    {
      id: revision.id,
      type: revision.type,
      mode: revision.mode,
      source: revision.source,
      preferenceTemplate: revision.preferenceTemplate,
      summary: revision.summary,
      note: revision.note,
      createdAt: revision.createdAt,
      triggeredByUserId: revision.triggeredByUserId,
    },
    ...state.revisions,
  ];
  state.revisionDetails[revision.id] = revision;
}

function commitGeneratedSchedule(
  state: MockState,
  params: {
    source: "wizard_initial" | "project_replan";
    mode: "replace_open" | "replace_all";
    schedulingPreferences?: Record<string, unknown>;
    preferenceTemplate?: string;
    note?: string;
    startDate?: string;
  },
) {
  const before = [...state.project.tasks];
  const generatedTasks = buildGeneratedTasks(state, {
    source: params.source,
    mode: params.mode,
    startDate: params.startDate,
  });
  const preserved =
    params.mode === "replace_open"
      ? before.filter(
          (task) => task.status === "completed" || task.isBackfilled,
        )
      : [];

  state.project.tasks = [...preserved, ...generatedTasks];
  if (params.schedulingPreferences) {
    state.project.schedulingPreferences = params.schedulingPreferences;
  }

  state.lastReplanMode = params.mode;
  state.lastReplanSource = params.source;

  const revision = buildRevision(state, {
    mode: params.mode,
    source: params.source,
    before,
    after: state.project.tasks,
    generatedCount: generatedTasks.length,
    note: params.note,
    preferenceTemplate: params.preferenceTemplate,
    schedulingPreferences: params.schedulingPreferences,
  });

  recordRevisionSummary(state, revision);

  return {
    generatedTasks,
    revision,
  };
}

function buildRevision(
  state: MockState,
  params: {
    mode: "replace_open" | "replace_all";
    source: "wizard_initial" | "project_replan";
    before: MockTask[];
    after: MockTask[];
    generatedCount: number;
    note?: string | null;
    preferenceTemplate?: string | null;
    schedulingPreferences?: Record<string, unknown> | null;
  },
): RevisionDetail {
  const id = `rev-${state.revisionCounter++}`;
  const createdAt = new Date(
    Date.now() + state.revisionCounter * 1000,
  ).toISOString();
  const summary = {
    generatedTaskCount: params.generatedCount,
    replacedTaskCount:
      params.mode === "replace_all"
        ? params.before.length
        : params.before.filter(
            (task) => task.status !== "completed" && !task.isBackfilled,
          ).length,
    afterTaskCount: params.after.length,
  };

  return {
    id,
    projectId: state.project.id,
    workspaceId: "ws-1",
    triggeredByUserId: "e2e-user-1",
    type:
      params.source === "wizard_initial" && state.revisions.length === 0
        ? "baseline"
        : "replan",
    mode: params.mode,
    source: params.source,
    preferenceTemplate: params.preferenceTemplate || null,
    summary,
    note: params.note || null,
    createdAt,
    schedulingPreferences: params.schedulingPreferences || null,
    beforeTasksSnapshot: toSnapshot(params.before),
    afterTasksSnapshot: toSnapshot(params.after),
  };
}

async function waitMockLatency(ms = 220) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isMobileProject(testInfo: TestInfo): boolean {
  return /mobile/i.test(testInfo.project.name);
}

async function ensureCalendarPanelVisible(page: Page, testInfo: TestInfo) {
  if (!isMobileProject(testInfo)) return;
  const calendarTab = page.getByTestId("project-mobile-tab-calendar");
  if (await calendarTab.count()) {
    await calendarTab.click();
  }
}

async function clickReplanSubmit(page: Page, testInfo: TestInfo) {
  const submitButton = page.getByTestId("replan-submit");
  await submitButton.scrollIntoViewIfNeeded();
  if (isMobileProject(testInfo)) {
    await expect(submitButton).toBeEnabled();
    await submitButton.evaluate((element) => {
      (element as HTMLButtonElement).click();
    });
    return;
  }
  await submitButton.click();
}

async function setupMockRoutes(page: Page, state: MockState) {
  await page.route("**/api/v1/telemetry/events", async (route) => {
    await route.fulfill({ status: 204, body: "" });
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
          temperature: 20,
          temperatureRange: { min: 12, max: 24 },
          condition: { code: 1, label: "Sunny", icon: "01d" },
          windSpeedKmh: 8,
          windDirectionLabel: "E",
          precipitationMm: 0,
          observedAt: new Date().toISOString(),
        },
        daily: [],
        alerts: [],
        schedulingRisks: [],
      }),
    });
  });

  await page.route("**/api/weather/forecast/daily**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        location: {
          lat: 37.4,
          lon: 138.9,
          label: "Nagaoka",
          reason: "project_field_coordinates",
        },
        daily: [],
        meta: {
          fetchedAt: new Date().toISOString(),
          validUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          isStale: false,
          provider: "mock-weather",
          providerModel: "test",
          locationReason: "project_field_coordinates",
        },
      }),
    });
  });

  await page.route("**/api/chatkit**", async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ messages: [] }),
      });
      return;
    }

    const body = request.postDataJSON() as { action?: string };
    if (body.action === "chatkit.list_threads") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          threads: [
            {
              id: "thread-1",
              title: "Project thread",
              updatedAt: new Date().toISOString(),
            },
          ],
        }),
      });
      return;
    }

    if (body.action === "chatkit.create_thread") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ thread: { id: "thread-1" } }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (
      pathname === "/api/v1/projects/preference-templates" &&
      method === "GET"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          templates: [
            {
              id: "conservative-weather",
              status: "active",
              label: "Conservative weather",
              description: "Lower daily load and prioritize weather safety.",
              preferences: {
                preferredWorkStartHour: 7,
                preferredWorkEndHour: 16,
                maxTasksPerDay: 3,
                riskTolerance: "conservative",
                irrigationStyle: "strict",
              },
            },
          ],
          recommendedTemplate: "conservative-weather",
        }),
      });
      return;
    }

    if (pathname === "/api/v1/fields" && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          fields: [
            {
              id: "field-1",
              name: "テスト圃場",
              crop: "Tomato",
              geoStatus: "verified",
              areaSqm: 1200,
              environmentType: "open_field",
            },
          ],
        }),
      });
      return;
    }

    if (pathname === "/api/v1/knowledge/crops" && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          knowledge: {
            cropName: "tomato",
            stages: [
              { key: "seedling", label: "Seedling", duration: 20 },
              { key: "flowering", label: "Flowering", duration: 40 },
              { key: "harvest", label: "Harvest", duration: 50 },
            ],
            pests: [],
            tips: [],
          },
        }),
      });
      return;
    }

    if (pathname === "/api/v1/agents/subagents/status" && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ runs: [] }),
      });
      return;
    }

    if (pathname === "/api/v1/agents/recommend" && method === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          crop: "Tomato",
          variety: "Momotaro",
          startDate: "2026-02-20",
          targetHarvestDate: "2026-06-10",
          notes: "mock recommendation",
          daysToHarvest: 110,
        }),
      });
      return;
    }

    if (
      (pathname === "/api/v1/agents/generate-schedule" ||
        pathname === "/api/v1/agents/generate-backfilled-schedule") &&
      method === "POST"
    ) {
      const body = request.postDataJSON() as {
        source?: "wizard_initial" | "project_replan";
        replanMode?: "replace_open" | "replace_all";
        preferenceTemplate?: string;
        schedulingPreferences?: Record<string, unknown>;
        note?: string;
        currentDate?: string;
      };
      const source =
        body.source === "project_replan" ? "project_replan" : "wizard_initial";
      const mode =
        source === "project_replan"
          ? body.replanMode === "replace_all"
            ? "replace_all"
            : "replace_open"
          : "replace_all";
      const { generatedTasks, revision } = commitGeneratedSchedule(state, {
        source,
        mode,
        schedulingPreferences: body.schedulingPreferences,
        preferenceTemplate: body.preferenceTemplate,
        note: body.note,
        startDate: body.currentDate,
      });

      await waitMockLatency();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          generation: {
            mode: "sync",
            source,
            state: "succeeded",
            engine: "mock-planner",
          },
          taskCount: generatedTasks.length,
          commitRevisionId: revision.id,
          schedule: {
            weeks: [
              {
                tasks: generatedTasks.map((task) => ({
                  title: task.title,
                  description: `Generated for ${source}`,
                  dueDate: task.dueDate,
                  priority: task.priority,
                })),
              },
            ],
            pastTasks: [],
            currentWeekTasks: generatedTasks.slice(0, 2).map((task) => ({
              title: task.title,
              description: `Generated for ${source}`,
              dueDate: task.dueDate,
              priority: task.priority,
            })),
            futureTasks: generatedTasks.slice(2).map((task) => ({
              tasks: [
                {
                  title: task.title,
                  description: `Generated for ${source}`,
                  dueDate: task.dueDate,
                  priority: task.priority,
                },
              ],
            })),
          },
        }),
      });
      return;
    }

    if (pathname === "/api/v1/projects" && method === "POST") {
      state.createdProjectCalls += 1;
      await waitMockLatency();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ project: state.project }),
      });
      return;
    }

    if (pathname === "/api/v1/projects" && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ projects: [state.project] }),
      });
      return;
    }

    if (
      pathname === `/api/v1/projects/${state.project.id}` &&
      method === "GET"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ project: state.project }),
      });
      return;
    }

    if (
      pathname ===
        `/api/v1/projects/${state.project.id}/reschedule-suggestion` &&
      method === "GET"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          suggestion: null,
          signals: {
            weatherRiskCount: 0,
            staleWeather: false,
          },
        }),
      });
      return;
    }

    if (
      pathname === `/api/v1/projects/${state.project.id}/replan` &&
      method === "POST"
    ) {
      const body = request.postDataJSON() as {
        mode: "replace_open" | "replace_all";
        source: "wizard_initial" | "project_replan";
        tasks: Array<{
          title: string;
          description?: string;
          dueDate?: string;
          priority?: "low" | "medium" | "high";
          status?: "pending" | "completed";
          fieldId?: string;
          isBackfilled?: boolean;
          isAssumed?: boolean;
        }>;
        note?: string;
        preferenceTemplate?: string;
        schedulingPreferences?: Record<string, unknown>;
      };

      const before = [...state.project.tasks];
      const generatedTasks: MockTask[] = (body.tasks || []).map((task) => ({
        id: `task-${state.taskCounter++}`,
        title: task.title,
        dueDate: task.dueDate || "2026-02-25T06:00:00.000Z",
        status: task.status === "completed" ? "completed" : "pending",
        priority: task.priority || "medium",
        isBackfilled: task.isBackfilled,
        isAssumed: task.isAssumed,
        fieldId: task.fieldId || state.project.primaryFieldId,
      }));

      const preserved =
        body.mode === "replace_open"
          ? before.filter(
              (task) => task.status === "completed" || task.isBackfilled,
            )
          : [];

      state.project.tasks = [...preserved, ...generatedTasks];
      if (body.schedulingPreferences) {
        state.project.schedulingPreferences = body.schedulingPreferences;
      }

      state.lastReplanMode = body.mode;
      state.lastReplanSource = body.source;

      const revision = buildRevision(state, {
        mode: body.mode,
        source: body.source,
        before,
        after: state.project.tasks,
        generatedCount: generatedTasks.length,
        note: body.note,
        preferenceTemplate: body.preferenceTemplate,
        schedulingPreferences: body.schedulingPreferences,
      });

      recordRevisionSummary(state, revision);

      await waitMockLatency();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          projectId: state.project.id,
          revision: {
            id: revision.id,
            type: revision.type,
            mode: revision.mode,
            source: revision.source,
            summary: revision.summary,
            createdAt: revision.createdAt,
          },
          tasks: state.project.tasks,
        }),
      });
      return;
    }

    if (
      pathname ===
        `/api/v1/projects/${state.project.id}/schedule-revisions/bootstrap` &&
      method === "POST"
    ) {
      const baseline = state.revisions.find(
        (revision) => revision.type === "baseline",
      );
      if (baseline) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ created: false, revision: baseline }),
        });
        return;
      }

      const revision = {
        id: `rev-${state.revisionCounter++}`,
        projectId: state.project.id,
        workspaceId: "ws-1",
        triggeredByUserId: "e2e-user-1",
        type: "baseline" as const,
        mode: "replace_all" as const,
        source: "project_replan" as const,
        preferenceTemplate: null,
        summary: {
          generatedTaskCount: 0,
          replacedTaskCount: 0,
          afterTaskCount: state.project.tasks.length,
        },
        note: "Auto-bootstrapped baseline revision",
        createdAt: "2026-02-18T00:00:00.000Z",
        schedulingPreferences: state.project.schedulingPreferences || null,
        beforeTasksSnapshot: toSnapshot(state.project.tasks),
        afterTasksSnapshot: toSnapshot(state.project.tasks),
      };

      recordRevisionSummary(state, revision);
      state.revisions = [...state.revisions].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          created: true,
          revision: {
            id: revision.id,
            type: revision.type,
            mode: revision.mode,
            source: revision.source,
            summary: revision.summary,
            createdAt: revision.createdAt,
          },
        }),
      });
      return;
    }

    if (
      pathname === `/api/v1/projects/${state.project.id}/schedule-revisions` &&
      method === "GET"
    ) {
      const ordered = [...state.revisions].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          revisions: ordered,
          page: {
            hasMore: false,
            nextCursor: null,
          },
        }),
      });
      return;
    }

    const revisionDetailMatch = pathname.match(
      /\/api\/v1\/projects\/project-1\/schedule-revisions\/(rev-[^/]+)$/,
    );
    if (revisionDetailMatch && method === "GET") {
      const revisionId = revisionDetailMatch[1];
      const detail = state.revisionDetails[revisionId];
      await route.fulfill({
        status: detail ? 200 : 404,
        contentType: "application/json",
        body: JSON.stringify(
          detail ? { revision: detail } : { error: "Revision not found" },
        ),
      });
      return;
    }

    await route.continue();
  });
}

test.describe("Project schedule lifecycle (wizard + replan + history)", () => {
  test.beforeEach(async ({ context }) => {
    await attachAuthenticatedSession(context);
  });

  test("wizard creation redirects to project detail and commits initial schedule via replan", async ({
    page,
  }, testInfo) => {
    const state = createMockState([]);
    await setupMockRoutes(page, state);

    await page.goto("/ja/projects/create");

    await page.getByRole("button", { name: "新しく植える" }).click();
    await page.getByPlaceholder("例: コシヒカリ").fill("トマト");
    await page.getByRole("button", { name: "次へ" }).click();

    await page.getByRole("button", { name: "次へ：圃場を選択" }).click();
    await expect(
      page.getByRole("heading", { name: "圃場を選択（複数可）" }),
    ).toBeVisible();
    await expect(page.getByText("計画テンプレート")).toBeVisible();
    await expect(page.getByText("高度な制約")).toBeVisible();
    await expect(page.getByText("Advanced constraints")).toHaveCount(0);

    const browseMapHeight = await page
      .getByTestId("field-selector-browse-map")
      .evaluate((element) =>
        Math.round(element.getBoundingClientRect().height),
      );
    await page.getByRole("button", { name: /\+\s*新しい圃場を作成/ }).click();
    await expect(page.getByTestId("field-selector-create-panel")).toBeVisible();
    const createMapHeight = await page
      .getByTestId("field-selector-create-map")
      .evaluate((element) =>
        Math.round(element.getBoundingClientRect().height),
      );
    const minCreateMapHeight = isMobileProject(testInfo) ? 330 : 430;
    const minBrowseMapHeight = isMobileProject(testInfo) ? 280 : 350;
    expect(createMapHeight).toBeGreaterThanOrEqual(minCreateMapHeight);
    expect(browseMapHeight).toBeGreaterThanOrEqual(minBrowseMapHeight);

    await page.getByRole("button", { name: /既存の圃場から選択/ }).click();
    await page
      .getByRole("button", { name: /テスト圃場/ })
      .first()
      .click();
    await page.getByRole("button", { name: "プロジェクトを作成" }).click();
    await expect(
      page.getByTestId("wizard-schedule-processing-overlay"),
    ).toBeVisible();

    await expect.poll(() => page.url()).toContain("project-1");
    expect(page.url()).not.toContain("/dashboard");
    expect(state.createdProjectCalls).toBe(1);
    expect(state.lastReplanMode).toBe("replace_all");
    expect(state.lastReplanSource).toBe("wizard_initial");
  });

  test("project replan supports replace_open and replace_all, then shows history panel details", async ({
    page,
  }, testInfo) => {
    const state = createMockState([
      {
        id: "task-completed-1",
        title: "Completed baseline task",
        dueDate: "2026-02-15T06:00:00.000Z",
        status: "completed",
        priority: "medium",
        fieldId: "field-1",
      },
      {
        id: "task-open-1",
        title: "Open baseline task",
        dueDate: "2026-02-16T06:00:00.000Z",
        status: "pending",
        priority: "medium",
        fieldId: "field-1",
      },
    ]);
    await setupMockRoutes(page, state);

    await page.goto("/ja/projects/project-1?debugMockProject=seeded");

    await page
      .locator('[data-testid="project-header-menu"]:visible')
      .first()
      .click();
    await page
      .locator('[data-testid="project-header-replan"]:visible')
      .first()
      .click();
    await expect(page.getByTestId("replan-dialog")).toBeVisible();
    await clickReplanSubmit(page, testInfo);
    await expect(
      page.getByTestId("replan-schedule-processing-overlay"),
    ).toBeVisible();

    await expect.poll(() => state.lastReplanMode).toBe("replace_open");
    expect(
      state.project.tasks.some((task) => task.id === "task-completed-1"),
    ).toBe(true);

    await page
      .locator('[data-testid="project-header-menu"]:visible')
      .first()
      .click();
    await page
      .locator('[data-testid="project-header-replan"]:visible')
      .first()
      .click();
    await expect(page.getByTestId("replan-dialog")).toBeVisible();
    await page.getByTestId("replan-mode-select").selectOption("replace_all");
    await clickReplanSubmit(page, testInfo);
    await expect(
      page.getByTestId("replan-schedule-processing-overlay"),
    ).toBeVisible();

    await expect.poll(() => state.lastReplanMode).toBe("replace_all");
    expect(
      state.project.tasks.some((task) => task.id === "task-completed-1"),
    ).toBe(false);
    expect(state.project.tasks.some((task) => task.id === "task-open-1")).toBe(
      false,
    );
    expect(state.project.tasks.length).toBeGreaterThan(0);

    await ensureCalendarPanelVisible(page, testInfo);
    if (isMobileProject(testInfo)) {
      await page.getByTestId("project-mobile-section-settings").click();
    } else {
      await page.getByTestId("project-desktop-tab-settings").click();
    }
    await page.getByRole("button", { name: /変更履歴を表示/ }).click();
    await expect(page.getByTestId("schedule-history-panel")).toBeVisible();
    await expect(
      page.getByText("このプロジェクトのベースライン履歴を作成しました。"),
    ).toBeVisible();
    await expect(
      page.getByText("再計画（全タスク置換）").first(),
    ).toBeVisible();
    await expect(page.getByText("変更前スナップショット")).toBeVisible();
    await expect(page.getByText("変更後スナップショット")).toBeVisible();
  });

  test("zero-task project shows replan CTA and can generate first schedule", async ({
    page,
  }, testInfo) => {
    const state = createMockState([]);
    await setupMockRoutes(page, state);

    await page.goto("/ja/projects/project-1?debugMockProject=empty");
    await ensureCalendarPanelVisible(page, testInfo);

    const visibleEmptyState = page.locator(
      '[data-testid="project-empty-replan-state"]:visible',
    );
    const visibleEmptyCta = page.locator(
      '[data-testid="project-empty-replan-cta"]:visible',
    );

    await expect(visibleEmptyState).toBeVisible();
    await visibleEmptyCta.click();
    await expect(page.getByTestId("replan-dialog")).toBeVisible();
    await expect(page.getByTestId("replan-mode-select")).toHaveValue(
      "replace_all",
    );
    await clickReplanSubmit(page, testInfo);
    await expect(
      page.getByTestId("replan-schedule-processing-overlay"),
    ).toBeVisible();

    await expect.poll(() => state.lastReplanMode).toBe("replace_all");
    await expect.poll(() => state.project.tasks.length).toBeGreaterThan(0);
  });
});
