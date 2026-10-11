import { strict as assert } from "node:assert";
import { test } from "node:test";
import { publicChatAnswer, publicChatGreeting } from "../lib/chat-answer.ts";

test("greets visitors with supported MaioCV topics only", () => {
  const greeting = publicChatGreeting("hi");
  assert.match(greeting ?? "", /praias e lugares, empresas, turismo/);
  assert.doesNotMatch(greeting ?? "", /barcos|voos|transportes/);
  assert.equal(publicChatGreeting("Há barcos hoje?"), null);
  const scope = publicChatGreeting("Que dados posso consultar aqui?");
  assert.match(scope ?? "", /praias e património, turismo, empresas/);
  assert.doesNotMatch(scope ?? "", /barcos|voos|transportes|tempo|surf/);
  assert.equal(publicChatGreeting("Que dados de turismo posso consultar?"), null);
});

test("keeps the public source but removes internal dataset and workbook details", () => {
  const answer = `A fonte é o INE Cabo Verde, no Inquérito Anual às Empresas 2024 (IAE 2024).

- Dataset usado: \`business-demography\`
- Fonte técnica: \`iae-2024-user-workbook\` — ficheiro “Inquérito Anual Empresas - 2024.xls”
- Valor do Maio: 308 empresas ativas em 2024.`;
  const result = publicChatAnswer(answer);
  assert.match(result, /INE Cabo Verde/);
  assert.match(result, /308 empresas ativas/);
  assert.doesNotMatch(result, /Dataset usado|Fonte técnica|business-demography|iae-2024-user-workbook|\.xls/);
});

test("turns a dataset source line into human-readable attribution", () => {
  assert.equal(publicChatAnswer("- Fonte: dataset business-demography (INE Cabo Verde, estimativa de inquérito)"),
    "- Fonte: INE Cabo Verde, estimativa de inquérito");
});

test("answers a business source question without exposing tools or catalog keys", () => {
  const answer = `A fonte correta é o dataset \`business-demography\` em \`get_open_data_dataset\` com \`view="records"\`.

- É esta a base para número de empresas, empresas ativas e setores no Maio.
- Não se deve usar \`get_maio_core_metrics\` para esses totais.
- Para empresas individuais mapeadas, a fonte é a coleção \`businesses\`, mas isso não representa o total de empresas da ilha.`;
  const result = publicChatAnswer(answer, "Qual é a fonte do número de empresas no Maio?");
  assert.match(result, /Inquérito Anual às Empresas do INE Cabo Verde/);
  assert.doesNotMatch(result, /business-demography|get_open_data_dataset|get_maio_core_metrics|view=/);
});
