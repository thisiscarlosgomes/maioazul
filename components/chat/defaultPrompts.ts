export const DEFAULT_CHAT_QUICK_PROMPTS = [
  "Quais os principais destaques do orçamento municipal de 2026.",
  "Como está distribuído o orçamento municipal do Maio?",
];

export const DEFAULT_CHAT_WELCOME_MESSAGE =
  "Podes perguntar por exemplo sobre turismo, métricas centrais, orçamento municipal, como também sobre o Código de Postura.";

export const MAX_VISIBLE_CHAT_QUICK_PROMPTS = 3;

export function getVisibleChatQuickPrompts(prompts: string[]) {
  const uniquePrompts = Array.from(
    new Set(prompts.map((prompt) => prompt.trim()).filter(Boolean)),
  );
  return uniquePrompts.slice(0, MAX_VISIBLE_CHAT_QUICK_PROMPTS);
}
