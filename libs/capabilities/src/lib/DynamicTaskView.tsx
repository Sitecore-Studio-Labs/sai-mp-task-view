import { getEnabledFeatures } from "./capability-engine";

export function DynamicTaskView({ platform }: { platform: string }) {
  const features = getEnabledFeatures(platform);

  return (
    <div>
      {features.includes("status") && <div>Status UI</div>}
      {features.includes("assign") && <div>Assign UI</div>}
      {features.includes("attachments") && <div>Attachments UI</div>}
      {features.includes("comments") && <div>Comments UI</div>}
    </div>
  );
}
