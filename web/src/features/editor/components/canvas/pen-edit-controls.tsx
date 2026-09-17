import { type PointerEvent as ReactPointerEvent } from "react";

import {
  type VectorHandleRef,
  type VectorPointRef,
} from "@/features/editor/lib/editor-types";
import {
  penHandleLineStyle,
  vectorHandleKey,
  vectorPathsForElement,
  vectorPointKey,
} from "@/features/editor/lib/vector-path";
import { type CanvasElement } from "@/features/editor/store/editor-store";

export function PenEditControls({
  element,
  onHandlePointerDown,
  onNodePointerDown,
  selectedHandles,
  selectedNodes,
}: {
  element: CanvasElement;
  onHandlePointerDown: (
    event: ReactPointerEvent<HTMLButtonElement>,
    element: CanvasElement,
    pathIndex: number,
    nodeIndex: number,
    handle: "in" | "out",
  ) => void;
  onNodePointerDown: (
    event: ReactPointerEvent<HTMLButtonElement>,
    element: CanvasElement,
    pathIndex: number,
    nodeIndex: number,
  ) => void;
  selectedHandles: VectorHandleRef[];
  selectedNodes: VectorPointRef[];
}) {
  const paths = vectorPathsForElement(element);
  return (
    <div
      aria-label={`Edit nodes for ${element.name}`}
      className="pen-edit-controls"
    >
      {paths.map((path, pathIndex) =>
        path.points.map((point, nodeIndex) => {
          const nodeRef = { pathIndex, nodeIndex };
          const nodeLabel =
            pathIndex === 0
              ? `node ${nodeIndex + 1}`
              : `path ${pathIndex + 1} node ${nodeIndex + 1}`;
          const nodeSelected = selectedNodes.some(
            (selected) => vectorPointKey(selected) === vectorPointKey(nodeRef),
          );
          return (
            <span
              className="pen-edit-node-group"
              key={`${element.id}-${pathIndex}-${nodeIndex}`}
            >
              {point.handleIn ? (
                <>
                  <span
                    aria-hidden="true"
                    className="pen-handle-line"
                    style={penHandleLineStyle(point, point.handleIn)}
                  />
                  <button
                    aria-label={`Adjust ${element.name} ${nodeLabel} incoming handle`}
                    className={`pen-handle ${selectedHandles.some((selected) => vectorHandleKey(selected) === vectorHandleKey({ ...nodeRef, handle: "in" })) ? "is-selected" : ""}`}
                    onPointerDown={(event) =>
                      onHandlePointerDown(
                        event,
                        element,
                        pathIndex,
                        nodeIndex,
                        "in",
                      )
                    }
                    style={{ left: point.handleIn.x, top: point.handleIn.y }}
                    type="button"
                  />
                </>
              ) : null}
              {point.handleOut ? (
                <>
                  <span
                    aria-hidden="true"
                    className="pen-handle-line"
                    style={penHandleLineStyle(point, point.handleOut)}
                  />
                  <button
                    aria-label={`Adjust ${element.name} ${nodeLabel} outgoing handle`}
                    className={`pen-handle ${selectedHandles.some((selected) => vectorHandleKey(selected) === vectorHandleKey({ ...nodeRef, handle: "out" })) ? "is-selected" : ""}`}
                    onPointerDown={(event) =>
                      onHandlePointerDown(
                        event,
                        element,
                        pathIndex,
                        nodeIndex,
                        "out",
                      )
                    }
                    style={{ left: point.handleOut.x, top: point.handleOut.y }}
                    type="button"
                  />
                </>
              ) : null}
              <button
                aria-label={`Move ${element.name} ${nodeLabel}`}
                className={`pen-node ${nodeSelected ? "is-selected" : ""}`}
                onPointerDown={(event) =>
                  onNodePointerDown(event, element, pathIndex, nodeIndex)
                }
                style={{ left: point.x, top: point.y }}
                type="button"
              />
            </span>
          );
        }),
      )}
    </div>
  );
}
