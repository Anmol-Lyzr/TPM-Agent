"use client";

export function MomMarkdown({ content }: { content: string }) {
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
      {content}
    </p>
  );
}
