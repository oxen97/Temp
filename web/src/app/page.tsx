import { EditorErrorBoundary } from "@/features/editor/components/editor-error-boundary";
import { EditorShell } from "@/features/editor/components/editor-shell";

export default function Home() {
  return (
    <EditorErrorBoundary>
      <EditorShell />
    </EditorErrorBoundary>
  );
}
