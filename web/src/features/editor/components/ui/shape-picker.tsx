import { shapeOptions } from "@/features/editor/lib/editor-constants";
import { type ShapeType } from "@/features/editor/store/editor-store";

export function ShapePicker({
  selected,
  onSelect,
}: {
  selected: ShapeType;
  onSelect: (shape: ShapeType) => void;
}) {
  return (
    <div aria-label="Shape picker" className="shape-picker" role="toolbar">
      {shapeOptions.map((shape) => (
        <button
          aria-label={shape.label}
          aria-pressed={selected === shape.id}
          key={shape.id}
          onClick={() => onSelect(shape.id)}
          title={shape.label}
          type="button"
        >
          {shape.id === "pen" ? (
            <span aria-hidden="true" className="shape-picker-pen" />
          ) : null}
        </button>
      ))}
    </div>
  );
}
