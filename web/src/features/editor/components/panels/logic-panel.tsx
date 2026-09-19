"use client";

import { ArrowRight, Braces, GitBranch, Plus, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import styles from "./logic-panel.module.css";

export type LogicPanelPage = {
  id: string;
  name: string;
};

export type LogicPanelObject = {
  id: string;
  name: string;
  type?: string;
};

export type LogicPanelInteraction = {
  id: string;
  name: string;
  objectId?: string;
  triggerLabel?: string;
};

export type LogicPanelProps = {
  currentPageId: string | null;
  interactions?: readonly LogicPanelInteraction[];
  objects?: readonly LogicPanelObject[];
  pages: readonly LogicPanelPage[];
  selectedInteractionIds?: readonly string[];
  selectedObjectIds?: readonly string[];
};

type EventSource =
  | "on-trigger"
  | "on-start"
  | "on-complete"
  | "on-reset"
  | "on-collision"
  | "custom-event";

type ConditionKind = "variable" | "visited" | "count";
type SceneAction =
  "go-to-scene" | "previous-scene" | "restart-scene" | "end-artwork";
type VariableOperation = "set" | "increase" | "decrease" | "toggle";

type LogicCondition = {
  id: string;
  kind: ConditionKind;
  operator: string;
  pageId: string;
  value: string;
  variableName: string;
};

type VariableAction = {
  id: string;
  operation: VariableOperation;
  value: string;
  variableName: string;
};

type BranchRule = {
  action: SceneAction;
  conditions: LogicCondition[];
  customEventName: string;
  eventSource: EventSource;
  id: string;
  interactionId: string;
  objectId: string;
  targetPageId: string;
  variableActions: VariableAction[];
};

const eventSourceOptions: { label: string; value: EventSource }[] = [
  { label: "On Trigger", value: "on-trigger" },
  { label: "On Start", value: "on-start" },
  { label: "On Complete", value: "on-complete" },
  { label: "On Reset", value: "on-reset" },
  { label: "On Collision", value: "on-collision" },
  { label: "Custom Event", value: "custom-event" },
];

const variableOperators = [
  { label: "Equals", value: "equals" },
  { label: "Does not equal", value: "not-equals" },
  { label: "Greater than", value: "greater-than" },
  { label: "At least", value: "at-least" },
  { label: "Less than", value: "less-than" },
  { label: "At most", value: "at-most" },
  { label: "Is true", value: "is-true" },
  { label: "Is false", value: "is-false" },
];

const countOperators = [
  { label: "Equals", value: "equals" },
  { label: "Does not equal", value: "not-equals" },
  { label: "Greater than", value: "greater-than" },
  { label: "At least", value: "at-least" },
  { label: "Less than", value: "less-than" },
  { label: "At most", value: "at-most" },
];

const actionOptions: { label: string; value: SceneAction }[] = [
  { label: "Go to Scene", value: "go-to-scene" },
  { label: "Previous Scene", value: "previous-scene" },
  { label: "Restart Scene", value: "restart-scene" },
  { label: "End Artwork", value: "end-artwork" },
];

const variableActionOptions: {
  label: string;
  value: VariableOperation;
}[] = [
  { label: "Set", value: "set" },
  { label: "Increase", value: "increase" },
  { label: "Decrease", value: "decrease" },
  { label: "Toggle", value: "toggle" },
];

function nextPageId(
  pages: readonly LogicPanelPage[],
  currentPageId: string | null,
) {
  if (pages.length === 0) return "";
  const currentIndex = pages.findIndex((page) => page.id === currentPageId);
  return pages[(currentIndex + 1 + pages.length) % pages.length]?.id ?? "";
}

function SelectField({
  ariaLabel,
  children,
  disabled,
  label,
  onChange,
  value,
}: {
  ariaLabel: string;
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select
        aria-label={ariaLabel}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}

function TextField({
  ariaLabel,
  inputMode,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  ariaLabel: string;
  inputMode?: "decimal" | "numeric";
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "number" | "text";
  value: string;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        aria-label={ariaLabel}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

export function LogicPanel({
  currentPageId,
  interactions = [],
  objects = [],
  pages,
  selectedInteractionIds = [],
  selectedObjectIds = [],
}: LogicPanelProps) {
  const initialObjectId =
    selectedObjectIds.find((id) =>
      objects.some((object) => object.id === id),
    ) ??
    objects[0]?.id ??
    "";
  const initialInteractionId =
    selectedInteractionIds.find((id) =>
      interactions.some((interaction) => interaction.id === id),
    ) ??
    interactions.find(
      (interaction) =>
        !interaction.objectId || interaction.objectId === initialObjectId,
    )?.id ??
    "";
  const defaultTargetPageId = nextPageId(pages, currentPageId);
  const nextId = useRef(2);
  const [rules, setRules] = useState<BranchRule[]>([
    {
      action: "go-to-scene",
      conditions: [],
      customEventName: "",
      eventSource: "on-complete",
      id: "branch-1",
      interactionId: initialInteractionId,
      objectId: initialObjectId,
      targetPageId: defaultTargetPageId,
      variableActions: [],
    },
  ]);

  const currentPage = useMemo(
    () => pages.find((page) => page.id === currentPageId),
    [currentPageId, pages],
  );

  const updateRule = (
    ruleId: string,
    update: (rule: BranchRule) => BranchRule,
  ) => {
    setRules((current) =>
      current.map((rule) => (rule.id === ruleId ? update(rule) : rule)),
    );
  };

  const addRule = () => {
    const id = nextId.current++;
    setRules((current) => [
      ...current,
      {
        action: "go-to-scene",
        conditions: [],
        customEventName: "",
        eventSource: "on-trigger",
        id: `branch-${id}`,
        interactionId: initialInteractionId,
        objectId: initialObjectId,
        targetPageId: defaultTargetPageId,
        variableActions: [],
      },
    ]);
  };

  return (
    <section
      aria-label="Logic settings"
      className={styles.panel}
      role="tabpanel"
    >
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>SCENE LOGIC</span>
          <h2>Branching rules</h2>
        </div>
        <span className={styles.ruleCount}>{rules.length}</span>
      </header>

      <div className={styles.scopeCard}>
        <GitBranch aria-hidden="true" size={16} strokeWidth={1.7} />
        <div>
          <strong>{currentPage?.name ?? "No active scene"}</strong>
          <span>Route interaction events to another scene.</span>
        </div>
      </div>

      <div className={styles.ruleList}>
        {rules.map((rule, ruleIndex) => {
          const availableInteractions = interactions.filter(
            (interaction) =>
              !interaction.objectId || interaction.objectId === rule.objectId,
          );
          const effectiveInteractionId = availableInteractions.some(
            (interaction) => interaction.id === rule.interactionId,
          )
            ? rule.interactionId
            : (availableInteractions[0]?.id ?? "");

          return (
            <article className={styles.ruleCard} key={rule.id}>
              <div className={styles.ruleHeader}>
                <div>
                  <span>BRANCH {String(ruleIndex + 1).padStart(2, "0")}</span>
                  <strong>
                    {eventSourceOptions.find(
                      (option) => option.value === rule.eventSource,
                    )?.label ?? "Event"}
                  </strong>
                </div>
                <button
                  aria-label={`Remove branch ${ruleIndex + 1}`}
                  className={styles.iconButton}
                  disabled={rules.length === 1}
                  onClick={() =>
                    setRules((current) =>
                      current.filter((candidate) => candidate.id !== rule.id),
                    )
                  }
                  title={
                    rules.length === 1
                      ? "At least one branch is required"
                      : "Remove branch"
                  }
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={13} strokeWidth={1.6} />
                </button>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>
                  <span className={styles.step}>1</span>
                  <div>
                    <strong>WHEN</strong>
                    <small>Interaction event</small>
                  </div>
                </div>

                <SelectField
                  ariaLabel="Event Source"
                  label="Event Source"
                  onChange={(value) =>
                    updateRule(rule.id, (current) => ({
                      ...current,
                      eventSource: value as EventSource,
                    }))
                  }
                  value={rule.eventSource}
                >
                  {eventSourceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  ariaLabel="Source Object"
                  disabled={objects.length === 0}
                  label="Object"
                  onChange={(objectId) => {
                    const firstInteraction = interactions.find(
                      (interaction) =>
                        !interaction.objectId ||
                        interaction.objectId === objectId,
                    );
                    updateRule(rule.id, (current) => ({
                      ...current,
                      interactionId: firstInteraction?.id ?? "",
                      objectId,
                    }));
                  }}
                  value={rule.objectId}
                >
                  {objects.length === 0 ? (
                    <option value="">No object selected</option>
                  ) : null}
                  {objects.map((object) => (
                    <option key={object.id} value={object.id}>
                      {object.name}
                      {object.type ? ` · ${object.type}` : ""}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  ariaLabel="Source Interaction"
                  disabled={availableInteractions.length === 0}
                  label="Interaction"
                  onChange={(interactionId) =>
                    updateRule(rule.id, (current) => ({
                      ...current,
                      interactionId,
                    }))
                  }
                  value={effectiveInteractionId}
                >
                  {availableInteractions.length === 0 ? (
                    <option value="">No interactions available</option>
                  ) : null}
                  {availableInteractions.map((interaction) => (
                    <option key={interaction.id} value={interaction.id}>
                      {interaction.name}
                      {interaction.triggerLabel
                        ? ` · ${interaction.triggerLabel}`
                        : ""}
                    </option>
                  ))}
                </SelectField>

                {rule.eventSource === "custom-event" ? (
                  <TextField
                    ariaLabel="Custom Event Name"
                    label="Event Name"
                    onChange={(customEventName) =>
                      updateRule(rule.id, (current) => ({
                        ...current,
                        customEventName,
                      }))
                    }
                    placeholder="e.g. quiz.correct"
                    value={rule.customEventName}
                  />
                ) : null}
              </div>

              <div className={styles.connector} aria-hidden="true">
                <ArrowRight size={13} strokeWidth={1.5} />
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>
                  <span className={styles.step}>2</span>
                  <div>
                    <strong>IF</strong>
                    <small>All conditions match</small>
                  </div>
                  <span className={styles.optional}>OPTIONAL</span>
                </div>

                {rule.conditions.length === 0 ? (
                  <div className={styles.emptyState}>
                    No conditions — this event always continues.
                  </div>
                ) : (
                  <div className={styles.conditionList}>
                    {rule.conditions.map((condition, conditionIndex) => (
                      <div className={styles.conditionCard} key={condition.id}>
                        <div className={styles.conditionHeading}>
                          <span>{conditionIndex === 0 ? "WHERE" : "AND"}</span>
                          <button
                            aria-label={`Remove condition ${conditionIndex + 1}`}
                            className={styles.removeTextButton}
                            onClick={() =>
                              updateRule(rule.id, (current) => ({
                                ...current,
                                conditions: current.conditions.filter(
                                  (candidate) => candidate.id !== condition.id,
                                ),
                              }))
                            }
                            type="button"
                          >
                            Remove
                          </button>
                        </div>

                        <SelectField
                          ariaLabel={`Condition ${conditionIndex + 1} Type`}
                          label="Condition"
                          onChange={(kind) =>
                            updateRule(rule.id, (current) => ({
                              ...current,
                              conditions: current.conditions.map((candidate) =>
                                candidate.id === condition.id
                                  ? {
                                      ...candidate,
                                      kind: kind as ConditionKind,
                                      operator:
                                        kind === "visited"
                                          ? "has-visited"
                                          : "equals",
                                    }
                                  : candidate,
                              ),
                            }))
                          }
                          value={condition.kind}
                        >
                          <option value="variable">Variable</option>
                          <option value="visited">Scene visited</option>
                          <option value="count">Trigger count</option>
                        </SelectField>

                        {condition.kind === "variable" ? (
                          <>
                            <TextField
                              ariaLabel={`Condition ${conditionIndex + 1} Variable Name`}
                              label="Variable"
                              onChange={(variableName) =>
                                updateRule(rule.id, (current) => ({
                                  ...current,
                                  conditions: current.conditions.map(
                                    (candidate) =>
                                      candidate.id === condition.id
                                        ? { ...candidate, variableName }
                                        : candidate,
                                  ),
                                }))
                              }
                              placeholder="score"
                              value={condition.variableName}
                            />
                            <SelectField
                              ariaLabel={`Condition ${conditionIndex + 1} Operator`}
                              label="Operator"
                              onChange={(operator) =>
                                updateRule(rule.id, (current) => ({
                                  ...current,
                                  conditions: current.conditions.map(
                                    (candidate) =>
                                      candidate.id === condition.id
                                        ? { ...candidate, operator }
                                        : candidate,
                                  ),
                                }))
                              }
                              value={condition.operator}
                            >
                              {variableOperators.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </SelectField>
                            {!["is-true", "is-false"].includes(
                              condition.operator,
                            ) ? (
                              <TextField
                                ariaLabel={`Condition ${conditionIndex + 1} Value`}
                                label="Value"
                                onChange={(value) =>
                                  updateRule(rule.id, (current) => ({
                                    ...current,
                                    conditions: current.conditions.map(
                                      (candidate) =>
                                        candidate.id === condition.id
                                          ? { ...candidate, value }
                                          : candidate,
                                    ),
                                  }))
                                }
                                placeholder="10"
                                value={condition.value}
                              />
                            ) : null}
                          </>
                        ) : null}

                        {condition.kind === "visited" ? (
                          <>
                            <SelectField
                              ariaLabel={`Condition ${conditionIndex + 1} Scene`}
                              disabled={pages.length === 0}
                              label="Scene"
                              onChange={(pageId) =>
                                updateRule(rule.id, (current) => ({
                                  ...current,
                                  conditions: current.conditions.map(
                                    (candidate) =>
                                      candidate.id === condition.id
                                        ? { ...candidate, pageId }
                                        : candidate,
                                  ),
                                }))
                              }
                              value={condition.pageId}
                            >
                              {pages.length === 0 ? (
                                <option value="">No scenes available</option>
                              ) : null}
                              {pages.map((page) => (
                                <option key={page.id} value={page.id}>
                                  {page.name}
                                </option>
                              ))}
                            </SelectField>
                            <SelectField
                              ariaLabel={`Condition ${conditionIndex + 1} Visit State`}
                              label="State"
                              onChange={(operator) =>
                                updateRule(rule.id, (current) => ({
                                  ...current,
                                  conditions: current.conditions.map(
                                    (candidate) =>
                                      candidate.id === condition.id
                                        ? { ...candidate, operator }
                                        : candidate,
                                  ),
                                }))
                              }
                              value={condition.operator}
                            >
                              <option value="has-visited">
                                Has been visited
                              </option>
                              <option value="not-visited">
                                Has not been visited
                              </option>
                            </SelectField>
                          </>
                        ) : null}

                        {condition.kind === "count" ? (
                          <>
                            <SelectField
                              ariaLabel={`Condition ${conditionIndex + 1} Count Operator`}
                              label="Operator"
                              onChange={(operator) =>
                                updateRule(rule.id, (current) => ({
                                  ...current,
                                  conditions: current.conditions.map(
                                    (candidate) =>
                                      candidate.id === condition.id
                                        ? { ...candidate, operator }
                                        : candidate,
                                  ),
                                }))
                              }
                              value={condition.operator}
                            >
                              {countOperators.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </SelectField>
                            <TextField
                              ariaLabel={`Condition ${conditionIndex + 1} Count`}
                              inputMode="numeric"
                              label="Count"
                              onChange={(value) =>
                                updateRule(rule.id, (current) => ({
                                  ...current,
                                  conditions: current.conditions.map(
                                    (candidate) =>
                                      candidate.id === condition.id
                                        ? { ...candidate, value }
                                        : candidate,
                                  ),
                                }))
                              }
                              type="number"
                              value={condition.value}
                            />
                          </>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  className={styles.addButton}
                  onClick={() => {
                    const conditionId = nextId.current++;
                    updateRule(rule.id, (current) => ({
                      ...current,
                      conditions: [
                        ...current.conditions,
                        {
                          id: `condition-${conditionId}`,
                          kind: "variable",
                          operator: "equals",
                          pageId: currentPageId ?? pages[0]?.id ?? "",
                          value: "",
                          variableName: "",
                        },
                      ],
                    }));
                  }}
                  type="button"
                >
                  <Plus aria-hidden="true" size={12} strokeWidth={1.7} />
                  Add condition
                </button>
              </div>

              <div className={styles.connector} aria-hidden="true">
                <ArrowRight size={13} strokeWidth={1.5} />
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>
                  <span className={styles.step}>3</span>
                  <div>
                    <strong>THEN</strong>
                    <small>Scene result</small>
                  </div>
                </div>

                <SelectField
                  ariaLabel="Scene Action"
                  label="Action"
                  onChange={(action) =>
                    updateRule(rule.id, (current) => ({
                      ...current,
                      action: action as SceneAction,
                    }))
                  }
                  value={rule.action}
                >
                  {actionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>

                {rule.action === "go-to-scene" ? (
                  <SelectField
                    ariaLabel="Target Scene"
                    disabled={pages.length === 0}
                    label="Target Scene"
                    onChange={(targetPageId) =>
                      updateRule(rule.id, (current) => ({
                        ...current,
                        targetPageId,
                      }))
                    }
                    value={rule.targetPageId}
                  >
                    {pages.length === 0 ? (
                      <option value="">No scenes available</option>
                    ) : null}
                    {pages.map((page) => (
                      <option key={page.id} value={page.id}>
                        {page.name}
                        {page.id === currentPageId ? " · Current" : ""}
                      </option>
                    ))}
                  </SelectField>
                ) : null}

                <div className={styles.subsectionHeading}>
                  <div>
                    <Braces aria-hidden="true" size={13} strokeWidth={1.6} />
                    <span>VARIABLE ACTIONS</span>
                  </div>
                  <small>Before scene action</small>
                </div>

                {rule.variableActions.map((variableAction, actionIndex) => (
                  <div
                    className={styles.variableAction}
                    key={variableAction.id}
                  >
                    <div className={styles.variableActionHeader}>
                      <span>UPDATE {actionIndex + 1}</span>
                      <button
                        aria-label={`Remove variable action ${actionIndex + 1}`}
                        className={styles.removeTextButton}
                        onClick={() =>
                          updateRule(rule.id, (current) => ({
                            ...current,
                            variableActions: current.variableActions.filter(
                              (candidate) => candidate.id !== variableAction.id,
                            ),
                          }))
                        }
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                    <TextField
                      ariaLabel={`Variable Action ${actionIndex + 1} Name`}
                      label="Variable"
                      onChange={(variableName) =>
                        updateRule(rule.id, (current) => ({
                          ...current,
                          variableActions: current.variableActions.map(
                            (candidate) =>
                              candidate.id === variableAction.id
                                ? { ...candidate, variableName }
                                : candidate,
                          ),
                        }))
                      }
                      placeholder="score"
                      value={variableAction.variableName}
                    />
                    <SelectField
                      ariaLabel={`Variable Action ${actionIndex + 1} Operation`}
                      label="Operation"
                      onChange={(operation) =>
                        updateRule(rule.id, (current) => ({
                          ...current,
                          variableActions: current.variableActions.map(
                            (candidate) =>
                              candidate.id === variableAction.id
                                ? {
                                    ...candidate,
                                    operation: operation as VariableOperation,
                                  }
                                : candidate,
                          ),
                        }))
                      }
                      value={variableAction.operation}
                    >
                      {variableActionOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </SelectField>
                    {variableAction.operation !== "toggle" ? (
                      <TextField
                        ariaLabel={`Variable Action ${actionIndex + 1} Value`}
                        label="Value"
                        onChange={(value) =>
                          updateRule(rule.id, (current) => ({
                            ...current,
                            variableActions: current.variableActions.map(
                              (candidate) =>
                                candidate.id === variableAction.id
                                  ? { ...candidate, value }
                                  : candidate,
                            ),
                          }))
                        }
                        placeholder={
                          variableAction.operation === "set" ? "Value" : "1"
                        }
                        value={variableAction.value}
                      />
                    ) : null}
                  </div>
                ))}

                <button
                  className={styles.addButton}
                  onClick={() => {
                    const variableActionId = nextId.current++;
                    updateRule(rule.id, (current) => ({
                      ...current,
                      variableActions: [
                        ...current.variableActions,
                        {
                          id: `variable-action-${variableActionId}`,
                          operation: "set",
                          value: "",
                          variableName: "",
                        },
                      ],
                    }));
                  }}
                  type="button"
                >
                  <Plus aria-hidden="true" size={12} strokeWidth={1.7} />
                  Add variable action
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <button className={styles.addRuleButton} onClick={addRule} type="button">
        <Plus aria-hidden="true" size={14} strokeWidth={1.8} />
        Add branch rule
      </button>

      <aside className={styles.boundaryNote}>
        <strong>Scene routing only</strong>
        <span>
          Motion, effects, timing, and animation remain editable in INTERACTION.
          Logic only listens to their events and chooses the next scene.
        </span>
      </aside>
    </section>
  );
}
