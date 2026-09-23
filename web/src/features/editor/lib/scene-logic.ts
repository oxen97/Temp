/** Serializable scene routing rules shared by the editor and preview. */
export type SceneLogicEventSource =
  | "on-trigger"
  | "on-start"
  | "on-complete"
  | "on-reset"
  | "on-collision"
  | "custom-event";

export type SceneLogicAction =
  "go-to-scene" | "previous-scene" | "restart-scene" | "end-artwork";

export type SceneLogicCondition = {
  id: string;
  kind: "variable" | "visited" | "count";
  operator: string;
  pageId: string;
  value: string;
  variableName: string;
};

export type SceneLogicVariableAction = {
  id: string;
  operation: "set" | "increase" | "decrease" | "toggle";
  value: string;
  variableName: string;
};

export type SceneLogicRule = {
  action: SceneLogicAction;
  conditions: SceneLogicCondition[];
  customEventName: string;
  eventSource: SceneLogicEventSource;
  id: string;
  interactionId: string;
  objectId: string;
  targetPageId: string;
  variableActions: SceneLogicVariableAction[];
};

export type SceneLogicEvent = {
  objectId: string;
  interactionId: string;
  eventSource: SceneLogicEventSource;
  customEventName?: string;
};

export type SceneLogicState = {
  variables: Record<string, string | number | boolean>;
  visitedPageIds: string[];
  triggerCounts: Record<string, number>;
  history: string[];
};

export type SceneLogicResult = {
  state: SceneLogicState;
  targetPageId?: string;
  matchedRuleId?: string;
  restart?: boolean;
  ended?: boolean;
};

export function createSceneLogicRule({
  id,
  objectId = "",
  interactionId = "",
  targetPageId = "",
  eventSource = "on-trigger",
}: {
  id: string;
  objectId?: string;
  interactionId?: string;
  targetPageId?: string;
  eventSource?: SceneLogicEventSource;
}): SceneLogicRule {
  return {
    action: "go-to-scene",
    conditions: [],
    customEventName: "",
    eventSource,
    id,
    interactionId,
    objectId,
    targetPageId,
    variableActions: [],
  };
}

export function createSceneLogicState(initialPageId: string): SceneLogicState {
  return {
    variables: {},
    visitedPageIds: initialPageId ? [initialPageId] : [],
    triggerCounts: {},
    history: [],
  };
}

/** The simple route shown beside a Click/Tap interaction in INTERACTION. */
export function findDirectSceneRoute(
  rules: readonly SceneLogicRule[],
  objectId: string,
  interactionId: string,
): SceneLogicRule | undefined {
  return rules.find(
    (rule) =>
      rule.objectId === objectId &&
      rule.interactionId === interactionId &&
      rule.eventSource === "on-trigger" &&
      rule.action === "go-to-scene" &&
      rule.conditions.length === 0 &&
      rule.variableActions.length === 0,
  );
}

/** Add, change, or remove the direct scene destination for one interaction. */
export function upsertDirectSceneRoute(
  rules: readonly SceneLogicRule[],
  {
    objectId,
    interactionId,
    targetPageId,
  }: { objectId: string; interactionId: string; targetPageId: string },
): SceneLogicRule[] {
  const existing = findDirectSceneRoute(rules, objectId, interactionId);
  if (existing) {
    return targetPageId
      ? rules.map((rule) =>
          rule === existing ? { ...rule, targetPageId } : rule,
        )
      : rules.filter((rule) => rule !== existing);
  }
  if (!targetPageId) return [...rules];
  const baseId = `scene-route:${objectId}:${interactionId}`;
  let id = baseId;
  let suffix = 2;
  while (rules.some((rule) => rule.id === id)) id = `${baseId}:${suffix++}`;
  return [
    ...rules,
    createSceneLogicRule({ id, objectId, interactionId, targetPageId }),
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const eventSources = new Set<SceneLogicEventSource>([
  "on-trigger",
  "on-start",
  "on-complete",
  "on-reset",
  "on-collision",
  "custom-event",
]);
const sceneActions = new Set<SceneLogicAction>([
  "go-to-scene",
  "previous-scene",
  "restart-scene",
  "end-artwork",
]);

/** Ignore malformed saved entries without discarding the rest of a scene. */
export function normalizeSceneLogicRules(value: unknown): SceneLogicRule[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate, index) => {
    if (!isRecord(candidate)) return [];
    const rule = createSceneLogicRule({
      id:
        typeof candidate.id === "string" ? candidate.id : `branch-${index + 1}`,
      objectId:
        typeof candidate.objectId === "string" ? candidate.objectId : "",
      interactionId:
        typeof candidate.interactionId === "string"
          ? candidate.interactionId
          : "",
      targetPageId:
        typeof candidate.targetPageId === "string"
          ? candidate.targetPageId
          : "",
    });
    if (eventSources.has(candidate.eventSource as SceneLogicEventSource)) {
      rule.eventSource = candidate.eventSource as SceneLogicEventSource;
    }
    if (sceneActions.has(candidate.action as SceneLogicAction)) {
      rule.action = candidate.action as SceneLogicAction;
    }
    rule.customEventName =
      typeof candidate.customEventName === "string"
        ? candidate.customEventName
        : "";
    rule.conditions = Array.isArray(candidate.conditions)
      ? candidate.conditions.flatMap((raw, conditionIndex) => {
          if (
            !isRecord(raw) ||
            !["variable", "visited", "count"].includes(String(raw.kind))
          )
            return [];
          return [
            {
              id:
                typeof raw.id === "string"
                  ? raw.id
                  : `condition-${conditionIndex + 1}`,
              kind: raw.kind as SceneLogicCondition["kind"],
              operator:
                typeof raw.operator === "string" ? raw.operator : "equals",
              pageId: typeof raw.pageId === "string" ? raw.pageId : "",
              value: typeof raw.value === "string" ? raw.value : "",
              variableName:
                typeof raw.variableName === "string" ? raw.variableName : "",
            },
          ];
        })
      : [];
    rule.variableActions = Array.isArray(candidate.variableActions)
      ? candidate.variableActions.flatMap((raw, actionIndex) => {
          if (
            !isRecord(raw) ||
            !["set", "increase", "decrease", "toggle"].includes(
              String(raw.operation),
            )
          )
            return [];
          return [
            {
              id:
                typeof raw.id === "string"
                  ? raw.id
                  : `variable-action-${actionIndex + 1}`,
              operation: raw.operation as SceneLogicVariableAction["operation"],
              value: typeof raw.value === "string" ? raw.value : "",
              variableName:
                typeof raw.variableName === "string" ? raw.variableName : "",
            },
          ];
        })
      : [];
    return [rule];
  });
}

function comparable(value: string | number | boolean | undefined) {
  if (value === undefined) return "";
  return value;
}

function matchesComparison(
  actual: string | number | boolean | undefined,
  operator: string,
  expected: string,
) {
  const left = comparable(actual);
  if (operator === "is-true") return left === true || left === "true";
  if (operator === "is-false")
    return left === false || left === "false" || left === "";
  const leftNumber = Number(left);
  const rightNumber = Number(expected);
  const numeric =
    String(left).trim() !== "" &&
    expected.trim() !== "" &&
    Number.isFinite(leftNumber) &&
    Number.isFinite(rightNumber);
  if (operator === "equals")
    return numeric ? leftNumber === rightNumber : String(left) === expected;
  if (operator === "not-equals")
    return numeric ? leftNumber !== rightNumber : String(left) !== expected;
  if (!numeric) return false;
  if (operator === "greater-than") return leftNumber > rightNumber;
  if (operator === "at-least") return leftNumber >= rightNumber;
  if (operator === "less-than") return leftNumber < rightNumber;
  if (operator === "at-most") return leftNumber <= rightNumber;
  return false;
}

function eventKey(pageId: string, event: SceneLogicEvent) {
  return `${pageId}:${event.objectId}:${event.interactionId}:${event.eventSource}`;
}

function matchesCondition(
  condition: SceneLogicCondition,
  state: SceneLogicState,
  count: number,
) {
  if (condition.kind === "visited") {
    const visited = state.visitedPageIds.includes(condition.pageId);
    return condition.operator === "has-visited"
      ? visited
      : condition.operator === "not-visited"
        ? !visited
        : false;
  }
  if (condition.kind === "count") {
    return matchesComparison(count, condition.operator, condition.value);
  }
  if (!condition.variableName.trim()) return false;
  return matchesComparison(
    state.variables[condition.variableName],
    condition.operator,
    condition.value,
  );
}

function variableValue(value: string): string | number | boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value.trim() !== "" && Number.isFinite(Number(value)))
    return Number(value);
  return value;
}

/** First matching branch wins. State is immutable so preview callers can keep it in a ref. */
export function runSceneLogicEvent({
  pageId,
  pages,
  rules,
  event,
  state,
}: {
  pageId: string;
  pages: readonly { id: string }[];
  rules: readonly SceneLogicRule[];
  event: SceneLogicEvent;
  state: SceneLogicState;
}): SceneLogicResult {
  const key = eventKey(pageId, event);
  const count = (state.triggerCounts[key] ?? 0) + 1;
  const nextState: SceneLogicState = {
    ...state,
    triggerCounts: { ...state.triggerCounts, [key]: count },
    visitedPageIds: state.visitedPageIds.includes(pageId)
      ? state.visitedPageIds
      : [...state.visitedPageIds, pageId],
  };
  const rule = rules.find(
    (candidate) =>
      candidate.objectId === event.objectId &&
      candidate.interactionId === event.interactionId &&
      candidate.eventSource === event.eventSource &&
      (candidate.eventSource !== "custom-event" ||
        candidate.customEventName === event.customEventName) &&
      candidate.conditions.every((condition) =>
        matchesCondition(condition, nextState, count),
      ),
  );
  if (!rule) return { state: nextState };

  if (rule.variableActions.length) {
    const variables = { ...nextState.variables };
    for (const action of rule.variableActions) {
      const name = action.variableName.trim();
      if (!name) continue;
      if (action.operation === "set")
        variables[name] = variableValue(action.value);
      else if (action.operation === "toggle")
        variables[name] = !Boolean(variables[name]);
      else {
        const amount = Number(action.value);
        variables[name] =
          (Number(variables[name]) || 0) +
          (action.operation === "increase" ? 1 : -1) *
            (Number.isFinite(amount) ? amount : 0);
      }
    }
    nextState.variables = variables;
  }

  if (rule.action === "end-artwork") {
    return { state: nextState, matchedRuleId: rule.id, ended: true };
  }
  const targetPageId =
    rule.action === "go-to-scene"
      ? rule.targetPageId
      : rule.action === "previous-scene"
        ? nextState.history.at(-1)
        : pageId;
  if (!targetPageId || !pages.some((page) => page.id === targetPageId)) {
    return { state: nextState, matchedRuleId: rule.id };
  }
  if (rule.action === "previous-scene") {
    nextState.history = nextState.history.slice(0, -1);
  } else if (targetPageId !== pageId) {
    nextState.history = [...nextState.history, pageId];
  }
  if (!nextState.visitedPageIds.includes(targetPageId)) {
    nextState.visitedPageIds = [...nextState.visitedPageIds, targetPageId];
  }
  return {
    state: nextState,
    targetPageId,
    matchedRuleId: rule.id,
    restart: rule.action === "restart-scene",
  };
}
