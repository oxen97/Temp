import { describe, expect, it } from "vitest";

import {
  metersToPx,
  pxToMeters,
} from "@/features/editor/lib/interaction-physics-3d";

// As with the 2D world, the Rapier 3D sim (gravity, collision, bounce) is
// WASM-backed and verified in isolation / the browser rather than in the shared
// vitest suite, where loading the WASM under parallel load is slow and flaky.
// These cover the pure world-px <-> meters bridge.
describe("interaction physics 3D units", () => {
  it("maps pixels and meters", () => {
    expect(pxToMeters(100)).toBe(1);
    expect(metersToPx(1)).toBe(100);
    expect(metersToPx(pxToMeters(320))).toBeCloseTo(320);
    expect(pxToMeters(0)).toBe(0);
  });
});
