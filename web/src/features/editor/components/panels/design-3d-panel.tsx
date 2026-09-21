import { DesignColorField, DesignNumberField, DesignRange } from "@/features/editor/components/ui/design-fields";
import type { Object3DElement, Vector3Value } from "@/features/editor/three/types";

type Axis = keyof Vector3Value;

export function Design3DPanel({
  lockRatio,
  onCheckpoint,
  onLockRatioChange,
  onUpdateObject,
  selectedObjects,
}: {
  lockRatio: boolean;
  onCheckpoint: () => void;
  onLockRatioChange: (locked: boolean) => void;
  onUpdateObject: (id: string, updates: Partial<Object3DElement>) => void;
  selectedObjects: Object3DElement[];
}) {
  const selected = selectedObjects[0];
  if (!selected) return null;
  const editable = selectedObjects.every((object) => !object.locked);
  const single = selectedObjects.length === 1;

  const updatePosition = (axis: Axis, value: number) => {
    if (!editable) return;
    const delta = value - selected.transform.position[axis];
    if (!delta) return;
    onCheckpoint();
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

  const updateSize = (axis: Axis, value: number) => {
    if (!editable || !single) return;
    const current =
      selected.dimensions[
        axis === "x" ? "width" : axis === "y" ? "height" : "depth"
      ] * Math.abs(selected.transform.scale[axis]);
    const ratio = Math.max(1, value) / Math.max(0.001, current);
    if (Math.abs(ratio - 1) < 0.0001) return;
    const scale = { ...selected.transform.scale };
    if (lockRatio) {
      scale.x *= ratio;
      scale.y *= ratio;
      scale.z *= ratio;
    } else {
      scale[axis] *= ratio;
    }
    onCheckpoint();
    onUpdateObject(selected.id, {
      transform: { ...selected.transform, scale },
    });
  };

  const updateRotation = (axis: Axis, value: number) => {
    if (!editable) return;
    const delta = value - selected.transform.rotation[axis];
    if (!delta) return;
    onCheckpoint();
    selectedObjects.forEach((object) =>
      onUpdateObject(object.id, {
        transform: {
          ...object.transform,
          rotation: {
            ...object.transform.rotation,
            [axis]: object.transform.rotation[axis] + delta,
          },
        },
      }),
    );
  };

  const updateMaterial = (
    material: Partial<Object3DElement["material"]>,
    recordHistory = true,
  ) => {
    if (!editable) return;
    if (recordHistory) onCheckpoint();
    selectedObjects.forEach((object) =>
      onUpdateObject(object.id, {
        material: { ...object.material, ...material },
      }),
    );
  };

  return (
    <div className="properties-scroll design-properties design-3d-properties">
      <section className="property-section">
        <h2 className="panel-heading">Transform</h2>
        {selectedObjects.length > 1 ? (
          <p className="design-3d-selection-count">
            {selectedObjects.length} 3D objects selected
          </p>
        ) : null}
        <span className="design-3d-group-label">Position</span>
        <div className="design-3d-grid">
          {(["x", "y", "z"] as Axis[]).map((axis) => (
            <DesignNumberField
              ariaLabel={`Position ${axis.toUpperCase()}`}
              disabled={!editable}
              key={axis}
              label={axis}
              onChange={(value) => updatePosition(axis, value)}
              precision={1}
              value={selected.transform.position[axis]}
            />
          ))}
        </div>
        <span className="design-3d-group-label">Size</span>
        <div className="design-3d-grid">
          {([
            ["x", "width", "w"],
            ["y", "height", "h"],
            ["z", "depth", "d"],
          ] as const).map(([axis, dimension, label]) => (
            <DesignNumberField
              ariaLabel={`Size ${label.toUpperCase()}`}
              disabled={!editable || !single}
              key={axis}
              label={label}
              min={1}
              onChange={(value) => updateSize(axis, value)}
              precision={1}
              value={
                selected.dimensions[dimension] *
                Math.abs(selected.transform.scale[axis])
              }
            />
          ))}
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
        <span className="design-3d-group-label">Rotation</span>
        <div className="design-3d-grid">
          {(["x", "y", "z"] as Axis[]).map((axis) => (
            <DesignNumberField
              ariaLabel={`Rotation ${axis.toUpperCase()}`}
              disabled={!editable}
              key={axis}
              label={axis}
              onChange={(value) => updateRotation(axis, value)}
              precision={1}
              unit="°"
              value={selected.transform.rotation[axis]}
            />
          ))}
        </div>
      </section>

      <section className="property-section design-3d-material">
        <h2 className="panel-heading">Material</h2>
        {selected.source.kind === "asset" ? (
          <label className="toggle-row design-3d-source-material">
            <span>Use Model Materials</span>
            <input
              aria-label="Use Model Materials"
              checked={selected.material.useSourceMaterial}
              disabled={!editable}
              onChange={(event) =>
                updateMaterial({ useSourceMaterial: event.target.checked })
              }
              type="checkbox"
            />
          </label>
        ) : null}
        <div className="appearance-row paint-row">
          <span className="property-label">Color</span>
          <div className="paint-control design-3d-color-control">
            <DesignColorField
              disabled={!editable || selected.material.useSourceMaterial}
              label="3D Color"
              onBegin={onCheckpoint}
              onChange={(color) => updateMaterial({ color }, false)}
              value={selected.material.color}
            />
          </div>
        </div>
        {([
          ["Opacity", "opacity"],
          ["Metalness", "metalness"],
          ["Roughness", "roughness"],
        ] as const).map(([label, key]) => (
          <div className="appearance-row opacity-row" key={key}>
            <span className="property-label">{label}</span>
            <DesignRange
              ariaLabel={`3D ${label}`}
              disabled={!editable || selected.material.useSourceMaterial}
              max={key === "opacity" ? 100 : 1}
              min={0}
              onBegin={onCheckpoint}
              onChange={(value) => updateMaterial({ [key]: value }, false)}
              step={key === "opacity" ? 1 : 0.01}
              value={selected.material[key]}
            />
            <DesignNumberField
              ariaLabel={`3D ${label} value`}
              disabled={!editable || selected.material.useSourceMaterial}
              label=""
              max={key === "opacity" ? 100 : 1}
              min={0}
              onChange={(value) => updateMaterial({ [key]: value })}
              precision={key === "opacity" ? 0 : 2}
              unit={key === "opacity" ? "%" : ""}
              value={selected.material[key]}
            />
          </div>
        ))}
      </section>
    </div>
  );
}
