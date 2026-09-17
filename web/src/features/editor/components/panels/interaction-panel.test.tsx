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
    render(<InteractionPanel selectedName="Rectangle 1" selectedTypes={["rectangle"]} />);
    choose("Trigger", "Long Press");
    expect(screen.getByRole("spinbutton", { name: "Long press duration" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Trigger area" })).toBeTruthy();

    choose("Trigger", "Page Enter");
    expect(screen.queryByRole("button", { name: "Trigger area" })).toBeNull();
    choose("Trigger", "After Delay");
    expect(screen.queryByRole("button", { name: "Trigger area" })).toBeNull();
    choose("Trigger", "Video Starts");
    expect(screen.queryByRole("button", { name: "Trigger area" })).toBeNull();
    expect(screen.getByRole("button", { name: "Source video" })).toHaveProperty("disabled", true);
  });

  it("changes Pointer Move from follow input to a one-shot threshold event", () => {
    render(<InteractionPanel selectedName="Rectangle 1" selectedTypes={["rectangle"]} />);
    choose("Trigger", "Pointer Move / Touch Move");
    expect(screen.getByRole("button", { name: "Input mapping" })).toHaveTextContent("Pointer Position");
    expect(screen.getByRole("button", { name: "Pointer position axis" })).toBeTruthy();
    expect(screen.getByRole("spinbutton", { name: "Smoothing" })).toBeTruthy();
    expect(screen.queryByRole("spinbutton", { name: "Duration" })).toBeNull();

    choose("Mapping response mode", "Fire at threshold");
    expect(screen.getByRole("spinbutton", { name: "Threshold" })).toBeTruthy();
    expect(screen.getByRole("spinbutton", { name: "Duration" })).toBeTruthy();
    expect(screen.queryByRole("spinbutton", { name: "Smoothing" })).toBeNull();
  });

  it("filters effects by element type and hides HOW and duration for immediate commands", () => {
    render(<InteractionPanel selectedName="Video 1" selectedTypes={["video"]} />);
    choose("Effect", "Play");
    expect(screen.queryByText("4. HOW")).toBeNull();
    expect(screen.queryByRole("spinbutton", { name: "Duration" })).toBeNull();
    expect(screen.getByRole("spinbutton", { name: "Delay" })).toBeTruthy();
  });

  it("coerces reset options when the trigger changes", () => {
    render(<InteractionPanel selectedName="Rectangle 1" selectedTypes={["rectangle"]} />);
    choose("Trigger", "Hover");
    choose("Reset behavior", "Return when pointer leaves");
    choose("Trigger", "Page Exit");
    expect(screen.getByRole("button", { name: "Reset behavior" })).toHaveTextContent("Contextual default");
    expect(screen.getByText(/discard this page's runtime state/i)).toBeTruthy();
  });
});
