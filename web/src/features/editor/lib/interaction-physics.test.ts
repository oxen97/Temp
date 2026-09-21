import { describe, expect, it } from "vitest";

import {
  metersToPx,
  pxToMeters,
} from "@/features/editor/lib/interaction-physics";

// The Rapier world itself (gravity, collision, bounce) is WASM-backed and is
// verified in the browser rather than here — loading/stepping the WASM inside
// the shared vitest suite is slow and flaky under parallel load. These cover
// the pure coordinate bridge between artboard pixels and physics meters.
describe("interaction physics units", () => {
  it("maps pixels and meters", () => {
    expect(pxToMeters(100)).toBe(1);
    expect(metersToPx(1)).toBe(100);
    expect(metersToPx(pxToMeters(250))).toBeCloseTo(250);
    expect(pxToMeters(0)).toBe(0);
  });
});
