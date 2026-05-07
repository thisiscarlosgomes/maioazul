import type { Metadata } from "next";
import ElectionCountdown from "@/components/legislativas/ElectionCountdown";

type MesaMember = {
  nome: string;
  cargo: string;
};

type Mesa = {
  numero: number;
  codigo: string;
  localidade: string;
  ordemMesa: number;
  local: string;
  membros: MesaMember[];
};

const TOTAL_ELEITORES = 4866;
const TOTAL_MAVS = 17;
const AUTARQUICAS_INSCRITOS_2025 = 5006;
const AUTARQUICAS_VOTANTES_2025 = 2742;
const AUTARQUICAS_BRANCOS_2025 = 45;
const AUTARQUICAS_NULOS_2025 = 28;
const AUTARQUICAS_PAICV_2025 = 1352;
const AUTARQUICAS_MPD_2025 = 1317;
const AUTARQUICAS_TOTAL_CANDIDATURAS_2025 = 2669;

const mesas: Mesa[] = [
  {
    numero: 1,
    codigo: "MA-AA-01",
    localidade: "PORTO INGLÊS",
    ordemMesa: 1,
    local: "AVENIDA AMÍLCAR CABRAL (Delegação do MDR - Sala de Reunião)",
    membros: [
      { nome: "Delva dos Santos Amaro Rodrigues Silva", cargo: "Presidente" },
      { nome: "Ednilse Nivaldo da Costa Soares", cargo: "Secretario" },
      { nome: "Odilia Ines Martins", cargo: "1o escrutinador" },
      { nome: "Dora Oriana Fidalgo Monteiro", cargo: "2o escrutinador" },
      { nome: "Amelida Isaura Frederico Alves", cargo: "1o suplente" },
      { nome: "Oriano Inacio Lopes Miranda", cargo: "2o suplente" },
    ],
  },
  {
    numero: 2,
    codigo: "MA-AA-02",
    localidade: "PORTO INGLÊS",
    ordemMesa: 2,
    local: "ZONA CALHETINHA (EBI - Calhetinha - Vila)",
    membros: [
      { nome: "Nireida dos Reis Lopes", cargo: "Presidente" },
      { nome: "Isanda Soares", cargo: "Secretario" },
      { nome: "Guilhermina Fidalgo Pinheiro", cargo: "1o escrutinador" },
      { nome: "Jussara Denise Lopes Freire", cargo: "2o escrutinador" },
      { nome: "Eder Claudio Lima de Pina", cargo: "1o suplente" },
      { nome: "Lenira Denizia Tavares da Costa", cargo: "2o suplente" },
    ],
  },
  {
    numero: 3,
    codigo: "MA-BB-01",
    localidade: "PORTO INGLÊS",
    ordemMesa: 3,
    local: "ZONA EMPA (Escola Polivalente)",
    membros: [
      { nome: "Carolino Mendes Rodrigues", cargo: "Presidente" },
      { nome: "Isandra Andrade dos Santos", cargo: "Secretario" },
      { nome: "Zuleica Cardoso Resende", cargo: "1o escrutinador" },
      { nome: "Eurizana Baesa Martins", cargo: "2o escrutinador" },
      { nome: "Isabel Silva Evora", cargo: "1o suplente" },
      { nome: "Milva Nascimento Martins", cargo: "2o suplente" },
    ],
  },
  {
    numero: 4,
    codigo: "MA-BB-02",
    localidade: "PORTO INGLÊS",
    ordemMesa: 4,
    local: "ZONA CICLO (LICEU VELHO)",
    membros: [
      { nome: "Manuel Juvino Gomes", cargo: "Presidente" },
      { nome: "Andreia Andrade", cargo: "Secretario" },
      { nome: "Sidney Djone Frederico Santos", cargo: "1o escrutinador" },
      { nome: "Angela Frederico", cargo: "2o escrutinador" },
      { nome: "Belarmina Frederico dos Santos", cargo: "1o suplente" },
      { nome: "Edlyze Moreira Martins Silva", cargo: "2o suplente" },
    ],
  },
  {
    numero: 5,
    codigo: "MA-BB-03",
    localidade: "PORTO INGLÊS",
    ordemMesa: 5,
    local: "ZONA SHELL (ANEXO LICEU VELHO)",
    membros: [
      { nome: "Monica Da Luz Fortes Dos Santos", cargo: "Presidente" },
      { nome: "Maria Jose Fernandes Agues", cargo: "Secretario" },
      { nome: "Anete Ines Martins", cargo: "1o escrutinador" },
      { nome: "Elton Jorge Lima Pina", cargo: "2o escrutinador" },
      { nome: "Queila dos Reis", cargo: "1o suplente" },
      { nome: "Irlanda Alice Frederico Castro da Luz Ferreira", cargo: "2o suplente" },
    ],
  },
  {
    numero: 6,
    codigo: "MA-CC-01",
    localidade: "BARREIRO",
    ordemMesa: 6,
    local: "LEM BARRELA (EBI - Escola Velha)",
    membros: [
      { nome: "Esmeralda Nascimento Martins", cargo: "Presidente" },
      { nome: "Maria Paula Agues", cargo: "Secretario" },
      { nome: "Helio Salif Reis Santos", cargo: "1o escrutinador" },
      { nome: "Valdmar Joao Lopes", cargo: "2o escrutinador" },
      { nome: "Samir Agues da Cruz Silva", cargo: "1o suplente" },
      { nome: "Adilson Ribeiro Martins", cargo: "2o suplente" },
    ],
  },
  {
    numero: 7,
    codigo: "MA-DD-01",
    localidade: "FIGUEIRA",
    ordemMesa: 7,
    local: "FIGUEIRA HORTA (EBI Figueira)",
    membros: [
      { nome: "Iluzia Neves", cargo: "Presidente" },
      { nome: "Catiana Silva Soares", cargo: "Secretario" },
      { nome: "Dino Spencer", cargo: "1o escrutinador" },
      { nome: "Leiza Santos Silva", cargo: "2o escrutinador" },
      { nome: "Domingos dos Reis Brito Evora", cargo: "1o suplente" },
      { nome: "Andreia Oliveira dos Reis", cargo: "2o suplente" },
    ],
  },
  {
    numero: 8,
    codigo: "MA-EE-01",
    localidade: "RIBEIRA DON JOAO",
    ordemMesa: 8,
    local: "RIBEIRA DOM JOÃO (EBI Ribeira Dom João)",
    membros: [
      { nome: "Larissa Ribeiro Oliveira", cargo: "Presidente" },
      { nome: "Seferino Ribeiro dos Reis", cargo: "Secretario" },
      { nome: "Pedro Manuel Ribeiro Fernandes", cargo: "1o escrutinador" },
      { nome: "Hedmila Semedo Santos", cargo: "2o escrutinador" },
      { nome: "Idilio Dos Reis Martins", cargo: "1o suplente" },
      { nome: "Carlos Andre Santos Freire", cargo: "2o suplente" },
    ],
  },
  {
    numero: 9,
    codigo: "MA-FF-01",
    localidade: "PILÃO CÃO",
    ordemMesa: 9,
    local: "PILÃO CÃO (EBI Pilão Cão)",
    membros: [
      { nome: "Soraia Patricia Fonseca", cargo: "Presidente" },
      { nome: "Sandreia Rosa da Silva", cargo: "Secretario" },
      { nome: "Domingas Freire Ribeiro", cargo: "1o escrutinador" },
      { nome: "Claudio Cardoso Mendes Tavares", cargo: "2o escrutinador" },
      { nome: "Manuel da Cruz Lopes Freire", cargo: "1o suplente" },
      { nome: "Jacira Helena Rocha Silva", cargo: "2o suplente" },
    ],
  },
  {
    numero: 10,
    codigo: "MA-GG-01",
    localidade: "ALCATRAZ",
    ordemMesa: 10,
    local: "EBI",
    membros: [
      { nome: "Patricia Mendes Tavares", cargo: "Presidente" },
      { nome: "Domingos Hilario Mendes Tavares", cargo: "Secretario" },
      { nome: "Carlos Vital Mendes da Veiga", cargo: "1o escrutinador" },
      { nome: "Carla Ivandra Cardoso da Graca Tavares", cargo: "2o escrutinador" },
      { nome: "Nilton Castilho Mendes Fernandes", cargo: "1o suplente" },
      { nome: "Davilson Cardoso da Graca", cargo: "2o suplente" },
    ],
  },
  {
    numero: 11,
    codigo: "MA-HH-01",
    localidade: "PEDRO VAZ",
    ordemMesa: 11,
    local: "PEDRO VAZ (EBI Pedro Vaz)",
    membros: [
      { nome: "Gilberto Santos", cargo: "Presidente" },
      { nome: "Joceila Patricia Silva Fernandes", cargo: "Secretario" },
      { nome: "Jose Maria Dos Santos Duarte", cargo: "1o escrutinador" },
      { nome: "Faustino Andrade Martins", cargo: "2o escrutinador" },
      { nome: "Gilsimario Andrade Lopes", cargo: "1o suplente" },
      { nome: "Melany Mendes Tavares", cargo: "2o suplente" },
    ],
  },
  {
    numero: 12,
    codigo: "MA-II-01",
    localidade: "PRAIA GONÇALO",
    ordemMesa: 12,
    local: "PRAIA GONÇALO (EBI Praia Gonçalo)",
    membros: [
      { nome: "Maria da Luz Fortes Gomes", cargo: "Presidente" },
      { nome: "Natalicio Teixeira", cargo: "Secretario" },
      { nome: "Cleusa Duarte Dos Santos", cargo: "1o escrutinador" },
      { nome: "Kevin Duarte", cargo: "2o escrutinador" },
      { nome: "Emiliano Mendonca", cargo: "1o suplente" },
      { nome: "Adilson Santos", cargo: "2o suplente" },
    ],
  },
  {
    numero: 13,
    codigo: "MA-JJ-01",
    localidade: "CASCABULHO",
    ordemMesa: 13,
    local: "CASCABULHO (EBI Cascabulho)",
    membros: [
      { nome: "Helga Cristina Monteiro Neves", cargo: "Presidente" },
      { nome: "Filipe Santos", cargo: "Secretario" },
      { nome: "Maria Jesus Andrade Monteiro", cargo: "1o escrutinador" },
      { nome: "Cristino Oliveira dos Reis", cargo: "2o escrutinador" },
      { nome: "Joao Martins", cargo: "1o suplente" },
      { nome: "Malaquias Monteiro Andrade", cargo: "2o suplente" },
    ],
  },
  {
    numero: 14,
    codigo: "MA-LL-01",
    localidade: "MORRINHO",
    ordemMesa: 14,
    local: "MORRINHO (EBI de Morrinho)",
    membros: [
      { nome: "Janice Monteiro Alves", cargo: "Presidente" },
      { nome: "Ilsa Rosa", cargo: "Secretario" },
      { nome: "Alice Monteiro Dos Reis", cargo: "1o escrutinador" },
      { nome: "Solangela Dos Reis Oliveira", cargo: "2o escrutinador" },
      { nome: "Dilma Maria Andrade Santos", cargo: "1o suplente" },
      { nome: "Sandi Monteiro Dos Reis", cargo: "2o suplente" },
    ],
  },
  {
    numero: 15,
    codigo: "MA-MM-01",
    localidade: "CALHETA",
    ordemMesa: 15,
    local: "LEM TAVARES (EBI Calheta)",
    membros: [
      { nome: "Gilsa Santos", cargo: "Presidente" },
      { nome: "Elisia dos Reis Tavares Sequeira", cargo: "Secretario" },
      { nome: "Jusselma Maria Oliveira Barbosa", cargo: "1o escrutinador" },
      { nome: "Zuleica Maria Tavares Martins", cargo: "2o escrutinador" },
      { nome: "Nadia Vanessa Silva Santos", cargo: "1o suplente" },
      { nome: "Jacira Delgado Reis", cargo: "2o suplente" },
    ],
  },
  {
    numero: 16,
    codigo: "MA-MM-02",
    localidade: "CALHETA",
    ordemMesa: 16,
    local: "LEM TAVARES (Centro Comunitário, Delegação Municipal e Centro de Multimédia de Calheta)",
    membros: [
      { nome: "Maria do Socorro dos Reis Tavares Sequeira", cargo: "Presidente" },
      { nome: "Wilson Herminio Tavares Evora", cargo: "Secretario" },
      { nome: "Marcia Helena Martins da Silva", cargo: "1o escrutinador" },
      { nome: "Edneia Sancy Andrade dos Reis Silva", cargo: "2o escrutinador" },
      { nome: "Patricia Sely Almeida", cargo: "1o suplente" },
      { nome: "Cesaltino Tavares Rocha", cargo: "2o suplente" },
    ],
  },
  {
    numero: 17,
    codigo: "MA-NN-01",
    localidade: "MORRO",
    ordemMesa: 17,
    local: "MORRO (EBI Morro)",
    membros: [
      { nome: "Janice Contina Ines", cargo: "Presidente" },
      { nome: "Silvana Patricia Rosa Tavares", cargo: "Secretario" },
      { nome: "Albertino Silva", cargo: "1o escrutinador" },
      { nome: "Edson Silva dos Reis", cargo: "2o escrutinador" },
      { nome: "Andreia Sousa", cargo: "1o suplente" },
      { nome: "Joel Augusto Rosa Tavares", cargo: "2o suplente" },
    ],
  },
];

const numberFormatter = new Intl.NumberFormat("pt-PT");
const inscritosDiff = TOTAL_ELEITORES - AUTARQUICAS_INSCRITOS_2025;
const inscritosDiffPct = (inscritosDiff / AUTARQUICAS_INSCRITOS_2025) * 100;

export const metadata: Metadata = {
  title: "Legislativas 2026 - Maio",
  description: "Dados eleitorais de Maio para as Legislativas 2026.",
};

export default function Legislativas2026Page() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div
        className="absolute inset-0 z-0 bg-center bg-no-repeat opacity-[0.04] dark:opacity-[0.035]"
        style={{
          backgroundImage: "url('/maioazul.png')",
          backgroundSize: "300px",
        }}
      />

      <section className="relative z-10 mx-auto max-w-6xl space-y-6 px-6 pb-16 pt-2">
        <ElectionCountdown />

        <header className="rounded-lg border border-border bg-card px-6 py-6 sm:px-8">
          <h1 className="text-base font-semibold sm:text-lg">Legislativas 2026 · Maio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Distribuição de eleitores e composição das mesas de voto.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">
                NÚMERO DE ELEITORES
              </p>
              <p className="mt-1 text-lg font-semibold sm:text-xl">
                {numberFormatter.format(TOTAL_ELEITORES)}
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">
                NÚMERO DE MESAS DE VOTOS
              </p>
              <p className="mt-1 text-lg font-semibold sm:text-xl">{TOTAL_MAVS}</p>
            </div>
          </div>
        </header>

        <section className="rounded-lg border border-border bg-card px-6 py-6 sm:px-8">
          <h2 className="text-base font-semibold sm:text-lg">Comparação com Autárquicas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Inscritos: autárquicas 2024 vs legislativas 2026.</p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">AUTÁRQUICAS (2024)</p>
              <p className="mt-1 text-xl font-semibold">{numberFormatter.format(AUTARQUICAS_INSCRITOS_2025)}</p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">LEGISLATIVAS 2026</p>
              <p className="mt-1 text-xl font-semibold">{numberFormatter.format(TOTAL_ELEITORES)}</p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">VARIAÇÃO</p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="text-xl font-semibold">
                  {inscritosDiff > 0 ? "+" : ""}
                  {numberFormatter.format(inscritosDiff)}
                </p>
                <p
                  className={`text-sm ${
                    inscritosDiffPct < 0
                      ? "text-red-600 dark:text-red-400"
                      : inscritosDiffPct > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground"
                  }`}
                >
                  {inscritosDiffPct > 0 ? "+" : ""}
                  {inscritosDiffPct.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-[11px] text-muted-foreground">Votantes 2025</p>
              <p className="mt-1 text-base font-semibold">{numberFormatter.format(AUTARQUICAS_VOTANTES_2025)}</p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-[11px] text-muted-foreground">Brancos 2025</p>
              <p className="mt-1 text-base font-semibold">{numberFormatter.format(AUTARQUICAS_BRANCOS_2025)}</p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-[11px] text-muted-foreground">Nulos 2025</p>
              <p className="mt-1 text-base font-semibold">{numberFormatter.format(AUTARQUICAS_NULOS_2025)}</p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-[11px] text-muted-foreground">PAICV 2025</p>
              <p className="mt-1 text-base font-semibold">{numberFormatter.format(AUTARQUICAS_PAICV_2025)}</p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-[11px] text-muted-foreground">MpD 2025</p>
              <p className="mt-1 text-base font-semibold">{numberFormatter.format(AUTARQUICAS_MPD_2025)}</p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-[11px] text-muted-foreground">Total candidaturas 2025</p>
              <p className="mt-1 text-base font-semibold">{numberFormatter.format(AUTARQUICAS_TOTAL_CANDIDATURAS_2025)}</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg bg-card">
          <div className="space-y-3 md:hidden">
            {mesas.map((mesa) => (
              <article
                key={`mobile-${mesa.codigo}`}
                className="rounded-lg border border-border bg-muted/20 p-3"
              >
                <p className="text-xs font-medium text-muted-foreground">
                  Mesa Nº {mesa.numero}
                </p>
                <p className="mt-1 text-sm font-semibold">{mesa.localidade}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{mesa.local}</p>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="bg-muted/35">
                  <th className="border border-border px-3 py-3 text-center font-semibold">Nº</th>
                  <th className="border border-border px-3 py-3 text-center font-semibold">Povoação</th>
                  <th className="border border-border px-3 py-3 text-center font-semibold">Local de Votação</th>
                </tr>
              </thead>
              <tbody>
                {mesas.map((mesa) => (
                  <tr key={mesa.codigo}>
                    <td className="border border-border px-2 py-3 text-center align-middle">
                      {mesa.numero}
                    </td>
                    <td className="border border-border px-3 py-3 text-center align-middle">
                      {mesa.localidade}
                    </td>
                    <td className="border border-border px-4 py-3 text-center align-middle">
                      {mesa.local}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <strong>Fonte:</strong>{" "}
          <a
            href="https://cne.cv/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Comissão Nacional de Eleições - cne.cv
          </a>
        </div>
      </section>
    </main>
  );
}
