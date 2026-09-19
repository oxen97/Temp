import { type ExhibitionProject, migrateProject } from "@/core/project/schema";
import { DRAFT_STORE, openAmousDatabase } from "@/lib/persistence/database";

export async function cacheProject(project: ExhibitionProject) {
  const database = await openAmousDatabase();
  const current = migrateProject(project);
  await database.put(DRAFT_STORE, current, current.id);
}

export async function getCachedProject(projectId: string) {
  const database = await openAmousDatabase();
  const cached = await database.get(DRAFT_STORE, projectId);
  return cached ? migrateProject(cached) : undefined;
}
