"use client";

import {
  mdiAlertCircleOutline,
  mdiCheckCircleOutline,
  mdiCircleOffOutline,
  mdiLockOutline,
  mdiOpenInNew,
  mdiWrench,
} from "@mdi/js";
import { cn } from "@mp/shared";
import { useEffect, useState } from "react";

import { Icon } from "../../lib/icon";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SetupStepStatus = "complete" | "partial" | "not-started" | "missing";

export type SetupStep = {
  id: string;
  group: string;
  label: string;
  description: string;
  status: SetupStepStatus;
  filePath: string;
  vscodePath?: string;
  hint: string;
  todoCount?: number;
  blockedBy?: string[];
};

export type SetupStatusResponse = {
  platform: string;
  displayName: string;
  steps: SetupStep[];
};

// ── Status metadata ───────────────────────────────────────────────────────────

const STATUS_ICON: Record<SetupStepStatus, string> = {
  complete: mdiCheckCircleOutline,
  partial: mdiAlertCircleOutline,
  "not-started": mdiCircleOffOutline,
  missing: mdiCircleOffOutline,
};

const STATUS_COLOR: Record<SetupStepStatus, string> = {
  complete: "text-green-500",
  partial: "text-yellow-500",
  "not-started": "text-muted-foreground",
  missing: "text-muted-foreground",
};

const STATUS_LABEL: Record<SetupStepStatus, string> = {
  complete: "Done",
  partial: "Partial",
  "not-started": "To do",
  missing: "Missing",
};

// ── Step row ─────────────────────────────────────────────────────────────────

function StepRow({ step, blockers }: { step: SetupStep; blockers: string[] }) {
  const isDone = step.status === "complete";
  const isBlocked = blockers.length > 0;
  const blockerLabel =
    blockers.length === 1
      ? blockers[0]
      : `${blockers.slice(0, -1).join(", ")} and ${blockers[blockers.length - 1]}`;

  return (
    <div className={cn("flex items-start gap-3 py-3", isBlocked && "opacity-40")}>
      <Icon
        path={STATUS_ICON[step.status]}
        size="sm"
        className={cn("mt-0.5 shrink-0", STATUS_COLOR[step.status])}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn("text-sm font-medium", isDone && "text-muted-foreground line-through")}
          >
            {step.label}
          </span>
          {!isDone && (
            <Badge
              variant="default"
              className="border-border shrink-0 border bg-transparent text-[10px]"
            >
              {STATUS_LABEL[step.status]}
            </Badge>
          )}
        </div>
        {!isDone && (
          <>
            <p className="text-muted-foreground mt-0.5 text-xs">{step.hint}</p>
            <div className="mt-1 flex items-center gap-2">
              {isBlocked ? (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Icon path={mdiLockOutline} size="dense" className="shrink-0" />
                  Complete &ldquo;{blockerLabel}&rdquo; first
                </span>
              ) : (
                <>
                  <code className="bg-muted max-w-[200px] truncate rounded px-1 py-0.5 text-xs">
                    {step.filePath}
                  </code>
                  {step.vscodePath && (
                    <a
                      href={step.vscodePath}
                      className="flex shrink-0 items-center gap-0.5 text-xs text-blue-500 hover:text-blue-600"
                      title="Open in Cursor"
                    >
                      <Icon path={mdiOpenInNew} size="dense" />
                      open
                    </a>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DevSetupPanel() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<SetupStatusResponse | null>(null);

  useEffect(() => {
    fetch("/api/dev/setup-status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: SetupStatusResponse | null) => setStatus(data))
      .catch(() => null);
  }, []);

  if (!status) return null;

  const completedIds = new Set(
    status.steps.filter((s) => s.status === "complete").map((s) => s.id),
  );
  const completedCount = completedIds.size;
  const totalCount = status.steps.length;
  const allDone = completedCount === totalCount;

  // Don't render once everything is done — the guide has served its purpose.
  if (allDone) return null;

  const groups = [...new Set(status.steps.map((s) => s.group))];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className={cn(
            "fixed right-4 bottom-4 z-50 flex items-center gap-1.5 rounded-full border px-3 py-1.5",
            "bg-background hover:bg-muted text-xs font-medium shadow-md transition-colors",
            "border-yellow-300 text-yellow-700 dark:border-yellow-700 dark:text-yellow-400",
          )}
          aria-label="Open implementation setup guide"
        >
          <Icon path={mdiWrench} size="dense" />
          Setup
          <span className="rounded-full bg-yellow-100 px-1.5 py-0.5 text-xs dark:bg-yellow-900">
            {completedCount}/{totalCount}
          </span>
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[400px] p-0">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Icon path={mdiWrench} size="sm" />
            {status.displayName} Setup Guide
          </SheetTitle>
          <SheetDescription>
            {completedCount} of {totalCount} implementation steps complete
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-130px)]">
          <div className="px-6 pb-8">
            {groups.map((group, i) => {
              const groupSteps = status.steps.filter((s) => s.group === group);
              return (
                <div key={group}>
                  {i > 0 && <Separator className="my-1" />}
                  <p className="text-muted-foreground mt-4 mb-1 text-[11px] font-semibold tracking-wide uppercase">
                    {group}
                  </p>
                  {groupSteps.map((step) => {
                    const blockers = (step.blockedBy ?? [])
                      .filter((id) => !completedIds.has(id))
                      .map((id) => status.steps.find((s) => s.id === id)?.label ?? id);
                    return <StepRow key={step.id} step={step} blockers={blockers} />;
                  })}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
