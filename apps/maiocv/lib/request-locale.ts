import { headers } from "next/headers";
import { bandwidthMode } from "./bandwidth";
import { isLocale, stripLocale, type Locale } from "./locale";

export async function currentLocale(): Promise<Locale> {
  const header = (await headers()).get("x-maio-lang");
  return isLocale(header) ? header : "pt";
}

export async function currentBandwidth(): Promise<"low" | "normal"> {
  const header = (await headers()).get("x-maio-bandwidth");
  return header === "low" ? "low" : bandwidthMode(null, null);
}

export async function currentPath(): Promise<string> {
  const header = (await headers()).get("x-maio-path");
  return stripLocale(header || "/");
}
