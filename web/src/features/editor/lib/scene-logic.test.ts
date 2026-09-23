import { describe, expect, it } from "vitest";

import {
  createSceneLogicRule,
  createSceneLogicState,
  findDirectSceneRoute,
  normalizeSceneLogicRules,
  runSceneLogicEvent,
  upsertDirectSceneRoute,
} from "./scene-logic";

const pages = [{ id: "intro" }, { id: "gallery" }, { id: "ending" }];
const click = {
  objectId: "next-button",
  interactionId: "next-click",
  eventSource: "on-trigger" as const,
};

describe("scene logic", () => {
  it("edits the Interaction tab destination in the same rule list as Logic", () => {
    const created = upsertDirectSceneRoute([], {
      objectId: click.objectId,
      interactionId: click.interactionId,
      targetPageId: "gallery",
    });
    expect(
      findDirectSceneRoute(created, click.objectId, click.interactionId)
        ?.targetPageId,
    ).toBe("gallery");
    const updated = upsertDirectSceneRoute(created, {
      objectId: click.objectId,
      interactionId: click.interactionId,
      targetPageId: "ending",
    });
    expect(updated).toHaveLength(1);
    expect(updated[0].targetPageId).toBe("ending");
    expect(
      upsertDirectSceneRoute(updated, {
        objectId: click.objectId,
        interactionId: click.interactionId,
        targetPageId: "",
      }),
    ).toEqual([]);
  });

  it("routes a configured click interaction and retains visit history", () => {
    const first = runSceneLogicEvent({
      pageId: "intro",
      pages,
      rules: [
        createSceneLogicRule({
          id: "intro-next",
          objectId: click.objectId,
          interactionId: click.interactionId,
          targetPageId: "gallery",
        }),
      ],
      event: click,
      state: createSceneLogicState("intro"),
    });
    expect(first.targetPageId).toBe("gallery");
    expect(first.state.visitedPageIds).toEqual(["intro", "gallery"]);

    const previous = runSceneLogicEvent({
      pageId: "gallery",
      pages,
      rules: [
        {
          ...createSceneLogicRule({
            id: "gallery-back",
            objectId: click.objectId,
            interactionId: click.interactionId,
          }),
          action: "previous-scene",
        },
      ],
      event: click,
      state: first.state,
    });
    expect(previous.targetPageId).toBe("intro");
    expect(previous.state.history).toEqual([]);
  });

  it("honors event source, count condition, and variable actions", () => {
    const rule = {
      ...createSceneLogicRule({
        id: "after-two-clicks",
        objectId: click.objectId,
        interactionId: click.interactionId,
        targetPageId: "ending",
      }),
      conditions: [
        {
          id: "count-two",
          kind: "count" as const,
          operator: "at-least",
          pageId: "",
          value: "2",
          variableName: "",
        },
      ],
      variableActions: [
        {
          id: "score",
          operation: "increase" as const,
          value: "3",
          variableName: "score",
        },
      ],
    };
    const ignored = runSceneLogicEvent({
      pageId: "intro",
      pages,
      rules: [rule],
      event: { ...click, eventSource: "on-complete" },
      state: createSceneLogicState("intro"),
    });
    expect(ignored.targetPageId).toBeUndefined();
    const first = runSceneLogicEvent({
      pageId: "intro",
      pages,
      rules: [rule],
      event: click,
      state: ignored.state,
    });
    expect(first.targetPageId).toBeUndefined();
    const second = runSceneLogicEvent({
      pageId: "intro",
      pages,
      rules: [rule],
      event: click,
      state: first.state,
    });
    expect(second.targetPageId).toBe("ending");
    expect(second.state.variables.score).toBe(3);
  });

  it("ignores invalid targets and malformed saved entries", () => {
    const malformed = normalizeSceneLogicRules([
      null,
      {
        id: "safe",
        objectId: "next-button",
        interactionId: "next-click",
        targetPageId: "missing",
        action: "go-to-scene",
      },
    ]);
    expect(malformed).toHaveLength(1);
    const result = runSceneLogicEvent({
      pageId: "intro",
      pages,
      rules: malformed,
      event: click,
      state: createSceneLogicState("intro"),
    });
    expect(result.targetPageId).toBeUndefined();
  });
});
