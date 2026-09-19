import { openDB } from "idb";

export const AMOUS_DATABASE_NAME = "amous-editor";
export const AMOUS_DATABASE_VERSION = 2;
export const DRAFT_STORE = "drafts";
export const MODEL_ASSET_STORE = "model-assets";

let databasePromise: ReturnType<typeof openDB> | null = null;

export function openAmousDatabase() {
  databasePromise ??= openDB(AMOUS_DATABASE_NAME, AMOUS_DATABASE_VERSION, {
    blocking() {
      const pending = databasePromise;
      databasePromise = null;
      void pending?.then((database) => database.close());
    },
    terminated() {
      databasePromise = null;
    },
    upgrade(database) {
      if (!database.objectStoreNames.contains(DRAFT_STORE)) {
        database.createObjectStore(DRAFT_STORE);
      }
      if (!database.objectStoreNames.contains(MODEL_ASSET_STORE)) {
        database.createObjectStore(MODEL_ASSET_STORE);
      }
    },
  });
  return databasePromise;
}

export async function resetDatabaseConnectionForTests() {
  const pending = databasePromise;
  databasePromise = null;
  (await pending)?.close();
}
