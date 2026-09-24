import {
  memo,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { PenEditControls } from "@/features/editor/components/canvas/pen-edit-controls";
import { SelectionOutlineSvg } from "@/features/editor/components/canvas/selection-outline-svg";
import { ShapeGraphic } from "@/features/editor/components/canvas/shape-graphic";
import {
  type ImageResizeHandle,
  type ResizeHandle,
  type VectorHandleRef,
  type VectorPointRef,
} from "@/features/editor/lib/editor-types";
import { textStyleForElement } from "@/features/editor/lib/element-style";
import { type CanvasElement } from "@/features/editor/store/editor-store";

/**
 * Callbacks the editor shell provides to every canvas element. They are
 * created with `useStableHandlers`, so their identity never changes and an
 * element only re-renders when its own props change.
 */
export type CanvasElementHandlers = {
  onElementClick: (
    event: ReactMouseEvent<HTMLDivElement>,
    element: CanvasElement,
  ) => void;
  onElementDoubleClick: (
    event: ReactMouseEvent<HTMLDivElement>,
    element: CanvasElement,
  ) => void;
  onElementPointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    element: CanvasElement,
  ) => void;
  /** Text editing finished: checkpoint, save the text, leave edit mode. */
  onCommitText: (elementId: string, updates: Partial<CanvasElement>) => void;
  onTextEditorRef: (elementId: string, node: HTMLDivElement | null) => void;
  onPenHandlePointerDown: (
    event: ReactPointerEvent<HTMLButtonElement>,
    element: CanvasElement,
    pathIndex: number,
    nodeIndex: number,
    handle: "in" | "out",
  ) => void;
  onPenNodePointerDown: (
    event: ReactPointerEvent<HTMLButtonElement>,
    element: CanvasElement,
    pathIndex: number,
    nodeIndex: number,
  ) => void;
  onLineEndpointPointerDown: (
    event: ReactPointerEvent<HTMLButtonElement>,
    element: CanvasElement,
    endpoint: "start" | "end",
  ) => void;
  onResizePointerDown: (
    event: ReactPointerEvent<HTMLButtonElement>,
    element: CanvasElement,
    handle: ResizeHandle,
  ) => void;
  onImageCropPointerDown: (
    event: ReactPointerEvent<HTMLButtonElement>,
    element: CanvasElement,
    handle: ImageResizeHandle,
  ) => void;
};

/**
 * One 2D element on the editor canvas, with its selection outline, pen node
 * controls and resize/crop/endpoint handles. Memoized: the store keeps
 * unchanged elements as the same objects, so when the shell re-renders, only
 * elements whose own props changed are rendered again.
 */
export const CanvasElementView = memo(function CanvasElementView({
  editingText,
  element,
  handlers,
  nodeEditing,
  selected,
  selectedPenHandles,
  selectedPenNodes,
  selectionControlScale,
  selectionOutlineWidth,
  showSelectionChrome,
  singleSelection,
}: {
  /** This text element is being edited (`contentEditable`). */
  editingText: boolean;
  element: CanvasElement;
  handlers: CanvasElementHandlers;
  /** This pen element is in node-edit mode. */
  nodeEditing: boolean;
  selected: boolean;
  /** Only read while `nodeEditing` is true. */
  selectedPenHandles: VectorHandleRef[];
  /** Only read while `nodeEditing` is true. */
  selectedPenNodes: VectorPointRef[];
  selectionControlScale: number;
  selectionOutlineWidth: number;
  /** Selected and not shown as part of a group selection outline. */
  showSelectionChrome: boolean;
  /** Exactly one 2D element and no 3D object is selected. */
  singleSelection: boolean;
}) {
  const registerTextEditor = useCallback(
    (node: HTMLDivElement | null) => handlers.onTextEditorRef(element.id, node),
    [element.id, handlers],
  );
  const selectionLineWidth = selectionOutlineWidth;
  const vectorStrokeOutset =
    element.type !== "image" &&
    element.type !== "video" &&
    element.type !== "text" &&
    element.type !== "line" &&
    element.strokeStyle !== "none" &&
    element.stroke !== "transparent" &&
    element.strokeWidth > 0 &&
    (element.strokeOpacity ?? 100) > 0
      ? (element.strokeWidth * selectionControlScale) / 2
      : 0;
  const selectionHandleOutset =
    element.type === "image" || element.type === "video"
      ? 0
      : vectorStrokeOutset + selectionLineWidth / 2;
  const elementStyle = {
    height: `${element.height}px`,
    left: `${element.x}px`,
    opacity: element.opacity / 100,
    top: `${element.y}px`,
    transform: `rotate(${element.rotation}deg)`,
    transformOrigin: "center",
    width: `${element.width}px`,
    "--selection-handle-outset": `${selectionHandleOutset}px`,
    "--selection-outline-width": `${selectionLineWidth}px`,
  };
  return (
    <div
      aria-label={element.name}
      className={`canvas-element element-${element.type} ${element.pathfinder ? "is-pathfinder" : ""} ${showSelectionChrome ? "is-selected" : ""} ${element.locked ? "is-locked" : ""}`}
      data-element-id={element.id}
      onDoubleClick={(event) => handlers.onElementDoubleClick(event, element)}
      onClick={(event) => handlers.onElementClick(event, element)}
      onPointerDown={(event) => handlers.onElementPointerDown(event, element)}
      style={elementStyle}
    >
      {element.type === "text" ? (
        <div
          className="text-shape"
          contentEditable={editingText}
          data-text-resize-mode={element.textResizeMode ?? "fixed"}
          onBlur={(event) => {
            const editor = event.currentTarget;
            const text = editor.innerText ?? editor.textContent ?? "";
            const parent = editor.closest<HTMLElement>(".canvas-element");
            const sizeUpdates =
              element.textResizeMode === "auto-width" && parent
                ? {
                    height: Math.max(
                      1,
                      Number.parseFloat(parent.style.height) || element.height,
                    ),
                    width: Math.max(
                      1,
                      Number.parseFloat(parent.style.width) || element.width,
                    ),
                  }
                : {};
            handlers.onCommitText(element.id, { text, ...sizeUpdates });
          }}
          onInput={(event) => {
            if (element.textResizeMode !== "auto-width") return;
            const editor = event.currentTarget;
            const parent = editor.closest<HTMLElement>(".canvas-element");
            if (!parent) return;
            const fontSize = element.fontSize ?? 24;
            const lineHeight =
              typeof element.lineHeight === "number"
                ? element.lineHeight * fontSize
                : fontSize * 1.2;
            parent.style.width = `${Math.max(1, Math.ceil(editor.scrollWidth + 1))}px`;
            parent.style.height = `${Math.max(lineHeight, Math.ceil(editor.scrollHeight))}px`;
          }}
          onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
            if (event.key === "Escape") event.currentTarget.blur();
          }}
          ref={registerTextEditor}
          style={textStyleForElement(element)}
          suppressContentEditableWarning
        >
          {element.text}
        </div>
      ) : (
        <ShapeGraphic element={element} />
      )}

      {showSelectionChrome && element.type !== "line" ? (
        <SelectionOutlineSvg
          centerOutset={selectionHandleOutset}
          controlScale={selectionControlScale}
          height={element.height}
          lineWidth={selectionLineWidth}
          showCornerHandles={!nodeEditing && singleSelection && !element.locked}
          strokePlacement={
            element.type === "image" || element.type === "video"
              ? "inside"
              : "center"
          }
          width={element.width}
        />
      ) : null}

      {nodeEditing && element.type === "pen" ? (
        <PenEditControls
          element={element}
          onHandlePointerDown={handlers.onPenHandlePointerDown}
          onNodePointerDown={handlers.onPenNodePointerDown}
          selectedHandles={selectedPenHandles}
          selectedNodes={selectedPenNodes}
        />
      ) : null}

      {!nodeEditing && singleSelection && selected && !element.locked ? (
        <>
          {element.type === "line" ? (
            (["start", "end"] as const).map((endpoint) => (
              <button
                aria-label={`Adjust ${element.name} ${endpoint}`}
                className={`line-endpoint endpoint-${endpoint}`}
                key={endpoint}
                onPointerDown={(event) =>
                  handlers.onLineEndpointPointerDown(event, element, endpoint)
                }
                type="button"
              />
            ))
          ) : (
            <>
              {(["nw", "ne", "se", "sw"] as ResizeHandle[]).map((handle) => (
                <button
                  aria-label={`Resize ${handle}`}
                  className={`resize-handle handle-${handle}`}
                  key={handle}
                  onPointerDown={(event) =>
                    handlers.onResizePointerDown(event, element, handle)
                  }
                  type="button"
                />
              ))}
              {element.type === "image"
                ? (["n", "e", "s", "w"] as ImageResizeHandle[]).map(
                    (handle) => (
                      <button
                        aria-label={`Crop image ${handle}`}
                        className={`resize-handle image-edge-handle image-edge-handle-${handle}`}
                        key={handle}
                        onPointerDown={(event) =>
                          handlers.onImageCropPointerDown(
                            event,
                            element,
                            handle,
                          )
                        }
                        type="button"
                      />
                    ),
                  )
                : null}
            </>
          )}
        </>
      ) : null}
    </div>
  );
});
