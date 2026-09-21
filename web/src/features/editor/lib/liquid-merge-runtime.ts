import type { InteractionDefinition } from "@/features/editor/lib/interaction-model";

export type LiquidBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Distance between visible boxes; zero means the shapes overlap. */
export function liquidBoundsGap(a: LiquidBounds, b: LiquidBounds): number {
  const dx = Math.max(a.x - b.x - b.width, b.x - a.x - a.width, 0);
  const dy = Math.max(a.y - b.y - b.height, b.y - a.y - a.height, 0);
  return Math.hypot(dx, dy);
}

/** Pair activation is hysteretic so a bridge doesn't flicker near its edge. */
export function isLiquidPairActive(
  interaction: Pick<
    InteractionDefinition,
    "trigger" | "joinDistance" | "releaseDistance"
  >,
  gap: number,
  wasActive: boolean,
): boolean {
  if (!Number.isFinite(gap)) return false;
  if (interaction.trigger === "while-overlapping") return gap <= 0;
  if (interaction.trigger !== "near-target") return false;
  const join = Math.max(0, interaction.joinDistance);
  const release = Math.max(join, interaction.releaseDistance);
  return gap <= (wasActive ? release : join);
}
