import { DesignNumberField } from "@/features/editor/components/ui/design-fields";
import { resizeElementWithinSelection } from "@/features/editor/lib/element-transform";
import type { ElementRect } from "@/features/editor/lib/editor-types";
import type { CanvasElement } from "@/features/editor/store/editor-store";
import { resizeObject3DWithinSelection } from "@/features/editor/three/object-resize";
import type {
  Object3DElement,
  Scene3DSettings,
} from "@/features/editor/three/types";

export function DesignMixedPanel({
  artboardHeight,
  bounds,
  lockRatio,
  objectBounds,
  onCheckpoint,
  onLockRatioChange,
  onUpdateElement,
  onUpdateObject,
  scene,
  selectedElements,
  selectedObjects,
}: {
  artboardHeight: number;
  bounds: ElementRect | null;
  lockRatio: boolean;
  objectBounds: Record<string, ElementRect>;
  onCheckpoint: () => void;
  onLockRatioChange: (locked: boolean) => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onUpdateObject: (id: string, updates: Partial<Object3DElement>) => void;
  scene: Scene3DSettings;
  selectedElements: CanvasElement[];
  selectedObjects: Object3DElement[];
}) {
  const editable =
    selectedElements.every((element) => !element.locked) &&
    selectedObjects.every((object) => !object.locked);
  const canResize =
    editable && selectedObjects.every((object) => Boolean(objectBounds[object.id]));
  if (!bounds) return null;

  const updatePosition = (axis: "x" | "y", value: number) => {
    if (!editable) return;
    const delta = value - bounds[axis];
    if (!delta) return;
    onCheckpoint();
    selectedElements.forEach((element) =>
      onUpdateElement(element.id, { [axis]: element[axis] + delta }),
    );
    selectedObjects.forEach((object) =>
      onUpdateObject(object.id, {
        transform: {
          ...object.transform,
          position: {
            ...object.transform.position,
            [axis]: object.transform.position[axis] + delta,
          },
        },
      }),
    );
  };

  const updateSize = (axis: "width" | "height", value: number) => {
    if (!canResize) return;
    const next = Math.max(8, value);
    const ratio = next / Math.max(1, bounds[axis]);
    const resizedBounds = {
      ...bounds,
      width: axis === "width" || lockRatio ? bounds.width * ratio : bounds.width,
      height:
        axis === "height" || lockRatio ? bounds.height * ratio : bounds.height,
    };
    onCheckpoint();
    selectedElements.forEach((element) =>
      onUpdateElement(
        element.id,
        resizeElementWithinSelection(element, bounds, resizedBounds),
      ),
    );
    selectedObjects.forEach((object) =>
      onUpdateObject(object.id, {
        transform: resizeObject3DWithinSelection({
          artboardHeight,
          initial: object,
          objectBounds: objectBounds[object.id],
          resizedSelectionBounds: resizedBounds,
          scene,
          selectionBounds: bounds,
        }),
      }),
    );
  };

  return (
    <div className="properties-scroll design-properties">
      <section className="property-section">
        <h2 className="panel-heading">Transform</h2>
        <p className="design-3d-selection-count">
          {selectedElements.length + selectedObjects.length} 2D / 3D objects selected
        </p>
        <div className="transform-grid">
          <DesignNumberField
            ariaLabel="Selection X"
            disabled={!editable}
            label="x"
            onChange={(value) => updatePosition("x", value)}
            precision={1}
            value={bounds.x}
          />
          <DesignNumberField
            ariaLabel="Selection Y"
            disabled={!editable}
            label="y"
            onChange={(value) => updatePosition("y", value)}
            precision={1}
            value={bounds.y}
          />
          <DesignNumberField
            ariaLabel="Selection Width"
            disabled={!canResize}
            label="w"
            min={8}
            onChange={(value) => updateSize("width", value)}
            precision={1}
            value={bounds.width}
          />
          <DesignNumberField
            ariaLabel="Selection Height"
            disabled={!canResize}
            label="h"
            min={8}
            onChange={(value) => updateSize("height", value)}
            precision={1}
            value={bounds.height}
          />
        </div>
        <label className="toggle-row design-3d-ratio">
          <span>Lock Ratio</span>
          <input
            aria-label="Lock Ratio"
            checked={lockRatio}
            onChange={(event) => onLockRatioChange(event.target.checked)}
            type="checkbox"
          />
        </label>
        <p className="design-3d-selection-count">
          Select a 3D object alone to edit its X, Y and Z rotation.
        </p>
      </section>
    </div>
  );
}
