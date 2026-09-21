import { describe, expect, it } from "vitest";

import {
  isLiquidPairActive,
  liquidBoundsGap,
} from "@/features/editor/lib/liquid-merge-runtime";

describe("liquid merge pair detection", () => {
  it("measures separation and overlapping boxes", () => {
    const first = { x: 0, y: 0, width: 20, height: 20 };
    expect(liquidBoundsGap(first, { x: 30, y: 0, width: 20, height: 20 })).toBe(10);
    expect(liquidBoundsGap(first, { x: 15, y: 15, width: 20, height: 20 })).toBe(0);
    expect(liquidBoundsGap(first, { x: 23, y: 24, width: 20, height: 20 })).toBe(5);
  });

  it("joins, holds and releases at authored distances", () => {
    const authored = {
      trigger: "near-target",
      joinDistance: 30,
      releaseDistance: 45,
    };
    expect(isLiquidPairActive(authored, 31, false)).toBe(false);
    expect(isLiquidPairActive(authored, 30, false)).toBe(true);
    expect(isLiquidPairActive(authored, 42, true)).toBe(true);
    expect(isLiquidPairActive(authored, 46, true)).toBe(false);
  });

  it("requires actual contact for an overlap trigger", () => {
    const authored = {
      trigger: "while-overlapping",
      joinDistance: 30,
      releaseDistance: 45,
    };
    expect(isLiquidPairActive(authored, 1, true)).toBe(false);
    expect(isLiquidPairActive(authored, 0, false)).toBe(true);
  });
});
