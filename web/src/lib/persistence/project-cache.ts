import { openDB } from "idb";

import type { ExhibitionProject } from "@/core/project/schema";

const DATABASE_NAME = "amous-editor";
const DRAFT_STORE = "drafts";

const getDatabase = () =>
  openDB(DATABASE_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(DRAFT_STORE)) {
        database.createObjectStore(DRAFT_STORE);
      }
    },
  });

export async function cacheProject(project: ExhibitionProject) {
  const database = await getDatabase();
  await database.put(DRAFT_STORE, project, project.id);
}

export async function getCachedProject(projectId: string) {
  const database = await getDatabase();
  return database.get(DRAFT_STORE, projectId) as Promise<
    ExhibitionProject | undefined
  >;
}
