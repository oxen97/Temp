import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { cloneModelAssetScene } from "@/features/editor/three/model-assets";
import { ModelAssetThumbnail } from "./model-asset-thumbnail";

vi.mock("@/features/editor/three/model-assets", () => ({
  cloneModelAssetScene: vi.fn(),
}));

const { renderSpy } = vi.hoisted(() => ({ renderSpy: vi.fn() }));
vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return {
    ...actual,
    WebGLRenderer: class {
      renderLists = { dispose: vi.fn() };
      dispose = vi.fn();
      forceContextLoss = vi.fn();
      render = renderSpy;
      setPixelRatio = vi.fn();
      setSize = vi.fn();
    },
  };
});

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    "data:image/png;base64,preview",
  );
  vi.mocked(cloneModelAssetScene).mockImplementation(
    async () => new Mesh(new BoxGeometry(), new MeshStandardMaterial()),
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.mocked(cloneModelAssetScene).mockReset();
  renderSpy.mockReset();
});

it("renders an actual model preview and reuses it when the tile remounts", async () => {
  const props = { assetId: "thumbnail-test-cube", projectId: "test-project" };
  const first = render(<ModelAssetThumbnail {...props} />);

  await waitFor(() =>
    expect(screen.getByTestId("model-thumbnail")).toHaveAttribute(
      "data-preview-state",
      "ready",
    ),
  );
  expect(screen.getByTestId("model-thumbnail")).toHaveStyle(
    'background-image: url("data:image/png;base64,preview")',
  );
  expect(renderSpy).toHaveBeenCalledOnce();
  first.unmount();

  render(<ModelAssetThumbnail {...props} />);
  expect(screen.getByTestId("model-thumbnail")).toHaveAttribute(
    "data-preview-state",
    "ready",
  );
  expect(cloneModelAssetScene).toHaveBeenCalledOnce();
});

it("keeps an icon fallback for a model with no renderable bounds", async () => {
  vi.mocked(cloneModelAssetScene).mockResolvedValueOnce(new Group());
  render(
    <ModelAssetThumbnail
      assetId="thumbnail-test-empty"
      projectId="test-project"
    />,
  );

  await waitFor(() => expect(cloneModelAssetScene).toHaveBeenCalledOnce());
  expect(screen.getByTestId("model-thumbnail")).toHaveAttribute(
    "data-preview-state",
    "fallback",
  );
  expect(renderSpy).not.toHaveBeenCalled();
});
