import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { createPrimitiveObject3D } from "@/features/editor/three/types";
import { Scene3DPreview } from "./scene-3d-preview";

const thumbnailMocks = vi.hoisted(() => ({
  cached: new Map<string, string>(),
  requests: new Map<
    string,
    { resolve: (url: string | null) => void; promise: Promise<string | null> }
  >(),
}));

vi.mock("@/features/editor/three/scene-thumbnail", () => ({
  createScene3DThumbnailKey: (request: {
    layer: string;
    objects: { id: string; material: { color: string } }[];
  }) =>
    `${request.layer}:${request.objects.map((object) => `${object.id}:${object.material.color}`).join(",")}`,
  getCachedScene3DThumbnail: (key: string) => thumbnailMocks.cached.get(key),
  requestScene3DThumbnail: (request: {
    layer: string;
    objects: { id: string; material: { color: string } }[];
  }) => {
    const key = `${request.layer}:${request.objects.map((object) => `${object.id}:${object.material.color}`).join(",")}`;
    let pending = thumbnailMocks.requests.get(key);
    if (!pending) {
      let resolve!: (url: string | null) => void;
      const promise = new Promise<string | null>((done) => {
        resolve = done;
      });
      pending = { promise, resolve };
      thumbnailMocks.requests.set(key, pending);
    }
    return pending.promise;
  },
}));

function object(id: string, color: string) {
  const result = createPrimitiveObject3D({
    dimensions: { depth: 40, height: 80, width: 100 },
    id,
    name: id,
    position: { x: 100, y: 100, z: 0 },
    primitive: "box",
  });
  result.material.color = color;
  return result;
}

beforeEach(() => {
  vi.useFakeTimers();
  thumbnailMocks.cached.clear();
  thumbnailMocks.requests.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("keeps only a static image and ignores completion from an obsolete request", async () => {
  const first = object("first", "#111111");
  const view = render(
    <Scene3DPreview
      artboardHeight={1080}
      artboardWidth={1920}
      layer="behind-2d"
      objects={[first]}
      projectId="test-project"
      scene={{ enabled: true }}
    />,
  );
  await act(async () => vi.advanceTimersByTime(120));

  const second = object("second", "#222222");
  view.rerender(
    <Scene3DPreview
      artboardHeight={1080}
      artboardWidth={1920}
      layer="behind-2d"
      objects={[second]}
      projectId="test-project"
      scene={{ enabled: true }}
    />,
  );
  await act(async () => vi.advanceTimersByTime(120));

  await act(async () => {
    thumbnailMocks.requests
      .get("behind-2d:second:#222222")
      ?.resolve("data:image/png;base64,second");
    await Promise.resolve();
  });
  expect(screen.getByTestId("scene-3d-preview-behind-2d")).toHaveStyle(
    'background-image: url("data:image/png;base64,second")',
  );

  await act(async () => {
    thumbnailMocks.requests
      .get("behind-2d:first:#111111")
      ?.resolve("data:image/png;base64,first");
    await Promise.resolve();
  });
  expect(screen.getByTestId("scene-3d-preview-behind-2d")).toHaveStyle(
    'background-image: url("data:image/png;base64,second")',
  );
  expect(view.container.querySelector("canvas")).toBeNull();
});

it("does not schedule work without a visible object in an enabled scene", async () => {
  const hidden = object("hidden", "#333333");
  hidden.visible = false;
  render(
    <Scene3DPreview
      artboardHeight={1080}
      artboardWidth={1920}
      layer="behind-2d"
      objects={[hidden]}
      projectId="test-project"
      scene={{ enabled: true }}
    />,
  );
  await act(async () => vi.advanceTimersByTime(200));
  expect(thumbnailMocks.requests.size).toBe(0);
  expect(screen.queryByTestId("scene-3d-preview-behind-2d")).toBeNull();
});
