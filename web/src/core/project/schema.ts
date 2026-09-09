import { z } from "zod";

export const projectSceneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  elements: z.array(z.unknown()),
});

export const projectSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1),
  scenes: z.array(projectSceneSchema),
  updatedAt: z.iso.datetime(),
});

export type ExhibitionProject = z.infer<typeof projectSchema>;
