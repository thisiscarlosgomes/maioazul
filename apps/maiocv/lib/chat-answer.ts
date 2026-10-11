import { t } from "./i18n.ts";
import type { Locale } from "./locale.ts";

const internalLine = /^\s*(?:[-*•]\s*)?(?:dataset\s+(?:usado|utilizado|used)|fonte\s+t[eé]cnica|technical\s+source)\s*:/i;

function plain(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function publicChatGreeting(question: string, locale: Locale = "pt"): string | null {
  const normalized = plain(question.trim()).replace(/[!?.,]+$/g, "").trim();
  if (/^(?:oi|ola|hello|hi|hey|bonjour|salut|bom dia|boa tarde|boa noite)$/.test(normalized))
    return t("chat.greeting", undefined, locale);
  if (/^(?:que dados (?:posso consultar|estao disponiveis|tens|temos)(?: aqui)?|o que (?:posso perguntar|podes responder|sabes fazer|sabes sobre o maio)|em que (?:podes|consegues) ajudar(?:-me)?|que temas (?:posso consultar|cobres))(?: no maio)?$/.test(normalized))
    return t("chat.capabilities", undefined, locale);
  return null;
}

const asksForSource: Record<Locale, RegExp> = {
  pt: /\b(?:fonte|origem|de onde)\b/,
  en: /\b(?:source|origin)\b|\bwhere\b.+\bfrom\b/,
  fr: /\b(?:source|origine)\b|\bd['’]ou\b/,
};

const asksForBusiness: Record<Locale, RegExp> = {
  pt: /\b(?:empresas?|negocios?)\b/,
  en: /\b(?:business(?:es)?|compan(?:y|ies)|enterprises?)\b/,
  fr: /\bentreprises?\b/,
};

export function publicChatAnswer(answer: string, question = "", locale: Locale = "pt"): string {
  const asked = plain(question);
  const askedForBusinessSource = asksForSource[locale].test(asked) && asksForBusiness[locale].test(asked);
  if (askedForBusinessSource && /business-demography|get_open_data_dataset|inqu[eé]rito anual|annual enterprise survey|enqu[eê]te annuelle|INE Cabo Verde/i.test(answer)) {
    return t("chat.businessSource", undefined, locale);
  }
  return answer.split("\n").filter(line => !internalLine.test(line)).map(line => {
    // Keep the public institution while removing the catalog key from a source line.
    const datasetSource = line.match(/^(\s*(?:[-*•]\s*)?Fonte:\s*)dataset\s+[`"']?[\w-]+[`"']?\s*\(([^)]*)\)(.*)$/i);
    if (datasetSource) return `${datasetSource[1]}${datasetSource[2]}${datasetSource[3]}`;
    if (/^\s*(?:[-*•]\s*)?Fonte:\s*dataset\s+[`"']?[\w-]+[`"']?\s*$/i.test(line)) return "";
    if (/`get_[\w]+`|`business-demography`|`iae-\d{4}-[\w-]+`|view=["']records["']|\.xls\b/i.test(line)) return "";
    return line;
  }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
