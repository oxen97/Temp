import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { createDefaultInteraction, type InteractionDefinition } from "@/features/editor/lib/interaction-model";
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
    expect(saved[0]).toMatchObject({ trigger: "drag", effect: "strand-bend", name: "Strand Bend" });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Strand max displacement" }), { target: { value: "75" } });
    expect(saved[0].strandMaxDisplacement).toBe(75);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Strand neighbor radius" }), { target: { value: "180" } });
    fireEvent.change(screen.getByRole("slider", { name: "Strand neighbor pull" }), { target: { value: "65" } });
    expect(saved[0]).toMatchObject({ strandNeighborRadius: 180, strandNeighborStrength: 65 });
    expect(screen.getByText(/Nearby lines and open pen paths with Strand Bend follow the pointer/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Strand Bend options" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Strand Bend" }));
    expect(saved).toHaveLength(0);
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
      screen.queryByRole("option", { name: "Image 3 (image)" }),
    ).toBeNull();
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

  it("explains why Liquid Merge is unavailable for a multiple selection", () => {
    render(
      <InteractionPanel
        selectedName="Rectangle 1"
        selectedTypes={["rectangle", "circle"]}
      />,
    );
    choose("Trigger", "Near Target");
    expect(
      screen.getByText(/Liquid Merge needs one selected 2D vector shape or strand/i),
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
    openDropdown("Trigger");

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
