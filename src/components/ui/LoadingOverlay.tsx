"use client";

const DEFAULT_MESSAGE = "TPM Agent is processing your meeting…";
const DEFAULT_SUBMESSAGE =
  "Analyzing the transcript and preparing your dashboard. This usually takes about a minute.";

export function LoadingOverlay({
  message,
  submessage,
}: {
  message?: string;
  submessage?: string;
}) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-card/80 px-6 backdrop-blur-sm">
      <div className="h-1 w-full max-w-xs overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
      </div>
      <p className="mt-4 text-center text-sm font-medium text-foreground">
        {message ?? DEFAULT_MESSAGE}
      </p>
      <p className="mt-1.5 max-w-[240px] text-center text-xs leading-relaxed text-muted-foreground">
        {submessage ?? DEFAULT_SUBMESSAGE}
      </p>
    </div>
  );
}
