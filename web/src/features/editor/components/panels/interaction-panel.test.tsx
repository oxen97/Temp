import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { InteractionPanel } from "./interaction-panel";

afterEach(cleanup);

function choose(ariaLabel: string, option: string) {
  fireEvent.click(screen.getByRole("button", { name: ariaLabel }));
  fireEvent.click(screen.getByRole("option", { name: option }));
}

describe("InteractionPanel conditional UI", () => {
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
      screen.getByText(/Liquid Merge needs one selected rectangle/i),
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
});
