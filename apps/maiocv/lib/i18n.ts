import pt from "./i18n/pt.json" with { type: "json" };

export type MessageKey = keyof typeof pt;

export function t(key: MessageKey, values?: Record<string, string | number>): string {
  const template = pt[key];
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : `{${name}}`,
  );
}
