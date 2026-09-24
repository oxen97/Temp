import { useLayoutEffect, useRef, useState } from "react";

type Handler = (...args: never[]) => unknown;

/**
 * Returns the same set of functions with an identity that never changes, each
 * one forwarding to the version passed in on the latest render.
 *
 * Memoized children (layer rows, canvas elements) receive these instead of
 * inline closures, so a parent re-render does not force them to re-render,
 * while every call still runs the parent's current logic against its current
 * state, exactly like an inline closure created on the latest render would.
 *
 * The returned functions are meant for event handlers. Do not call them during
 * render. The set of keys must stay the same between renders.
 */
export function useStableHandlers<T extends Record<string, Handler>>(
  handlers: T,
): T {
  const latestRef = useRef(handlers);
  useLayoutEffect(() => {
    latestRef.current = handlers;
  });
  const [stableHandlers] = useState(() => {
    const forwarded: Record<string, (...args: unknown[]) => unknown> = {};
    for (const name of Object.keys(handlers)) {
      forwarded[name] = (...args: unknown[]) =>
        (
          latestRef.current[name] as unknown as (
            ...callArgs: unknown[]
          ) => unknown
        )(...args);
    }
    return forwarded as unknown as T;
  });
  return stableHandlers;
}
