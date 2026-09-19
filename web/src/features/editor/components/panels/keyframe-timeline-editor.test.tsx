import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  KeyframeTimelineEditor,
  type TimelineKeyframe,
} from "./keyframe-timeline-editor";

afterEach(cleanup);

const objects = [
  {
    dimension: "3d" as const,
    id: "robot",
    materialNames: ["Body", "Chrome"],
    morphTargetNames: ["Smile", "Blink"],
    name: "Robot",
  },
  {
    dimension: "2d" as const,
    id: "caption",
    name: "Caption",
  },
];

const startingKeyframe: TimelineKeyframe = {
  easing: "linear",
  id: "start-x",
  objectId: "robot",
  property: "position-x",
  time: 0,
  value: 0,
};

describe("KeyframeTimelineEditor", () => {
  it("is controlled by open and closes from its dialog control", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <KeyframeTimelineEditor
        objects={objects}
        onClose={onClose}
        open={false}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(
      <KeyframeTimelineEditor objects={objects} onClose={onClose} open />,
    );
    expect(
      screen.getByRole("dialog", { name: "Keyframe timeline" }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Close keyframe editor" }),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders full 3D, model capability, and multi-object track labels", () => {
    render(
      <KeyframeTimelineEditor objects={objects} onClose={() => {}} open />,
    );

    expect(
      screen.getByRole("button", { name: "Select Robot Position Z track" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Select Robot Rotation X track" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Select Robot Scale Z track" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Select Robot Opacity track" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Select Robot Material track" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Select Robot Morph · Smile track" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Toggle Caption tracks" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Select Caption Position Z track" }),
    ).toBeNull();
  });

  it("adds, edits, duplicates, and deletes keyframes through local UI", () => {
    const onChange = vi.fn();
    render(
      <KeyframeTimelineEditor
        defaultKeyframes={[startingKeyframe]}
        objects={objects}
        onClose={() => {}}
        onKeyframesChange={onChange}
        open
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Keyframe Robot Position X at 0.00 s",
      }),
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Keyframe time" }),
      {
        target: { value: "1.25" },
      },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Keyframe value" }),
      { target: { value: "120" } },
    );
    fireEvent.change(
      screen.getByRole("combobox", { name: "Keyframe easing" }),
      {
        target: { value: "custom" },
      },
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Custom curve" }), {
      target: { value: "0.2, 0.8, 0.3, 1" },
    });

    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        customCurve: "0.2, 0.8, 0.3, 1",
        easing: "custom",
        time: 1.25,
        value: 120,
      }),
    ]);

    fireEvent.click(
      screen.getByRole("button", { name: "Duplicate selected keyframe" }),
    );
    expect(onChange.mock.calls.at(-1)?.[0]).toHaveLength(2);

    fireEvent.click(
      screen.getByRole("button", { name: "Delete selected keyframe" }),
    );
    expect(onChange.mock.calls.at(-1)?.[0]).toHaveLength(1);

    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Playhead time" }),
      {
        target: { value: "2" },
      },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Add keyframe at playhead" }),
    );
    expect(onChange.mock.calls.at(-1)?.[0]).toHaveLength(2);
  });

  it("offers every easing and changes playback and zoom controls", () => {
    render(
      <KeyframeTimelineEditor
        defaultKeyframes={[startingKeyframe]}
        objects={objects.slice(0, 1)}
        onClose={() => {}}
        open
      />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Keyframe Robot Position X at 0.00 s",
      }),
    );
    const easing = screen.getByRole("combobox", { name: "Keyframe easing" });
    expect(easing).toHaveTextContent("Linear");
    expect(easing).toHaveTextContent("Ease In");
    expect(easing).toHaveTextContent("Ease Out");
    expect(easing).toHaveTextContent("Ease In Out");
    expect(easing).toHaveTextContent("Hold");
    expect(easing).toHaveTextContent("Custom Curve");

    fireEvent.click(screen.getByRole("button", { name: "Play timeline" }));
    expect(screen.getByRole("button", { name: "Pause timeline" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Pause timeline" }));

    fireEvent.click(screen.getByRole("button", { name: "Zoom timeline in" }));
    expect(
      screen.getByRole("status", { name: "Timeline zoom" }),
    ).toHaveTextContent("125%");
  });

  it("supports effect-specific tracks without adding root transform tracks", () => {
    render(
      <KeyframeTimelineEditor
        objects={[
          {
            additionalTracks: [
              {
                defaultValue: 35,
                label: "Camera Field of View",
                property: "custom:camera-fov",
                unit: "°",
              },
            ],
            dimension: "3d",
            id: "artwork-camera",
            includeBaseTracks: false,
            name: "Artwork Camera",
          },
        ]}
        onClose={() => {}}
        open
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Select Artwork Camera Camera Field of View track",
      }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: "Select Artwork Camera Position X track",
      }),
    ).toBeNull();
  });
});
