import { AgentConsolePanel } from "@/components/console/AgentConsolePanel";

export const metadata = {
  title: "TPM Agent · Agent Console",
  description: "Ask questions about your meeting data — powered by Lyzr AI",
};

export default function ConsolePage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AgentConsolePanel />
    </div>
  );
}
