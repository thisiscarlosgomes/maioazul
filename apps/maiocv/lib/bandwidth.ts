export const BANDWIDTH_COOKIE = "maio-bandwidth";
export type BandwidthChoice = "auto" | "on" | "off";

export function bandwidthChoice(value: string | null | undefined): BandwidthChoice {
  if (value === "on" || value === "off" || value === "auto") return value;
  return "auto";
}

export function bandwidthMode(choice: string | null | undefined, saveData: string | null | undefined): "low" | "normal" {
  const selected = bandwidthChoice(choice);
  if (selected === "on") return "low";
  if (selected === "off") return "normal";
  return saveData?.toLowerCase() === "on" ? "low" : "normal";
}
