export type PathPoint = {
  x: number;
  y: number;
  handleIn?: { x: number; y: number };
  handleOut?: { x: number; y: number };
};

export type VectorPath = {
  points: PathPoint[];
  closed?: boolean;
};
