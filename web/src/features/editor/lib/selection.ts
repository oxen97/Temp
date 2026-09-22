import { type CanvasElement } from "@/features/editor/store/editor-store";

export function selectionIdsForElement(
  elements: CanvasElement[],
  element: CanvasElement,
) {
  if (element.locked) return [];
  return element.groupId
    ? elements
        .filter(
          (candidate) =>
            candidate.groupId === element.groupId && !candidate.locked,
        )
        .map((candidate) => candidate.id)
    : [element.id];
}

export function expandGroupedSelection(
  elements: CanvasElement[],
  ids: string[],
) {
  const selectedIds = new Set(ids);
  const selectedGroupIds = new Set(
    elements
      .filter((element) => selectedIds.has(element.id) && element.groupId)
      .map((element) => element.groupId as string),
  );
  return elements
    .filter(
      (element) =>
        !element.locked &&
        (selectedIds.has(element.id) ||
          Boolean(element.groupId && selectedGroupIds.has(element.groupId))),
    )
    .map((element) => element.id);
}
