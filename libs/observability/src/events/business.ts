import { AI_TIME_SAVED_PER_SUBTASK_MIN } from "../config/constants";
import { ObservabilityClient } from "../core/client";
import { METRIC } from "../types/metrics";
import type { CapabilityFlags } from "./capability-filter";

type TrackFn = (
  eventName: string,
  properties?: Record<string, string | number | boolean>,
  capabilities?: CapabilityFlags,
) => void;

function makeTrack(client: ObservabilityClient): TrackFn {
  return (eventName, properties = {}, capabilities) =>
    client.track({ eventName, category: "business", properties }, capabilities);
}

export function createBusinessEvents(capabilities?: CapabilityFlags) {
  const client = ObservabilityClient.getInstance();
  const track = makeTrack(client);

  return {
    // ── Group 1: Session identity ──────────────────────────────────────────

    sessionStarted: (props: { platform: string; appVersion?: string; userRole?: string }) =>
      track(METRIC.SESSION_STARTED, {
        platform: props.platform,
        appVersion: props.appVersion ?? "unknown",
        ...(props.userRole ? { userRole: props.userRole } : {}),
      }),

    sessionEnded: (props: { durationMs: number; actionCount: number; platform: string }) =>
      track(METRIC.SESSION_ENDED, props),

    sessionHeartbeat: (props: { platform: string; activeMs: number }) =>
      track(METRIC.SESSION_HEARTBEAT, props),

    userRoleSignal: (props: { role: string; platform: string }) =>
      track(METRIC.USER_ROLE_SIGNAL, props),

    // ── Group 2: Adoption funnel ───────────────────────────────────────────

    appFirstOpened: (props: { platform: string; appVersion?: string }) =>
      track(METRIC.APP_FIRST_OPENED, {
        platform: props.platform,
        appVersion: props.appVersion ?? "unknown",
      }),

    appConnectionCompleted: (props: { platform: string; connectionMethod?: string }) =>
      track(METRIC.APP_CONNECTION_COMPLETED, {
        platform: props.platform,
        connectionMethod: props.connectionMethod ?? "oauth",
      }),

    appFirstTaskActioned: (props: { platform: string; actionType: "view" | "create" | "update" }) =>
      track(METRIC.APP_FIRST_TASK_ACTIONED, props),

    appOnboardingCompleted: (props: { platform: string; stepsCompleted: number }) =>
      track(METRIC.APP_ONBOARDING_COMPLETED, props),

    // ── Group 3: View engagement ───────────────────────────────────────────

    viewEntered: (props: { viewName: string; platform: string; referrer?: string }) =>
      track(METRIC.VIEW_ENTERED, {
        viewName: props.viewName,
        platform: props.platform,
        ...(props.referrer ? { referrer: props.referrer } : {}),
      }),

    viewExited: (props: { viewName: string; durationMs: number; platform: string }) =>
      track(METRIC.VIEW_EXITED, props),

    viewRevisited: (props: { viewName: string; visitCountThisSession: number }) =>
      track(METRIC.VIEW_REVISITED, props),

    // ── Group 4: Feature adoption & stickiness ────────────────────────────

    featureFirstUsed: (props: { featureKey: string; platform: string }) =>
      track(METRIC.FEATURE_FIRST_USED, props),

    featureUsed: (props: { featureKey: string; platform: string; sessionCount?: number }) =>
      track(METRIC.FEATURE_USED, {
        featureKey: props.featureKey,
        platform: props.platform,
        sessionCount: props.sessionCount ?? 1,
      }),

    featureAbandoned: (props: { featureKey: string; abandonStage: string }) =>
      track(METRIC.FEATURE_ABANDONED, props),

    featureReusedAcrossSessions: (props: { featureKey: string; daysSinceFirstUse: number }) =>
      track(METRIC.FEATURE_REUSED_ACROSS_SESSIONS, props),

    // ── Group 5: Productivity / AI ROI ────────────────────────────────────

    productivityTaskActioned: (props: {
      actionType: string;
      platform: string;
      durationMs: number;
    }) => track(METRIC.PRODUCTIVITY_TASK_ACTIONED, props),

    productivityWorkflowCompleted: (props: {
      workflowName: string;
      stepCount: number;
      totalDurationMs: number;
    }) => track(METRIC.PRODUCTIVITY_WORKFLOW_COMPLETED, props),

    aiBreakdownGenerated: (props: { subtaskCount: number; durationMs?: number }) =>
      track(
        METRIC.AI_BREAKDOWN_GENERATED,
        { subtaskCount: props.subtaskCount, durationMs: props.durationMs ?? 0 },
        capabilities,
      ),

    aiBreakdownPublished: (props: { subtaskCount: number }) =>
      track(
        METRIC.AI_BREAKDOWN_PUBLISHED,
        {
          subtaskCount: props.subtaskCount,
          estimatedTimeSavedMin: props.subtaskCount * AI_TIME_SAVED_PER_SUBTASK_MIN,
        },
        capabilities,
      ),

    aiAcceptanceRateSignal: (props: { generatedCount: number; publishedCount: number }) => {
      const acceptanceRate =
        props.generatedCount > 0
          ? Math.round((props.publishedCount / props.generatedCount) * 100) / 100
          : 0;
      return track(METRIC.AI_ACCEPTANCE_RATE_SIGNAL, { ...props, acceptanceRate }, capabilities);
    },

    collaborationSignal: (props: {
      signalType: "comment" | "assign" | "mention";
      platform: string;
    }) => track(METRIC.COLLABORATION_SIGNAL, props),

    // ── Group 6: Platform growth & popularity ─────────────────────────────

    appDailyActive: (props: { platform: string; date: string }) =>
      track(METRIC.APP_DAILY_ACTIVE, props),

    appPlatformCoverage: (props: { platform: string; connectedSiteCount: number }) =>
      track(METRIC.APP_PLATFORM_COVERAGE, props),

    platformPopularitySignal: (props: { platform: string; rank: number; totalPlatforms: number }) =>
      track(METRIC.PLATFORM_POPULARITY_SIGNAL, props),

    // ── Group 7: Retention health ─────────────────────────────────────────

    appReturnedAfterGap: (props: { platform: string; daysSinceLastSession: number }) =>
      track(METRIC.APP_RETURNED_AFTER_GAP, props),

    appChurnedSignal: (props: { platform: string; daysSinceLastSession: number }) =>
      track(METRIC.APP_CHURNED_SIGNAL, props),

    retentionWeeklyActive: (props: { platform: string; weekNumber: number }) =>
      track(METRIC.RETENTION_WEEKLY_ACTIVE, props),

    retentionStreak: (props: { platform: string; streakDays: number }) =>
      track(METRIC.RETENTION_STREAK, props),

    connectionHealthSignal: (props: {
      platform: string;
      status: "healthy" | "degraded" | "broken";
    }) => track(METRIC.CONNECTION_HEALTH_SIGNAL, props),

    errorUserVisible: (props: { errorType: string; platform: string; viewName: string }) =>
      track(METRIC.ERROR_USER_VISIBLE, props),
  };
}
