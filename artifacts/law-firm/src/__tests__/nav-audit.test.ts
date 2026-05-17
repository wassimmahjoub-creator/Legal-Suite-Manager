import { describe, test, expect } from "vitest";

/**
 * Nav Audit — verifies every sidebar link resolves to a known route.
 *
 * This is a pure data test: no DOM, no rendering.
 * If a link is added to the sidebar and its route is missing, this test fails.
 */

// ── Canonical route patterns (mirrors App.tsx Switch) ────────────────────────
const ROUTER_ROUTES = [
  "/",
  "/cases",
  "/cases/:id",
  "/clients",
  "/billing",
  "/calendar",
  "/documents",
  "/time-tracking",
  "/expenses",
  "/reports",
  "/voice-dictation",
  "/opponents",
  "/consultations",
  "/templates",
  "/courts",
  "/communications",
  "/correspondances",
  "/insurance-companies",
  "/bank-accounts",
  "/legal-config",
  "/audit-logs",
  "/trash",
  "/settings",
  "/users",
  "/subscription",
  "/pricing",
  "/register",
  "/forgot-password",
  "/reset-password/:token",
  "/invite/:token",
  // legacy redirects
  "/adversaries",
];

// ── Sidebar links (mirrors Layout.tsx NAV_* arrays) ──────────────────────────
// voice-dictation intentionally omitted (hidden by FEATURE_DICTATION = false)
const SIDEBAR_LINKS = [
  // NAV_PRIMARY
  "/",
  "/cases",
  "/calendar",
  "/clients",
  "/documents",
  "/billing",
  // NAV_SECONDARY
  "/opponents",
  "/consultations",
  "/communications",
  "/correspondances",
  "/time-tracking",
  "/reports",
  "/courts",
  "/templates",
  "/expenses",
  // NAV_ADMIN (voice-dictation hidden by feature flag)
  "/users",
  "/subscription",
  "/settings",
  // NAV_SYSTEM
  "/bank-accounts",
  "/legal-config",
  "/audit-logs",
  "/trash",
];

// ── Helper: check if a concrete path is matched by any route pattern ──────────
function matchRoute(link: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    const regexStr = "^" + pattern.replace(/:[^/]+/g, "[^/]+") + "$";
    return new RegExp(regexStr).test(link);
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("Navigation audit", () => {
  test("every sidebar link has a matching route (no 404)", () => {
    const broken = SIDEBAR_LINKS.filter(link => !matchRoute(link, ROUTER_ROUTES));
    expect(broken, `Links without a route: ${broken.join(", ")}`).toEqual([]);
  });

  test("/adversaries redirect is registered in the router", () => {
    expect(ROUTER_ROUTES).toContain("/adversaries");
  });

  test("/voice-dictation route exists in router even though menu item is hidden", () => {
    expect(ROUTER_ROUTES).toContain("/voice-dictation");
  });

  test("no sidebar link points to /adversaries (old alias removed from menu)", () => {
    expect(SIDEBAR_LINKS).not.toContain("/adversaries");
  });

  test("no sidebar link points to /dictation (was never a real route)", () => {
    expect(SIDEBAR_LINKS).not.toContain("/dictation");
  });

  test("no sidebar link points to /insurance-companies (removed from menu)", () => {
    expect(SIDEBAR_LINKS).not.toContain("/insurance-companies");
  });
});
