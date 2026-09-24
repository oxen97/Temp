import { type ComponentProps } from "react";

import { Artboard3DScene } from "@/features/editor/components/canvas/artboard-3d-scene";
import { useNavigatorViewport } from "@/features/editor/hooks/use-navigator-viewport";
import { type NavigatorViewportStore } from "@/features/editor/lib/navigator-viewport-store";

/**
 * The editor's 3D scene with its `viewport` read from the shell's viewport
 * store, so a viewport change re-renders the 3D scene without re-rendering the
 * whole editor shell. All other props pass through unchanged.
 */
export function Artboard3DSceneWithViewport({
  viewportStore,
  ...sceneProps
}: Omit<ComponentProps<typeof Artboard3DScene>, "viewport"> & {
  viewportStore: NavigatorViewportStore;
}) {
  const viewport = useNavigatorViewport(viewportStore);
  return <Artboard3DScene {...sceneProps} viewport={viewport} />;
}
