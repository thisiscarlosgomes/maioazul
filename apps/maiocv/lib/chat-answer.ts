const internalLine = /^\s*(?:[-*•]\s*)?(?:dataset\s+(?:usado|utilizado|used)|fonte\s+t[eé]cnica|technical\s+source)\s*:/i;

function plain(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function publicChatGreeting(question: string): string | null {
  const normalized = plain(question.trim()).replace(/[!?.,]+$/g, "").trim();
  if (/^(?:oi|ola|hello|hi|hey|bom dia|boa tarde|boa noite)$/.test(normalized))
    return "Olá! Pode perguntar sobre praias e lugares, empresas, turismo ou orçamento municipal do Maio. O que gostaria de saber?";
  if (/^(?:que dados (?:posso consultar|estao disponiveis|tens|temos)(?: aqui)?|o que (?:posso perguntar|podes responder|sabes fazer|sabes sobre o maio)|em que (?:podes|consegues) ajudar(?:-me)?|que temas (?:posso consultar|cobres))(?: no maio)?$/.test(normalized))
    return "Pode explorar praias e património, turismo, empresas, população, orçamento municipal e energia do Maio. Para cada resposta, confirme o período e a fonte; alguns temas ainda não têm dados publicados.";
  return null;
}

export function publicChatAnswer(answer: string, question = ""): string {
  const askedForBusinessSource = /\b(fonte|origem|de onde)\b/.test(plain(question)) &&
    /\b(empresas?|negocios?)\b/.test(plain(question));
  if (askedForBusinessSource && /business-demography|get_open_data_dataset|inquérito anual|INE Cabo Verde/i.test(answer)) {
    return "A fonte é o Inquérito Anual às Empresas do INE Cabo Verde. O número de empresas no Maio é uma estimativa estatística arredondada, não uma contagem administrativa.";
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
