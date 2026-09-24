import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useStableHandlers } from "./use-stable-handlers";

describe("useStableHandlers", () => {
  it("keeps the same function identities across renders", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) =>
        useStableHandlers({ read: () => value, write: (next: number) => next }),
      { initialProps: { value: 1 } },
    );
    const first = result.current;
    rerender({ value: 2 });
    expect(result.current).toBe(first);
    expect(result.current.read).toBe(first.read);
    expect(result.current.write).toBe(first.write);
  });

  it("always calls the handler from the latest render", () => {
    const calls: string[] = [];
    const { result, rerender } = renderHook(
      ({ label }: { label: string }) =>
        useStableHandlers({
          onEvent: (suffix: string) => {
            calls.push(`${label}:${suffix}`);
            return label;
          },
        }),
      { initialProps: { label: "first" } },
    );
    const stable = result.current;
    expect(stable.onEvent("a")).toBe("first");
    rerender({ label: "second" });
    expect(stable.onEvent("b")).toBe("second");
    expect(calls).toEqual(["first:a", "second:b"]);
  });

  it("forwards every argument", () => {
    const handler = vi.fn();
    const { result } = renderHook(() => useStableHandlers({ onMove: handler }));
    result.current.onMove(1, "two", { three: 3 });
    expect(handler).toHaveBeenCalledWith(1, "two", { three: 3 });
  });
});
