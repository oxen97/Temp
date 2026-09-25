import {
  createProjectFile,
  downloadBlob,
  type ProjectFileExportResult,
  type ProjectLibrary,
} from "@/features/editor/lib/project-file";
import { useEditorStore } from "@/features/editor/store/editor-store";
import { getModelAsset } from "@/features/editor/three/model-assets";

const EMPTY_LIBRARY: ProjectLibrary = { media: [], modelAssets: [] };

/**
 * Saves the document currently in the editor store (plus the given ASSETS
 * panel uploads) as a `.amous` download. Reads the store directly so it also
 * works from the crash screen after the editor UI has stopped rendering.
 */
export async function saveEditorProjectToFile(
  projectId: string,
  library: ProjectLibrary = EMPTY_LIBRARY,
): Promise<ProjectFileExportResult> {
  const { activePageId, artboard, pages } = useEditorStore.getState();
  const result = await createProjectFile(
    { activePageId, artboard, pages },
    library,
    {
      loadModelAsset: async (assetId) => {
        const record = await getModelAsset(projectId, assetId);
        return record
          ? { blob: record.blob, metadata: record.metadata }
          : undefined;
      },
    },
  );
  downloadBlob(result.blob, result.fileName);
  return result;
}
