import { Box, Eye, EyeOff, Lock, Unlock } from "lucide-react";
import Image from "next/image";
import { memo, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { LayerSymbol } from "@/features/editor/components/ui/layer-symbol";
import { ModelAssetThumbnail } from "@/features/editor/components/ui/model-asset-thumbnail";
import { type CanvasElement } from "@/features/editor/store/editor-store";
import { type Object3DElement } from "@/features/editor/three/types";
import { assetPath } from "@/lib/asset-path";

/**
 * Callbacks the editor shell provides to every layer row. They are created
 * with `useStableHandlers`, so their identity never changes and a row only
 * re-renders when its own element, selection or rename state changes.
 */
export type LayerRowHandlers = {
  /** 2D row click (with or without Shift). */
  onSelectElementLayer: (element: CanvasElement, shiftKey: boolean) => void;
  /** 3D row click (with or without Shift). */
  onSelectObjectLayer: (object: Object3DElement, shiftKey: boolean) => void;
  /** 3D row Enter/Space, after `preventDefault()`. */
  onActivateObjectLayer: (object: Object3DElement) => void;
  onStartRename: (id: string, name: string) => void;
  onRenameDraftChange: (value: string) => void;
  onFinishElementRename: (element: CanvasElement, cancelled: boolean) => void;
  onFinishObjectRename: (object: Object3DElement, cancelled: boolean) => void;
  onToggleLocked: (id: string) => void;
  onToggleVisible: (id: string) => void;
};

function handleRenameInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
  if (event.key === "Enter") {
    event.preventDefault();
    event.currentTarget.blur();
  }
  if (event.key === "Escape") {
    event.preventDefault();
    event.currentTarget.dataset.cancel = "true";
    event.currentTarget.blur();
  }
}

function LayerControls({
  hasSound,
  id,
  locked,
  name,
  onToggleLocked,
  onToggleVisible,
  visible,
}: {
  hasSound: boolean;
  id: string;
  locked: boolean;
  name: string;
  onToggleLocked: (id: string) => void;
  onToggleVisible: (id: string) => void;
  visible: boolean;
}) {
  return (
    <span className="layer-controls">
      {hasSound ? (
        <Image
          alt=""
          aria-hidden="true"
          className="layer-sound-indicator"
          height={10}
          src={assetPath("/figma/sound/layer-sound.svg")}
          width={8}
        />
      ) : null}
      <button
        aria-label={`${locked ? "Unlock" : "Lock"} ${name}`}
        className={`layer-action ${locked ? "is-persistent" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          onToggleLocked(id);
        }}
        type="button"
      >
        {locked ? <Lock size={11} /> : <Unlock size={11} />}
      </button>
      <button
        aria-label={`${visible ? "Hide" : "Show"} ${name}`}
        className={`layer-action ${!visible ? "is-persistent" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          onToggleVisible(id);
        }}
        type="button"
      >
        {visible ? <Eye size={12} /> : <EyeOff size={12} />}
      </button>
    </span>
  );
}

export const ElementLayerRow = memo(function ElementLayerRow({
  editing,
  element,
  handlers,
  mediaPreviewSources,
  nameDraft,
  selected,
}: {
  editing: boolean;
  element: CanvasElement;
  handlers: LayerRowHandlers;
  mediaPreviewSources: Record<string, string | undefined>;
  /** The rename draft; only meaningful while `editing` is true. */
  nameDraft: string;
  selected: boolean;
}) {
  const hasSound =
    element.interactionSounds?.some((sound) => sound.assets.length > 0) ??
    false;
  return (
    <div
      aria-selected={selected}
      className="layer-row"
      onClick={(event) => {
        handlers.onSelectElementLayer(element, event.shiftKey);
      }}
      role="option"
      tabIndex={0}
    >
      <span
        className={`layer-symbol ${element.pathfinder ? "symbol-pathfinder" : `symbol-${element.type}`}`}
        data-pathfinder-operation={element.pathfinder?.operation ?? undefined}
      >
        <LayerSymbol element={element} />
        {(element.type === "image" || element.type === "video") &&
        element.src ? (
          <span
            aria-hidden="true"
            className={`layer-image-preview ${element.type === "video" ? "layer-video-preview" : ""}`}
            style={{
              backgroundImage: mediaPreviewSources[element.src]
                ? `url(${mediaPreviewSources[element.src]})`
                : element.src in mediaPreviewSources
                  ? "none"
                  : element.type === "image"
                    ? `url(${element.src})`
                    : "none",
            }}
          />
        ) : null}
      </span>
      {editing ? (
        <input
          aria-label={`Rename ${element.name}`}
          autoFocus
          className="inline-name-input"
          data-cancel="false"
          onBlur={(event) => {
            handlers.onFinishElementRename(
              element,
              event.currentTarget.dataset.cancel === "true",
            );
          }}
          onChange={(event) => handlers.onRenameDraftChange(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleRenameInputKeyDown}
          onPointerDown={(event) => event.stopPropagation()}
          type="text"
          value={nameDraft}
        />
      ) : (
        <span
          className="layer-name"
          onDoubleClick={(event) => {
            event.stopPropagation();
            handlers.onStartRename(element.id, element.name);
          }}
        >
          {element.name}
        </span>
      )}
      <LayerControls
        hasSound={hasSound}
        id={element.id}
        locked={element.locked}
        name={element.name}
        onToggleLocked={handlers.onToggleLocked}
        onToggleVisible={handlers.onToggleVisible}
        visible={element.visible}
      />
    </div>
  );
});

export const ObjectLayerRow = memo(function ObjectLayerRow({
  editing,
  handlers,
  nameDraft,
  object,
  projectId,
  selected,
}: {
  editing: boolean;
  handlers: LayerRowHandlers;
  /** The rename draft; only meaningful while `editing` is true. */
  nameDraft: string;
  object: Object3DElement;
  projectId: string;
  selected: boolean;
}) {
  const hasSound =
    object.interactionSounds?.some((sound) => sound.assets.length > 0) ?? false;
  return (
    <div
      aria-selected={selected}
      className="layer-row"
      onClick={(event) => {
        handlers.onSelectObjectLayer(object, event.shiftKey);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        handlers.onActivateObjectLayer(object);
      }}
      role="option"
      tabIndex={0}
    >
      <span className="layer-symbol symbol-object3d">
        {object.source.kind === "asset" ? (
          <ModelAssetThumbnail
            assetId={object.source.assetId}
            projectId={projectId}
          />
        ) : (
          <Box aria-hidden="true" size={15} strokeWidth={1} />
        )}
      </span>
      {editing ? (
        <input
          aria-label={`Rename ${object.name}`}
          autoFocus
          className="inline-name-input"
          data-cancel="false"
          onBlur={(event) => {
            handlers.onFinishObjectRename(
              object,
              event.currentTarget.dataset.cancel === "true",
            );
          }}
          onChange={(event) => handlers.onRenameDraftChange(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleRenameInputKeyDown}
          onPointerDown={(event) => event.stopPropagation()}
          type="text"
          value={nameDraft}
        />
      ) : (
        <span
          className="layer-name"
          onDoubleClick={(event) => {
            event.stopPropagation();
            handlers.onStartRename(object.id, object.name);
          }}
        >
          {object.name}
        </span>
      )}
      <LayerControls
        hasSound={hasSound}
        id={object.id}
        locked={object.locked}
        name={object.name}
        onToggleLocked={handlers.onToggleLocked}
        onToggleVisible={handlers.onToggleVisible}
        visible={object.visible}
      />
    </div>
  );
});
