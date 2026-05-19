"use client";

import Link from "next/link";
import {
  Book,
  Zap,
  ArrowRight,
  Calendar,
  ListTodo,
  Shield,
  FileText,
  MessageSquare,
} from "lucide-react";
import type { ComponentType } from "react";
import { TPM_SKILLS } from "@/lib/tpmAgentMetadata";

const SKILL_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "meeting-analysis": Zap,
  "project-plan": Calendar,
  "issue-tracker": ListTodo,
  "raid-log": Shield,
  "meeting-minutes": FileText,
  "agent-console": MessageSquare,
};

export function SkillsLibraryContent() {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <Book className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Skills</h2>
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          {TPM_SKILLS.length} skills
        </span>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        TPM capabilities exposed in this dashboard — launch from Workspace or Agent Console.
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {TPM_SKILLS.map((skill) => {
          const Icon = SKILL_ICONS[skill.id] ?? Zap;
          return (
            <Link key={skill.id} href={skill.href} className="group block">
              <div className="glass-card h-full rounded-xl p-5 transition-all group-hover:shadow-md">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {skill.name}
                      </h3>
                      <span
                        className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase ${skill.categoryColor}`}
                      >
                        {skill.category}
                      </span>
                    </div>
                    <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                      {skill.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                        <Zap className="h-3 w-3 text-primary/40" />
                        {skill.steps} steps
                      </span>
                      {skill.integrations.map((intg) => (
                        <span
                          key={intg}
                          className="rounded-lg bg-black/[0.04] px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {intg}
                        </span>
                      ))}
                      <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                        Open <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
