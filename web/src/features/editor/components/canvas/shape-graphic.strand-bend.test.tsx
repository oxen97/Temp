import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { StrandBendVisual } from "@/features/editor/lib/strand-bend";
import type { CanvasElement } from "@/features/editor/store/editor-store";

import { ShapeGraphic } from "./shape-graphic";

const bend: StrandBendVisual = {
  anchor: "top",
  damping: 0.82,
  dx: 60,
  dy: 0,
  influenceRadius: 90,
  maxDisplacement: 100,
  stiffness: 0.45,
};

function element(type: "pen" | "line"): CanvasElement {
  return {
    cornerRadius: 0,
    fill: "transparent",
    height: 120,
    id: "strand",
    locked: false,
    name: "Strand",
    opacity: 100,
    rotation: 0,
    stroke: "#ee3333",
    strokeWidth: 8,
    type,
    visible: true,
    width: 20,
    x: 10,
    y: 10,
    ...(type === "pen"
      ? {
          points: [
            { x: 10, y: 0 },
            { x: 10, y: 120 },
          ],
        }
      : {}),
  };
}

describe("ShapeGraphic strand bending", () => {
  it("renders a bent pen path with a generous hit area", () => {
    const source = element("pen");
    const { container } = render(
      <ShapeGraphic element={source} strandBend={bend} />,
    );
    const visible = container.querySelector(".pen-visible-path")!;
    const hit = container.querySelector(".pen-hit-area")!;
    expect(visible.getAttribute("d")).toContain(" C ");
    expect(hit.getAttribute("d")).toBe(visible.getAttribute("d"));
    expect(hit.getAttribute("stroke-width")).toBe("24");
    expect(source.points).toEqual([
      { x: 10, y: 0 },
      { x: 10, y: 120 },
    ]);
  });

  it("renders a bendable line only when the optional visual is supplied", () => {
    const source = element("line");
    const { container, rerender } = render(<ShapeGraphic element={source} />);
    expect(container.querySelector(".line-shape line")).not.toBeNull();
    expect(container.querySelector(".strand-hit-area")).toBeNull();

    rerender(<ShapeGraphic element={source} strandBend={bend} />);
    expect(container.querySelector(".line-shape line")).toBeNull();
    expect(
      container.querySelector(".strand-visible-path")?.getAttribute("d"),
    ).toContain(" C ");
    expect(container.querySelector(".strand-hit-area")).not.toBeNull();
  });
});
