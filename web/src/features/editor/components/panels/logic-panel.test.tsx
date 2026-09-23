import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createSceneLogicRule } from "@/features/editor/lib/scene-logic";

import { LogicPanel } from "./logic-panel";

afterEach(cleanup);

const pages = [
  { id: "intro", name: "Intro" },
  { id: "gallery", name: "Gallery" },
  { id: "ending", name: "Ending" },
] as const;

const objects = [
  { id: "door", name: "Gallery Door", type: "rectangle" },
  { id: "statue", name: "Statue", type: "object3d" },
] as const;

const interactions = [
  {
    id: "door-open",
    name: "Open Door",
    objectId: "door",
    triggerLabel: "Click / Tap",
  },
  {
    id: "statue-turn",
    name: "Turn Statue",
    objectId: "statue",
    triggerLabel: "On Drag",
  },
] as const;

function renderPanel() {
  return render(
    <LogicPanel
      currentPageId="intro"
      interactions={interactions}
      objects={objects}
      pages={pages}
      selectedInteractionIds={["door-open"]}
      selectedObjectIds={["door"]}
    />,
  );
}

describe("LogicPanel", () => {
  it("links all supported interaction lifecycle events to a scene result", () => {
    renderPanel();

    const eventSource = screen.getByRole("combobox", {
      name: "Event Source",
    });
    expect(eventSource).toHaveValue("on-complete");
    expect(eventSource.querySelectorAll("option")).toHaveLength(6);
    expect(eventSource).toHaveTextContent("On Trigger");
    expect(eventSource).toHaveTextContent("On Start");
    expect(eventSource).toHaveTextContent("On Complete");
    expect(eventSource).toHaveTextContent("On Reset");
    expect(eventSource).toHaveTextContent("On Collision");
    expect(eventSource).toHaveTextContent("Custom Event");

    expect(screen.getByRole("combobox", { name: "Source Object" })).toHaveValue(
      "door",
    );
    expect(
      screen.getByRole("combobox", { name: "Source Interaction" }),
    ).toHaveValue("door-open");
    expect(screen.getByRole("combobox", { name: "Target Scene" })).toHaveValue(
      "gallery",
    );
  });

  it("asks for an event name only for Custom Event", () => {
    renderPanel();

    expect(
      screen.queryByRole("textbox", { name: "Custom Event Name" }),
    ).toBeNull();
    fireEvent.change(screen.getByRole("combobox", { name: "Event Source" }), {
      target: { value: "custom-event" },
    });
    expect(
      screen.getByRole("textbox", { name: "Custom Event Name" }),
    ).toBeVisible();
  });

  it("supports variable, visited-scene, and trigger-count conditions", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Add condition" }));

    const conditionType = screen.getByRole("combobox", {
      name: "Condition 1 Type",
    });
    expect(
      screen.getByRole("textbox", { name: "Condition 1 Variable Name" }),
    ).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "Condition 1 Operator" }),
    ).toHaveTextContent("At least");

    fireEvent.change(conditionType, { target: { value: "visited" } });
    expect(
      screen.getByRole("combobox", { name: "Condition 1 Scene" }),
    ).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "Condition 1 Visit State" }),
    ).toHaveTextContent("Has not been visited");

    fireEvent.change(conditionType, { target: { value: "count" } });
    expect(
      screen.getByRole("spinbutton", { name: "Condition 1 Count" }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Remove condition 1" }));
    expect(screen.getByText(/No conditions/i)).toBeVisible();
  });

  it("keeps navigation actions and variable updates focused on scene routing", () => {
    renderPanel();
    const sceneAction = screen.getByRole("combobox", { name: "Scene Action" });
    expect(sceneAction).toHaveTextContent("Go to Scene");
    expect(sceneAction).toHaveTextContent("Previous Scene");
    expect(sceneAction).toHaveTextContent("Restart Scene");
    expect(sceneAction).toHaveTextContent("End Artwork");

    fireEvent.change(sceneAction, { target: { value: "end-artwork" } });
    expect(screen.queryByRole("combobox", { name: "Target Scene" })).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Add variable action" }),
    );
    const operation = screen.getByRole("combobox", {
      name: "Variable Action 1 Operation",
    });
    expect(operation).toHaveTextContent("Set");
    expect(operation).toHaveTextContent("Increase");
    expect(operation).toHaveTextContent("Decrease");
    expect(operation).toHaveTextContent("Toggle");

    fireEvent.change(operation, { target: { value: "toggle" } });
    expect(
      screen.queryByRole("textbox", { name: "Variable Action 1 Value" }),
    ).toBeNull();
    expect(screen.getByText("Scene routing only")).toBeVisible();
    expect(screen.getByText(/remain editable in INTERACTION/i)).toBeVisible();
  });

  it("adds and removes complete branch rules", () => {
    renderPanel();
    expect(
      screen.getByRole("button", { name: "Remove branch 1" }),
    ).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Add branch rule" }));
    expect(screen.getAllByText(/BRANCH 0[12]/)).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Remove branch 2" }),
    ).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Remove branch 2" }));
    expect(screen.queryByText("BRANCH 02")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Remove branch 1" }));
    expect(screen.getByText(/No scene routes yet/)).toBeVisible();
  });

  it("reports edits to persisted rules for the active scene", () => {
    const onRulesChange = vi.fn();
    render(
      <LogicPanel
        currentPageId="intro"
        interactions={interactions}
        objects={objects}
        onRulesChange={onRulesChange}
        pages={pages}
        rules={[
          createSceneLogicRule({
            id: "intro-next",
            objectId: "door",
            interactionId: "door-open",
            targetPageId: "gallery",
          }),
        ]}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Target Scene" }), {
      target: { value: "ending" },
    });
    expect(onRulesChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: "intro-next", targetPageId: "ending" }),
    ]);
  });
});
