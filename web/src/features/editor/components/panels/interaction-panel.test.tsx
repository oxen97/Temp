import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { createDefaultInteraction, type InteractionDefinition } from "@/features/editor/lib/interaction-model";
import { createSceneLogicRule, type SceneLogicRule } from "@/features/editor/lib/scene-logic";
import { InteractionPanel } from "./interaction-panel";

afterEach(cleanup);

function choose(ariaLabel: string, option: string) {
  fireEvent.click(screen.getByRole("button", { name: ariaLabel }));
  fireEvent.click(screen.getByRole("option", { name: option }));
}

function openDropdown(ariaLabel: string) {
  fireEvent.click(screen.getByRole("button", { name: ariaLabel }));
}

function renderPrimitive3DPanel() {
  return render(
    <InteractionPanel
      elements={[
        {
          id: "cube",
          name: "Cube 1",
          sourceKind: "primitive",
          type: "object3d",
        },
      ]}
      selectedElementIds={["cube"]}
      selectedName="Cube 1"
      selectedTypes={["object3d"]}
    />,
  );
}

function renderModel3DPanel() {
  return render(
    <InteractionPanel
      elements={[
        {
          animationNames: ["Idle", "Walk"],
          assetId: "robot-glb",
          boneNames: ["Spine"],
          id: "robot",
          jointNames: ["Shoulder"],
          materialNames: ["Body", "Eyes"],
          meshFaceGroupNames: ["BodyMesh · Face Group 1"],
          meshNames: ["BodyMesh"],
          morphTargetNames: ["Smile", "Blink"],
          name: "Robot",
          sourceKind: "asset",
          type: "object3d",
        },
      ]}
      selectedElementIds={["robot"]}
      selectedName="Robot"
      selectedTypes={["object3d"]}
    />,
  );
}

describe("InteractionPanel conditional UI", () => {
  it("authors a scene-wide pointer trail with glow and decay controls", () => {
    let saved = createDefaultInteraction({ id: "trail" });
    function Harness() {
      const [interaction, setInteraction] = useState(saved);
      saved = interaction;
      return (
        <InteractionPanel
          elements={[{ id: "emitter", name: "Trail area", type: "rectangle" }]}
          interactionsByElement={{ emitter: [interaction] }}
          onUpdateInteraction={(_, __, updates) => setInteraction((current) => ({ ...current, ...updates }))}
          selectedElementIds={["emitter"]}
          selectedName="Trail area"
          selectedTypes={["rectangle"]}
        />
      );
    }
    render(<Harness />);
    choose("Trigger", "Drag");
    choose("Effect", "Emit Pointer Trail");
    expect(saved).toMatchObject({ effect: "pointer-trail", triggerArea: "entire-artwork" });
    expect(screen.getByRole("button", { name: "Mapping response mode" })).toHaveTextContent("Follow input");
    expect(screen.queryByRole("spinbutton", { name: "Threshold" })).toBeNull();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Pointer trail blur" }), { target: { value: "18" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Pointer trail colors" }), { target: { value: "#ffe082,#ffffff" } });
    choose("Pointer trail blend mode", "Lighter");
    expect(saved).toMatchObject({ trailBlur: 18, trailColors: "#ffe082,#ffffff", trailBlendMode: "lighter" });
    expect(screen.getByRole("spinbutton", { name: "Pointer trail lifespan" })).toBeTruthy();
    expect(screen.getByRole("spinbutton", { name: "Pointer trail maximum marks" })).toBeTruthy();
    const fadeDuration = screen.getByRole("spinbutton", { name: "Pointer trail fade-out duration" });
    expect(fadeDuration).toHaveValue(0.5);
    fireEvent.change(fadeDuration, { target: { value: "1.2" } });
    expect(saved.trailFadeOutDuration).toBe(1.2);
    fireEvent.change(fadeDuration, { target: { value: "0" } });
    expect(saved.trailFadeOutDuration).toBe(0);
    expect(screen.getByText("Fade older marks when Max. marks is reached. 0 s removes them immediately.")).toBeTruthy();
  });

  it("selects an element group to spawn at the click position", () => {
    let saved = createDefaultInteraction({ id: "spawn" });
    function Harness() {
      const [interaction, setInteraction] = useState(saved);
      saved = interaction;
      return (
        <InteractionPanel
          elements={[
            { id: "emitter", name: "Spawn area", type: "rectangle" },
            { id: "iris", groupId: "eye-group", name: "Iris", type: "circle" },
            { id: "pupil", groupId: "eye-group", name: "Pupil", type: "circle" },
          ]}
          interactionsByElement={{ emitter: [interaction] }}
          onUpdateInteraction={(_, __, updates) => setInteraction((current) => ({ ...current, ...updates }))}
          selectedElementIds={["emitter"]}
          selectedName="Spawn area"
          selectedTypes={["rectangle"]}
        />
      );
    }
    render(<Harness />);
    choose("Effect", "Spawn Instance");
    expect(saved).toMatchObject({ effect: "spawn-instance", spawnSourceId: "eye-group", triggerArea: "entire-artwork" });
    expect(screen.getByText("At pointer position")).toBeTruthy();
    choose("Spawn source template", "Iris (circle)");
    fireEvent.change(screen.getByRole("spinbutton", { name: "Spawn maximum instances" }), { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: "Inherit template interactions" }));
    expect(saved).toMatchObject({ spawnSourceId: "iris", spawnMaxCount: 7, spawnInheritInteractions: false });
  });

  it("exposes wave controls for selected pen paths", () => {
    let saved = createDefaultInteraction({ id: "wave" });
    function Harness() {
      const [interaction, setInteraction] = useState(saved);
      saved = interaction;
      return (
        <InteractionPanel
          elements={[
            { id: "path-a", name: "Path A", type: "pen" },
            { id: "path-b", name: "Path B", type: "pen" },
          ]}
          interactionsByElement={{ "path-a": [interaction] }}
          onUpdateInteraction={(_, __, updates) => setInteraction((current) => ({ ...current, ...updates }))}
          selectedElementIds={["path-a", "path-b"]}
          selectedName="Paths"
          selectedTypes={["pen", "pen"]}
        />
      );
    }
    render(<Harness />);
    choose("Trigger", "Pointer Move / Touch Move");
    choose("Effect", "Wave / Curve Deform");
    expect(saved.waveTargetIds).toEqual(["path-b"]);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Wave amplitude" }), { target: { value: "14" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Wave phase spread" }), { target: { value: "42" } });
    expect(saved).toMatchObject({ effect: "wave-deform", waveAmplitude: 14, wavePhaseSpread: 42 });
    expect(screen.getByRole("spinbutton", { name: "Wave pointer X influence" })).toBeTruthy();
    expect(screen.getByRole("spinbutton", { name: "Wave speed" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Wave target: Path B" }));
    expect(saved.waveTargetIds).toEqual([]);
  });

  it("offers a logic-only click without visual motion", () => {
    render(<InteractionPanel selectedName="Next Scene" selectedTypes={["rectangle"]} />);
    choose("Effect", "Emit Event (Logic Only)");
    expect(screen.getByText("Go to Scene")).toBeTruthy();
    expect(screen.queryByText("4. HOW")).toBeNull();
  });

  it("edits the same direct scene rule shown in Logic", () => {
    let savedRules: SceneLogicRule[] = [createSceneLogicRule({
      id: "next-route",
      objectId: "next-button",
      interactionId: "next-click",
      targetPageId: "scene-2",
    })];
    const interaction = createDefaultInteraction({
      effect: "emit-event",
      id: "next-click",
      trigger: "click-tap",
    });
    function Harness() {
      const [rules, setRules] = useState(savedRules);
      savedRules = rules;
      return (
        <InteractionPanel
          elements={[{ id: "next-button", name: "Next Scene", type: "rectangle" }]}
          interactionsByElement={{ "next-button": [interaction] }}
          onSceneLogicRulesChange={setRules}
          sceneLogicRules={rules}
          scenePages={[
            { id: "scene-1", name: "Scene 1" },
            { id: "scene-2", name: "Scene 2" },
            { id: "scene-3", name: "Scene 3" },
          ]}
          selectedElementIds={["next-button"]}
          selectedName="Next Scene"
          selectedTypes={["rectangle"]}
        />
      );
    }
    render(<Harness />);
    expect(screen.getByRole("button", { name: "Interaction target scene" })).toHaveTextContent("Scene 2");
    choose("Interaction target scene", "Scene 3");
    expect(savedRules).toMatchObject([{ id: "next-route", targetPageId: "scene-3" }]);
    choose("Interaction target scene", "Choose scene…");
    expect(savedRules).toEqual([]);
  });

  it("authors a selected strand through canonical interaction callbacks", () => {
    let saved: InteractionDefinition[] = [];
    function Harness() {
      const [interactions, setInteractions] = useState<InteractionDefinition[]>([]);
      saved = interactions;
      return (
        <InteractionPanel
          elements={[{ id: "strand", name: "Strand", type: "line" }]}
          interactionsByElement={{ strand: interactions }}
          onAddInteraction={(_, interaction) => setInteractions((current) => [...current, interaction])}
          onRemoveInteraction={(_, interactionId) => setInteractions((current) => current.filter((item) => item.id !== interactionId))}
          onUpdateInteraction={(_, interactionId, updates) => setInteractions((current) => current.map((item) => item.id === interactionId ? { ...item, ...updates } : item))}
          selectedElementIds={["strand"]}
          selectedName="Strand"
          selectedTypes={["line"]}
        />
      );
    }
    render(<Harness />);
    expect(screen.queryByText("sample-move")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "+ Add interaction" }));
    expect(saved).toHaveLength(1);
    choose("Trigger", "Drag");
    choose("Effect", "Strand Bend");
    choose("Strand drag response", "Swipe & sway");
    expect(screen.queryByRole("spinbutton", { name: "Strand tip length" })).toBeNull();
    expect(saved[0].strandDragMode).toBe("swipe");
    expect(saved[0]).toMatchObject({ trigger: "drag", effect: "strand-bend", name: "Strand Bend" });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Strand max displacement" }), { target: { value: "75" } });
    expect(saved[0].strandMaxDisplacement).toBe(75);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Strand neighbor radius" }), { target: { value: "180" } });
    fireEvent.change(screen.getByRole("slider", { name: "Strand neighbor pull" }), { target: { value: "65" } });
    expect(saved[0]).toMatchObject({ strandNeighborRadius: 180, strandNeighborStrength: 65 });
    expect(screen.getByText(/Bend lines, open pen paths, images, videos, and 3D objects/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Strand Bend options" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Strand Bend" }));
    expect(saved).toHaveLength(0);
  });

  it.each(["image", "video", "object3d"])("persists bend and wave controls for a selected %s", (type) => {
    let saved = createDefaultInteraction({ id: "deform" });
    function Harness() {
      const [interaction, setInteraction] = useState(saved);
      saved = interaction;
      return (
        <InteractionPanel
          elements={[
            { id: "source", name: "Source", type },
            { id: "picture", name: "Picture", type: "image" },
            { id: "movie", name: "Movie", type: "video" },
            { id: "model", name: "Model", type: "object3d" },
          ]}
          interactionsByElement={{ source: [interaction] }}
          onUpdateInteraction={(_, __, updates) => setInteraction((current) => ({ ...current, ...updates }))}
          selectedElementIds={["source"]}
          selectedName="Source"
          selectedTypes={[type]}
        />
      );
    }
    render(<Harness />);
    choose("Trigger", "Drag");
    choose("Effect", "Strand Bend");
    choose("Strand anchor", "Bottom");
    fireEvent.change(screen.getByRole("spinbutton", { name: "Strand max displacement" }), { target: { value: "88" } });
    expect(saved).toMatchObject({ effect: "strand-bend", strandAnchor: "bottom", strandMaxDisplacement: 88 });
    if (type === "image" || type === "video") {
      const tipLength = screen.getByRole("spinbutton", { name: "Strand tip length" });
      expect(tipLength).toHaveValue(0);
      expect(tipLength).toHaveAttribute("min", "0");
      expect(screen.getByText(/0 stretches the whole asset/)).toBeTruthy();
      fireEvent.change(tipLength, { target: { value: "26" } });
      expect(saved.strandTipLength).toBe(26);
      fireEvent.change(tipLength, { target: { value: "-10" } });
      expect(saved.strandTipLength).toBe(0);
      fireEvent.change(tipLength, { target: { value: "26" } });
    } else {
      expect(screen.queryByRole("spinbutton", { name: "Strand tip length" })).toBeNull();
    }
    choose("Trigger", "Pointer Move / Touch Move");
    choose("Effect", "Wave / Curve Deform");
    expect(screen.queryByRole("spinbutton", { name: "Strand tip length" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Wave target: Picture" }));
    fireEvent.click(screen.getByRole("button", { name: "Wave target: Movie" }));
    expect(screen.queryByRole("button", { name: "Wave target: Model" })).toBeNull();
    expect(screen.getByText("Additional 2D targets")).toBeTruthy();
    expect(saved).toMatchObject({ effect: "wave-deform", waveTargetIds: ["picture", "movie"] });
    if (type === "image" || type === "video") {
      choose("Effect", "Strand Bend");
      expect(screen.getByRole("spinbutton", { name: "Strand tip length" })).toHaveValue(26);
    }
  });

  it("hides media tip preservation for an open pen path", () => {
    render(<InteractionPanel selectedName="Path" selectedTypes={["pen"]} />);
    choose("Trigger", "Drag");
    choose("Effect", "Strand Bend");
    expect(screen.getByRole("spinbutton", { name: "Strand max displacement" })).toBeTruthy();
    expect(screen.queryByRole("spinbutton", { name: "Strand tip length" })).toBeNull();
  });

  it("persists 3D rotation, skew, blur, and shadow in shared interaction fields", () => {
    let saved = createDefaultInteraction({ id: "rotate", effect: "rotate", rotateTo: 35 });
    function Harness() {
      const [interaction, setInteraction] = useState(saved);
      saved = interaction;
      return (
        <InteractionPanel
          elements={[{ id: "cube", name: "Cube", type: "object3d" }]}
          interactionsByElement={{ cube: [interaction] }}
          onUpdateInteraction={(_, __, updates) => setInteraction((current) => ({ ...current, ...updates }))}
          selectedElementIds={["cube"]}
          selectedName="Cube"
          selectedTypes={["object3d"]}
        />
      );
    }
    render(<Harness />);
    const z = screen.getByRole("spinbutton", { name: "Rotate Z" });
    expect(z).toHaveValue(35);
    fireEvent.change(z, { target: { value: "70" } });
    expect(saved.rotateTo).toBe(70);
    const x = screen.getByRole("spinbutton", { name: "Rotate X" });
    const y = screen.getByRole("spinbutton", { name: "Rotate Y" });
    expect(x).toHaveValue(0);
    expect(y).toHaveValue(0);
    fireEvent.change(x, { target: { value: "60" } });
    fireEvent.change(y, { target: { value: "-120" } });
    expect(saved).toMatchObject({ rotateX: 60, rotateY: -120, rotateTo: 70 });
    choose("Effect", "Skew");
    fireEvent.change(screen.getByRole("spinbutton", { name: "Skew X" }), { target: { value: "16" } });
    expect(saved.skewX).toBe(16);
    choose("Effect", "Blur");
    fireEvent.change(screen.getByRole("slider", { name: "Blur amount" }), { target: { value: "12" } });
    expect(saved.blurAmount).toBe(12);
    choose("Effect", "Shadow");
    fireEvent.change(screen.getByRole("spinbutton", { name: "Shadow X" }), { target: { value: "24" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Shadow Y" }), { target: { value: "36" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Shadow blur" }), { target: { value: "10" } });
    expect(saved).toMatchObject({ shadowX: 24, shadowY: 36, shadowBlur: 10 });
    fireEvent.change(screen.getByRole("textbox", { name: "Shadow color" }), { target: { value: "rgba(20, 40, 60, 0.7)" } });
    expect(saved.shadowColor).toBe("rgba(20, 40, 60, 0.7)");
    expect(screen.queryByRole("spinbutton", { name: "Shadow Z" })).toBeNull();
    expect(screen.queryByRole("spinbutton", { name: "Shadow spread" })).toBeNull();
  });

  it("persists Camera Rotate angles, projection and field of view", () => {
    let saved = createDefaultInteraction({
      cameraRotateY: -180,
      effect: "camera-rotate",
      id: "orbit",
      trigger: "drag",
    });
    function Harness() {
      const [interaction, setInteraction] = useState(saved);
      saved = interaction;
      return (
        <InteractionPanel
          elements={[{ id: "hint", name: "Hint", type: "text" }]}
          interactionsByElement={{ hint: [interaction] }}
          onUpdateInteraction={(_, __, updates) => setInteraction((current) => ({ ...current, ...updates }))}
          selectedElementIds={["hint"]}
          selectedName="Hint"
          selectedTypes={["text"]}
        />
      );
    }
    render(<Harness />);
    const y = screen.getByRole("spinbutton", { name: "Camera rotate Y" });
    expect(y).toHaveValue(-180);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Camera rotate X" }), { target: { value: "60" } });
    fireEvent.change(y, { target: { value: "-240" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Camera rotate Z" }), { target: { value: "8" } });
    expect(saved).toMatchObject({ cameraRotateX: 60, cameraRotateY: -240, cameraRotateZ: 8 });
    expect(screen.queryByRole("spinbutton", { name: "Camera field of view" })).toBeNull();
    choose("Camera projection", "Perspective");
    expect(saved.cameraProjection).toBe("perspective");
    const fov = screen.getByRole("spinbutton", { name: "Camera field of view" });
    expect(fov).toHaveValue(35);
    fireEvent.change(fov, { target: { value: "42" } });
    expect(saved.cameraFov).toBe(42);
    expect(screen.getByText("X 60° · Y -240° · Z 8°")).toBeTruthy();
  });

  it("hydrates and saves Liquid Merge settings from the selected shape", () => {
    let saved = createDefaultInteraction({
      id: "merge",
      trigger: "near-target",
      effect: "liquid-merge",
      name: "Liquid Merge",
      collisionTarget: "circle",
      joinDistance: 42,
      releaseDistance: 57,
      bridgeWidth: 63,
      liquidSmoothness: 71,
    });
    function Harness() {
      const [interaction, setInteraction] = useState(saved);
      saved = interaction;
      return (
        <InteractionPanel
          elements={[
            { id: "rect", name: "Rectangle", type: "rectangle" },
            { id: "circle", name: "Circle", type: "circle" },
          ]}
          interactionsByElement={{ rect: [interaction] }}
          onUpdateInteraction={(_, __, updates) => setInteraction((current) => ({ ...current, ...updates }))}
          selectedElementIds={["rect"]}
          selectedName="Rectangle"
          selectedTypes={["rectangle"]}
        />
      );
    }
    render(<Harness />);
    expect(screen.getByRole("spinbutton", { name: "Join distance" })).toHaveProperty("value", "42");
    expect(screen.getByRole("slider", { name: "Liquid bridge width" })).toHaveProperty("value", "63");
    expect(screen.getByRole("button", { name: "Collision target element" })).toHaveTextContent("Circle");
    fireEvent.change(screen.getByRole("slider", { name: "Liquid smoothness" }), { target: { value: "80" } });
    expect(saved.liquidSmoothness).toBe(80);
    fireEvent.change(screen.getByRole("slider", { name: "Liquid attraction" }), { target: { value: "72" } });
    expect(saved.liquidAttraction).toBe(72);
  });

  it("offers another strand as a Liquid Merge target", () => {
    render(
      <InteractionPanel
        elements={[
          { id: "one", name: "Red strand 1", type: "line" },
          { id: "two", name: "Red strand 2", type: "pen" },
        ]}
        selectedElementIds={["one"]}
        selectedName="Red strand 1"
        selectedTypes={["line"]}
      />,
    );
    choose("Trigger", "Near Target");
    choose("Effect", "Liquid Merge");
    expect(screen.getByRole("button", { name: "Collision target element" })).toHaveTextContent("Red strand 2");
  });

  it("authors reusable target-drop acceptance, snapping, reset, and constraints", () => {
    let saved = createDefaultInteraction({ id: "drop" });
    function Harness() {
      const [interaction, setInteraction] = useState(saved);
      saved = interaction;
      return (
        <InteractionPanel
          elements={[
            { id: "star", name: "Star", type: "star" },
            { id: "slot", name: "Constellation Slot", type: "circle" },
            {
              id: "cube",
              name: "3D Cube",
              sourceKind: "primitive",
              type: "object3d",
            },
          ]}
          interactionsByElement={{ star: [interaction] }}
          onUpdateInteraction={(_, __, updates) =>
            setInteraction((current) => ({ ...current, ...updates }))
          }
          selectedElementIds={["star"]}
          selectedName="Star"
          selectedTypes={["star"]}
        />
      );
    }

    render(<Harness />);
    choose("Trigger", "Drop On Target");
    expect(saved).toMatchObject({
      collisionTarget: "slot",
      trigger: "drop-on-target",
    });
    expect(
      screen.getByText(/Target triggers include drag handling automatically/i),
    ).toBeTruthy();
    openDropdown("Collision target element");
    expect(screen.queryByRole("option", { name: "3D Cube (object3d)" })).toBeNull();
    openDropdown("Collision target element");
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Drop target tolerance" }),
      { target: { value: "32" } },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Target capacity" }),
      { target: { value: "2" } },
    );
    choose("Target match mode", "Object type");
    expect(
      screen.getByRole("button", { name: "Target match value" }),
    ).toHaveTextContent("Star");
    choose("Occupied target behavior", "Allow together");
    choose("Effect", "Snap to Target");
    choose("Target snap anchor", "Custom offset");
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Target snap offset X" }),
      { target: { value: "4" } },
    );
    choose("Reset behavior", "Stay at target");
    fireEvent.click(screen.getByRole("button", { name: "Expand advanced" }));
    choose("Drag movement bounds", "Inside artboard");

    expect(saved).toMatchObject({
      dragBounds: "artboard",
      dropTolerance: 32,
      effect: "snap-to-target",
      occupiedBehavior: "allow",
      resetMode: "stay-at-target",
      snapAnchor: "custom",
      snapOffsetX: 4,
      targetCapacity: 2,
      targetMatchMode: "object-type",
      targetMatchValue: "star",
    });

    choose("Trigger", "Drag Enter Target");
    expect(
      screen.queryByRole("spinbutton", { name: "Target capacity" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Occupied target behavior" }),
    ).toBeNull();
    expect(
      screen.getByRole("spinbutton", { name: "Drop target tolerance" }),
    ).toBeTruthy();
  });

  it("authors an accessible modal action against another layer", () => {
    let saved = createDefaultInteraction({ id: "modal" });
    function Harness() {
      const [interaction, setInteraction] = useState(saved);
      saved = interaction;
      return (
        <InteractionPanel
          elements={[
            { id: "button", name: "Open Letter", type: "rectangle" },
            { id: "dialog", name: "Letter Dialog", type: "rectangle" },
            {
              id: "cube",
              name: "3D Cube",
              sourceKind: "primitive",
              type: "object3d",
            },
          ]}
          interactionsByElement={{ button: [interaction] }}
          onUpdateInteraction={(_, __, updates) =>
            setInteraction((current) => ({ ...current, ...updates }))
          }
          selectedElementIds={["button"]}
          selectedName="Open Letter"
          selectedTypes={["rectangle"]}
        />
      );
    }

    render(<Harness />);
    choose("Effect", "Open Modal");
    expect(saved).toMatchObject({ effect: "open-modal", modalTarget: "dialog" });
    expect(screen.getByRole("button", { name: "Modal target" })).toHaveTextContent(
      "Letter Dialog",
    );
    openDropdown("Modal target");
    expect(screen.queryByRole("option", { name: "3D Cube (object3d)" })).toBeNull();
    openDropdown("Modal target");
    expect(screen.getByRole("button", { name: "Close on Escape" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Close on backdrop" }));
    expect(saved.modalCloseOnBackdrop).toBe(false);
    expect(screen.queryByText("4. HOW")).toBeNull();
    expect(screen.queryByRole("spinbutton", { name: "Duration" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Easing" })).toBeNull();
    expect(screen.getByRole("spinbutton", { name: "Delay" })).toBeTruthy();
  });

  it("shows Long Press duration and hides area for page, time, and media triggers", () => {
    render(
      <InteractionPanel
        selectedName="Rectangle 1"
        selectedTypes={["rectangle"]}
      />,
    );
    choose("Trigger", "Long Press");
    expect(
      screen.getByRole("spinbutton", { name: "Long press duration" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Trigger area" })).toBeTruthy();

    choose("Trigger", "Page Enter");
    expect(screen.queryByRole("button", { name: "Trigger area" })).toBeNull();
    choose("Trigger", "After Delay");
    expect(screen.queryByRole("button", { name: "Trigger area" })).toBeNull();
    choose("Trigger", "Video Starts");
    expect(screen.queryByRole("button", { name: "Trigger area" })).toBeNull();
    expect(screen.getByRole("button", { name: "Source video" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("changes Pointer Move from follow input to a one-shot threshold event", () => {
    render(
      <InteractionPanel
        selectedName="Rectangle 1"
        selectedTypes={["rectangle"]}
      />,
    );
    choose("Trigger", "Pointer Move / Touch Move");
    expect(
      screen.getByRole("button", { name: "Input mapping" }),
    ).toHaveTextContent("Pointer Position");
    expect(
      screen.getByRole("button", { name: "Pointer position axis" }),
    ).toBeTruthy();
    expect(screen.getByRole("spinbutton", { name: "Smoothing" })).toBeTruthy();
    expect(screen.queryByRole("spinbutton", { name: "Duration" })).toBeNull();

    choose("Mapping response mode", "Fire at threshold");
    expect(screen.getByRole("spinbutton", { name: "Threshold" })).toBeTruthy();
    expect(screen.getByRole("spinbutton", { name: "Duration" })).toBeTruthy();
    expect(screen.queryByRole("spinbutton", { name: "Smoothing" })).toBeNull();
  });

  it("filters effects by element type and hides HOW and duration for immediate commands", () => {
    render(
      <InteractionPanel selectedName="Video 1" selectedTypes={["video"]} />,
    );
    choose("Effect", "Play");
    expect(screen.queryByText("4. HOW")).toBeNull();
    expect(screen.queryByRole("spinbutton", { name: "Duration" })).toBeNull();
    expect(screen.getByRole("spinbutton", { name: "Delay" })).toBeTruthy();
  });

  it("coerces reset options when the trigger changes", () => {
    render(
      <InteractionPanel
        selectedName="Rectangle 1"
        selectedTypes={["rectangle"]}
      />,
    );
    choose("Trigger", "Hover");
    choose("Reset behavior", "Return when pointer leaves");
    choose("Trigger", "Page Exit");
    expect(
      screen.getByRole("button", { name: "Reset behavior" }),
    ).toHaveTextContent("Contextual default");
    expect(screen.getByText(/discard this page's runtime state/i)).toBeTruthy();
  });

  it("configures a liquid merge against another closed shape", () => {
    render(
      <InteractionPanel
        elements={[
          { id: "a", name: "Rectangle 1", type: "rectangle" },
          { id: "b", name: "Circle 2", type: "circle" },
          { id: "c", name: "Image 3", type: "image" },
        ]}
        selectedElementIds={["a"]}
        selectedName="Rectangle 1"
        selectedTypes={["rectangle"]}
      />,
    );
    choose("Trigger", "Near Target");
    fireEvent.click(screen.getByRole("button", { name: "Effect" }));
    expect(
      screen.getByRole("listbox", { name: "Effect menu" }).lastElementChild,
    ).toHaveTextContent("Liquid Merge");
    fireEvent.click(screen.getByRole("button", { name: "Effect" }));
    choose("Effect", "Liquid Merge");
    expect(
      screen.getByRole("spinbutton", { name: "Join distance" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("spinbutton", { name: "Release distance" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("slider", { name: "Liquid bridge width" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("slider", { name: "Liquid smoothness" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Collision detection" }),
    ).toHaveTextContent("Precise outline");
    choose("Collision target element", "Circle 2 (circle)");
    expect(
      screen.getByRole("button", { name: "Collision target element" }),
    ).toHaveTextContent("Circle 2");
    fireEvent.click(
      screen.getByRole("button", { name: "Collision target element" }),
    );
    expect(
      screen.getByRole("option", { name: "Image 3 (image)" }),
    ).toBeTruthy();
  });

  it("configures physical collision bounce without animation duration", () => {
    render(
      <InteractionPanel
        elements={[
          { id: "a", name: "Rectangle 1", type: "rectangle" },
          { id: "b", name: "Circle 2", type: "circle" },
        ]}
        selectedElementIds={["a"]}
        selectedName="Rectangle 1"
        selectedTypes={["rectangle"]}
      />,
    );
    choose("Trigger", "Overlap Start");
    choose("Effect", "Bounce Off Target");
    expect(
      screen.getByRole("slider", { name: "Collision bounciness" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("spinbutton", { name: "Selected object mass" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("slider", { name: "Collision friction" }),
    ).toBeTruthy();
    expect(screen.queryByRole("spinbutton", { name: "Duration" })).toBeNull();
    choose("Collision affected objects", "Both objects");
    expect(
      screen.getByRole("spinbutton", { name: "Target object mass" }),
    ).toBeTruthy();
    choose("Trigger", "Click / Tap");
    expect(screen.getByRole("button", { name: "Effect" })).toHaveTextContent(
      "Move",
    );
  });

  it.each(["image", "video"])("offers %s Liquid Merge only for separated near-target outlines", (type) => {
    render(
      <InteractionPanel
        elements={[
          { id: "media", name: "Media", type },
          { id: "target", name: "Target", type: "rectangle" },
        ]}
        selectedElementIds={["media"]}
        selectedName="Media"
        selectedTypes={[type]}
      />,
    );
    choose("Trigger", "Near Target");
    choose("Effect", "Liquid Merge");
    expect(screen.getByText(/It is not a Boolean union/)).toBeTruthy();
    choose("Trigger", "While Overlapping");
    fireEvent.click(screen.getByRole("button", { name: "Effect" }));
    expect(screen.queryByRole("option", { name: /^Liquid Merge$/ })).toBeNull();
    expect(screen.getByText(/Media Liquid Merge uses Near Target/)).toBeTruthy();
  });

  it("excludes media targets from a vector's overlap liquid effect", () => {
    render(
      <InteractionPanel
        elements={[
          { id: "source", name: "Source", type: "rectangle" },
          { id: "vector", name: "Vector target", type: "circle" },
          { id: "media", name: "Media target", type: "image" },
        ]}
        selectedElementIds={["source"]}
        selectedName="Source"
        selectedTypes={["rectangle"]}
      />,
    );
    choose("Trigger", "While Overlapping");
    choose("Effect", "Liquid Merge");
    fireEvent.click(screen.getByRole("button", { name: "Collision target element" }));
    expect(screen.getByRole("option", { name: "Vector target (circle)" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Media target (image)" })).toBeNull();
  });

  it("explains why Liquid Merge is unavailable for a multiple selection", () => {
    render(
      <InteractionPanel
        selectedName="Rectangle 1"
        selectedTypes={["rectangle", "circle"]}
      />,
    );
    choose("Trigger", "Near Target");
    expect(
      screen.getByText(/Liquid Merge needs one supported vector, media, or 3D object/i),
    ).toBeTruthy();
  });

  it("configures Gravity stacking without changing the existing bounce-only fields", () => {
    render(
      <InteractionPanel
        elements={[
          { id: "ice", name: "Ice", type: "circle" },
          { id: "cup", name: "Cup", type: "rectangle" },
        ]}
        selectedElementIds={["ice"]}
        selectedName="Ice"
        selectedTypes={["circle"]}
      />,
    );
    choose("Trigger", "Page Enter");
    choose("Motion behavior", "Gravity");
    expect(
      screen.getByRole("button", { name: "Gravity bounce targets" }),
    ).toBeTruthy();
    expect(screen.getByRole("spinbutton", { name: "Move X" })).toBeTruthy();

    choose("Gravity contact behavior", "Stack & Settle");
    expect(
      screen.getByRole("button", { name: "Stack collision targets" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Gravity bounce targets" }),
    ).toBeNull();
    expect(screen.queryByRole("spinbutton", { name: "Move X" })).toBeNull();
    expect(
      screen.getByRole("spinbutton", { name: "Stacking mass" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("slider", { name: "Stacking friction" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("slider", { name: "Stacking bounciness" }),
    ).toBeTruthy();
    expect(screen.queryByRole("spinbutton", { name: "Duration" })).toBeNull();
    expect(screen.getByRole("spinbutton", { name: "Delay" })).toBeTruthy();
    expect(
      screen.getByText(/keep the settled pile until page exit/i),
    ).toBeTruthy();

    choose("Stack collision targets", "Physics + obstacles…");
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Static obstacle Cup" }),
    );
    expect(
      screen.getByRole("checkbox", { name: "Static obstacle Cup" }),
    ).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Expand advanced" }));
    expect(
      screen.getByRole("spinbutton", { name: "Stacking settle speed" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("spinbutton", { name: "Repeat count" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Edit keyframes…" }),
    ).toBeNull();

    choose("Gravity contact behavior", "Bounce only");
    expect(
      screen.getByRole("button", { name: "Gravity bounce targets" }),
    ).toBeTruthy();
    expect(screen.getByRole("spinbutton", { name: "Move X" })).toBeTruthy();
    expect(screen.getByRole("spinbutton", { name: "Duration" })).toBeTruthy();
  });

  it("keeps 3D-only triggers, effects, and controls out of a 2D selection", () => {
    render(
      <InteractionPanel
        elements={[{ id: "rectangle", name: "Rectangle 1", type: "rectangle" }]}
        selectedElementIds={["rectangle"]}
        selectedName="Rectangle 1"
        selectedTypes={["rectangle"]}
      />,
    );

    openDropdown("Trigger");
    expect(
      screen.queryByRole("option", { name: "Collision Enter" }),
    ).toBeNull();
    openDropdown("Trigger");

    openDropdown("Effect");
    expect(
      screen.queryByRole("option", { name: "Play Model Animation" }),
    ).toBeNull();
    openDropdown("Effect");

    expect(screen.queryByRole("spinbutton", { name: "Move Z" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Coordinate space" }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Expand advanced" }));
    expect(
      screen.queryByRole("button", { name: "Rigid body type" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Collider shape" })).toBeNull();
  });

  it("shows XYZ transform and complete rigid-body controls for a 3D primitive", () => {
    renderPrimitive3DPanel();

    openDropdown("Trigger");
    expect(
      screen.getByRole("option", { name: "Collision Enter" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("option", { name: "Drop On Target" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("option", { name: "Drag Enter Target" }),
    ).toBeTruthy();
    openDropdown("Trigger");

    openDropdown("Effect");
    expect(
      screen.getByRole("option", { name: "Attach To Target" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("option", { name: "Snap to Target" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("option", { name: "Open Modal" }),
    ).toBeTruthy();
    openDropdown("Effect");

    expect(screen.getByRole("spinbutton", { name: "Move Z" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Coordinate space" }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Expand advanced" }));
    expect(
      screen.getByRole("button", { name: "Rigid body type" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Collider shape" })).toBeTruthy();
    expect(
      screen.getByRole("checkbox", { name: "Freeze position X" }),
    ).toBeTruthy();
  });

  it("uses GLB metadata to expose animation, material, and morph interactions", () => {
    renderModel3DPanel();

    openDropdown("Trigger");
    expect(
      screen.getByRole("option", { name: "Model Animation Ends" }),
    ).toBeTruthy();
    openDropdown("Trigger");

    openDropdown("Effect");
    expect(
      screen.getByRole("option", { name: "Play Model Animation" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("option", { name: "Change Material" }),
    ).toBeTruthy();
    expect(screen.getByRole("option", { name: "Morph Target" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Bone Transform" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Joint Rotation" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Mesh Transform" })).toBeTruthy();
    expect(
      screen.getByRole("option", { name: "Mesh Face Material" }),
    ).toBeTruthy();
    openDropdown("Effect");

    choose("Effect", "Play Model Animation");
    expect(
      screen.getByRole("button", { name: "Animation clip" }),
    ).toHaveTextContent("Idle");

    choose("Effect", "Change Material");
    expect(
      screen.getByRole("button", { name: "Material slot" }),
    ).toHaveTextContent("Body");

    choose("Effect", "Morph Target");
    expect(
      screen.getByRole("button", { name: "Morph target" }),
    ).toHaveTextContent("Smile");

    choose("Effect", "Bone Transform");
    expect(
      screen.getByRole("button", { name: "Model bone" }),
    ).toHaveTextContent("Spine");

    choose("Effect", "Joint Rotation");
    expect(
      screen.getByRole("button", { name: "Model joint" }),
    ).toHaveTextContent("Shoulder");

    choose("Effect", "Mesh Face Material");
    expect(
      screen.getByRole("button", { name: "Mesh face group" }),
    ).toHaveTextContent("BodyMesh · Face Group 1");
    choose("Mesh face selection mode", "Face index");
    expect(
      screen.getByRole("spinbutton", { name: "Mesh face index" }),
    ).toBeTruthy();
  });

  it("plans a physical 2D-to-3D collision with a spatial proxy", () => {
    render(
      <InteractionPanel
        elements={[
          { id: "poster", name: "Poster", type: "image" },
          {
            id: "cube",
            name: "Cube",
            sourceKind: "primitive",
            type: "object3d",
          },
        ]}
        selectedElementIds={["poster"]}
        selectedName="Poster"
        selectedTypes={["image"]}
      />,
    );

    choose("Trigger", "Collision Enter");
    expect(
      screen.getByRole("button", { name: "Collision target element" }),
    ).toHaveTextContent("Cube");
    expect(
      screen.getByRole("button", { name: "Hybrid collider mode" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("spinbutton", { name: "2D collision depth" }),
    ).toBeTruthy();

    openDropdown("Effect");
    expect(
      screen.getByRole("option", { name: "Bounce Off Target" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("option", { name: "Stack On Target" }),
    ).toBeTruthy();
    openDropdown("Effect");

    fireEvent.click(screen.getByRole("button", { name: "Expand advanced" }));
    expect(
      screen.getByText("2D / 3D Collision Body", { exact: true }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Rigid body type" }),
    ).toBeTruthy();
  });

  it("exposes scene-logic lifecycle outputs and opens the full keyframe editor", () => {
    renderPrimitive3DPanel();
    fireEvent.click(screen.getByRole("button", { name: "Expand advanced" }));

    expect(
      screen.getByRole("checkbox", { name: "Emit On Trigger" }),
    ).toBeChecked();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Emit Custom Event" }),
    );
    expect(
      screen.getByRole("textbox", { name: "Custom event output name" }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Edit keyframes…" }));
    expect(
      screen.getByRole("dialog", { name: "Interaction Keyframes" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Select Cube 1 Position Z track" }),
    ).toBeTruthy();
  });

  it("shows camera, lighting, post-processing, and shader controls", () => {
    renderPrimitive3DPanel();

    choose("Effect", "Camera Rotate");
    expect(
      screen.getByRole("spinbutton", { name: "Camera rotate Z" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Camera projection" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Expand advanced" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit keyframes…" }));
    expect(
      screen.getByRole("button", {
        name: "Select Artwork Camera Camera Rotation Z track",
      }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Close keyframe editor" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Collapse advanced" }));

    choose("Effect", "Animate Lighting");
    expect(screen.getByRole("button", { name: "Animated light" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Expand advanced" }));
    expect(
      screen.getByRole("button", { name: "Visual effect quality" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Collapse advanced" }));

    choose("Effect", "Post Processing");
    expect(
      screen.getByRole("button", { name: "Post processing effect" }),
    ).toBeTruthy();

    choose("Effect", "Shader Parameter");
    choose("Shader uniform type", "Vector 4");
    expect(
      screen.getByRole("spinbutton", { name: "Shader value W" }),
    ).toBeTruthy();
  });
});

describe("InteractionPanel keeps HOW and the stored motion in sync", () => {
  function renderAuthored({
    elements = [{ id: "box", name: "Box", type: "rectangle" }],
    selectedElementIds = ["box"],
    selectedTypes = ["rectangle"],
  }: {
    elements?: { id: string; name: string; type: string }[];
    selectedElementIds?: string[];
    selectedTypes?: string[];
  } = {}) {
    const state = {
      saved: createDefaultInteraction({ id: "drop" }),
      updates: [] as Partial<InteractionDefinition>[],
    };
    function Harness() {
      const [interaction, setInteraction] = useState(state.saved);
      state.saved = interaction;
      return (
        <InteractionPanel
          elements={elements}
          interactionsByElement={{ [selectedElementIds[0]]: [interaction] }}
          onUpdateInteraction={(_, __, next) => {
            state.updates.push(next);
            setInteraction((current) => ({ ...current, ...next }));
          }}
          selectedElementIds={selectedElementIds}
          selectedName="Box"
          selectedTypes={selectedTypes}
        />
      );
    }
    render(<Harness />);
    return state;
  }

  const howButton = () =>
    screen.getByRole("button", { name: "Motion behavior" });

  it("replaces a hidden Gravity when the new effect cannot fall", () => {
    const state = renderAuthored();
    choose("Motion behavior", "Gravity");
    expect(state.saved.motion).toBe("gravity");

    state.updates.length = 0;
    choose("Effect", "Scale");
    // One update, so the effect and the motion are undone together.
    expect(state.updates).toEqual([
      expect.objectContaining({ effect: "scale", motion: "direct" }),
    ]);
    expect(state.saved.motion).toBe("direct");
    expect(howButton()).toHaveTextContent("Direct");

    // Going back to Move must not bring the old Gravity back.
    choose("Effect", "Move");
    expect(state.saved.motion).toBe("direct");
    expect(howButton()).toHaveTextContent("Direct");
  });

  it("leaves the motion alone when the new effect still allows it", () => {
    const state = renderAuthored();
    expect(state.saved.motion).toBe("spring");
    choose("Effect", "Scale");
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0]).not.toHaveProperty("motion");
    expect(state.saved.motion).toBe("spring");
    expect(howButton()).toHaveTextContent("Spring");
  });

  it("replaces Gravity when the trigger changes to a continuous input", () => {
    const state = renderAuthored();
    choose("Motion behavior", "Gravity");
    choose("Trigger", "Drag");
    expect(state.saved).toMatchObject({ motion: "direct", trigger: "drag" });
    expect(howButton()).toHaveTextContent("Direct");
  });

  it("replaces a motion the new input mapping does not allow", () => {
    const state = renderAuthored();
    choose("Trigger", "Drag");
    choose("Motion behavior", "Inertia");
    expect(state.saved.motion).toBe("inertia");
    choose("Input mapping", "Pointer Velocity");
    expect(state.saved).toMatchObject({
      mapping: "pointer-velocity",
      motion: "direct",
    });
    expect(howButton()).toHaveTextContent("Direct");
  });

  it("replaces Gravity when a group's child effect changes", () => {
    const state = renderAuthored({
      elements: [
        { id: "box", name: "Box", type: "rectangle" },
        { id: "dot", name: "Dot", type: "circle" },
      ],
      selectedElementIds: ["box", "dot"],
      selectedTypes: ["rectangle", "circle"],
    });
    choose("Effect", "Group Animation");
    choose("Motion behavior", "Gravity");
    expect(state.saved.motion).toBe("gravity");
    choose("Group child effect", "Scale");
    expect(state.saved).toMatchObject({ groupEffect: "scale", motion: "direct" });
    expect(howButton()).toHaveTextContent("Direct");
  });

  it("does the same for an interaction that is not saved yet", () => {
    render(
      <InteractionPanel selectedName="Rectangle 1" selectedTypes={["rectangle"]} />,
    );
    choose("Motion behavior", "Gravity");
    choose("Effect", "Scale");
    expect(howButton()).toHaveTextContent("Direct");
    choose("Effect", "Move");
    expect(howButton()).toHaveTextContent("Direct");
  });
});
