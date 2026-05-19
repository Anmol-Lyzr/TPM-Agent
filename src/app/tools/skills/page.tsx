import type { Metadata } from "next";
import { Book } from "lucide-react";

import { AgentMetadataPanel } from "@/components/tools/AgentMetadataPanel";
import { SkillsLibraryContent } from "@/components/tools/SkillsLibraryContent";
import { TPM_AGENT_METADATA } from "@/lib/tpmAgentMetadata";

export const metadata: Metadata = {
  title: "TPM Agent · Skills Library",
  description: TPM_AGENT_METADATA.description,
};

export default function SkillsLibraryPage() {
  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <header className="mb-6">
        <div className="mb-1 flex items-center gap-3">
          <Book className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Skills Library
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">{TPM_AGENT_METADATA.tagline}</p>
      </header>

      <AgentMetadataPanel />
      <SkillsLibraryContent />
    </div>
  );
}
