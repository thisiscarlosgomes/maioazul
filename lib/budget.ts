import { promises as fs } from "fs";
import path from "path";

export const AVAILABLE_BUDGET_YEARS = [2026, 2025] as const;
export type BudgetYear = (typeof AVAILABLE_BUDGET_YEARS)[number];

type RawSummary = {
  revenue_total_cve?: number;
  revenue_current_cve?: number;
  revenue_capital_cve?: number;
  expense_total_cve?: number;
  expense_current_cve?: number;
  expense_capital_cve?: number;
  operating_share_pct?: number;
  capital_share_pct?: number;
  notes?: string;
};

type RawLineItem = {
  map_number?: string;
  section_type?: string;
  hierarchy_type?: string;
  classification_code?: string;
  classification_label?: string;
  department_name?: string;
  program_name?: string;
  subprogram_name?: string;
  project_name?: string;
  total_cve?: number;
  operating_cve?: number;
  investment_cve?: number;
  share_pct?: number;
  source_page?: number;
  extraction_confidence?: number;
  needs_manual_review?: boolean;
};

type RawFundingSource = {
  funding_source_name?: string;
  funding_source_type?: string;
  amount_cve?: number;
  source_page?: number;
  needs_manual_review?: boolean;
};

type RawInvestmentProject = {
  program_name?: string;
  subprogram_name?: string;
  project_name?: string;
  classification_code?: string;
  total_cve?: number;
  source_page?: number;
  needs_manual_review?: boolean;
};

type RawDecision = {
  decision_number?: string;
  votes_for?: number;
  votes_against?: number;
  votes_abstain?: number;
  supporting_group?: string;
  opposing_group?: string;
};

type RawSourceDocument = {
  id?: string;
  title?: string;
  publication_date?: string;
  approval_date?: string;
  signature_date?: string;
  publication_issue_number?: string;
  publication_series?: string;
  source_file_name?: string;
  source_file_path?: string;
  signatory_name?: string;
  issuing_body?: string;
  total_amount_cve?: number;
  ingestion_notes?: string[];
};

type RawLegalHighlight = {
  article?: string;
  topic?: string;
  details?: unknown;
};

type RawFiscalOperations = {
  total_revenue_cve?: number;
  total_expense_cve?: number;
  surplus_before_financing_cve?: number;
  financial_assets_operations_cve?: number;
  financial_liabilities_operations_cve?: number;
  net_financing_need_cve?: number;
  internal_financing_cve?: number;
  external_financing_cve?: number;
  notes?: string[];
};

type RawCompensationDepartment = {
  department_name?: string;
  vacancies?: number;
  monthly_cve?: number;
  annual_cve?: number;
};

type RawCompensationItem = {
  department_name?: string;
  position_title?: string;
  vacancies?: number;
  monthly_cve?: number;
  annual_cve?: number;
  employment_type?: string;
  notes?: string;
};

type RawCompensationBlock = {
  source_page?: number;
  title?: string;
  total_vacancies?: number;
  total_monthly_cve?: number;
  total_annual_cve?: number;
  departments?: RawCompensationDepartment[];
  items?: RawCompensationItem[];
  notes?: string[];
};

type RawCompensationFramework = {
  currency?: string;
  base?: RawCompensationBlock;
  adjustments?: RawCompensationBlock;
};

type RawBudgetDocument = {
  source_document?: RawSourceDocument;
  decision?: RawDecision;
  budget_summary?: RawSummary;
  budget_line_items?: RawLineItem[];
  funding_sources?: RawFundingSource[];
  investment_projects?: RawInvestmentProject[];
  staffing_positions?: Array<{ needs_manual_review?: boolean }>;
  personnel_projections?: Array<{ needs_manual_review?: boolean }>;
  staffing_summary?: { total_positions?: number } | null;
  legal_highlights?: RawLegalHighlight[];
  fiscal_operations?: RawFiscalOperations;
  compensation_framework?: RawCompensationFramework;
};

type RawStaffingPositionRow = Record<string, unknown>;

export type BudgetBreakdownItem = {
  code: string | null;
  label: string;
  amountCve: number;
  sharePct: number | null;
};

export type BudgetProjectItem = {
  programName: string;
  subprogramName: string | null;
  projectName: string;
  classificationCode: string | null;
  amountCve: number;
  sourcePage: number | null;
};

export type BudgetStaffingPosition = {
  id: string;
  costCenterName: string;
  budgetCode: string | null;
  staffGroup: string | null;
  positionTitle: string;
  vacancyCount: number;
  monthlySalaryCve: number;
  annualSalaryCve: number;
  observation: string | null;
  sourcePage: number | null;
};

export type BudgetApiResponse = {
  scope: "municipal";
  dataset: "budget";
  municipality: "Maio";
  year: number;
  availableYears: number[];
  sourceDocument: {
    id: string | null;
    title: string | null;
    publicationDate: string | null;
    approvalDate: string | null;
    signatureDate: string | null;
    publicationIssueNumber: string | null;
    publicationSeries: string | null;
    sourceFileName: string | null;
    sourceFilePath: string | null;
    signatoryName: string | null;
    issuingBody: string | null;
  };
  decision: {
    decisionNumber: string | null;
    votesFor: number;
    votesAgainst: number;
    votesAbstain: number;
    supportingGroup: string | null;
    opposingGroup: string | null;
  };
  summary: {
    totalRevenueCve: number;
    totalExpenseCve: number;
    fiscalBalanceCve: number;
    currentRevenueCve: number;
    capitalRevenueCve: number;
    currentExpenseCve: number;
    capitalExpenseCve: number;
    investmentSharePct: number;
    currentExpenseSharePct: number;
    sourceDeclaredTotalCve: number;
    staffingDataAvailable: boolean;
    staffingPositionCount: number;
    manualReviewCount: number;
    notes: string[];
  };
  revenueBreakdown: BudgetBreakdownItem[];
  expenseBreakdown: BudgetBreakdownItem[];
  functionalBreakdown: BudgetBreakdownItem[];
  departmentBreakdown: BudgetBreakdownItem[];
  investmentPrograms: Array<{
    label: string;
    amountCve: number;
    projectCount: number;
  }>;
  investmentProjects: BudgetProjectItem[];
  fundingSources: Array<{
    label: string;
    type: string | null;
    amountCve: number;
  }>;
  staffingPositions: BudgetStaffingPosition[];
  compensationFramework: {
    currency: string;
    base: {
      sourcePage: number | null;
      title: string | null;
      totalVacancies: number;
      totalMonthlyCve: number;
      totalAnnualCve: number;
      departments: Array<{
        departmentName: string;
        vacancies: number;
        monthlyCve: number;
        annualCve: number;
      }>;
      notes: string[];
    } | null;
    adjustments: {
      sourcePage: number | null;
      title: string | null;
      totalVacancies: number;
      totalMonthlyCve: number;
      totalAnnualCve: number;
      departments: Array<{
        departmentName: string;
        vacancies: number;
        monthlyCve: number;
        annualCve: number;
      }>;
      items: Array<{
        departmentName: string;
        positionTitle: string;
        vacancies: number;
        monthlyCve: number;
        annualCve: number;
        employmentType: string | null;
        notes: string | null;
      }>;
      notes: string[];
    } | null;
    combined: {
      totalVacancies: number;
      totalMonthlyCve: number;
      totalAnnualCve: number;
    };
  } | null;
  legalHighlights: RawLegalHighlight[];
  fiscalOperations: RawFiscalOperations | null;
  notes: string[];
};

const DATASET_FILES: Record<BudgetYear, string> = {
  2025: path.join(
    process.cwd(),
    "public",
    "data",
    "municipal-budget-ingestion",
    "maio-2025",
    "maio_budget_2025.first_pass.json"
  ),
  2026: path.join(
    process.cwd(),
    "public",
    "data",
    "municipal-budget-ingestion",
    "maio-2026",
    "maio_budget_2026.first_pass.json"
  ),
};

function isBudgetYear(value: number): value is BudgetYear {
  return AVAILABLE_BUDGET_YEARS.includes(value as BudgetYear);
}

function resolveBudgetYear(value: string | null | undefined): BudgetYear {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && isBudgetYear(parsed)) {
    return parsed;
  }
  return AVAILABLE_BUDGET_YEARS[0];
}

function countCodeSegments(code?: string | null) {
  if (!code) return 0;
  return code
    .replace(/[,-]/g, ".")
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean).length;
}

function toBreakdownItem(item: RawLineItem): BudgetBreakdownItem | null {
  const label = item.classification_label?.trim();
  const amount = item.total_cve;
  if (!label || typeof amount !== "number") return null;

  return {
    code: item.classification_code ?? null,
    label,
    amountCve: amount,
    sharePct: typeof item.share_pct === "number" ? item.share_pct : null,
  };
}

function getTopLevelEconomicBreakdown(
  items: RawLineItem[],
  sectionType: "revenue" | "expense"
) {
  return items
    .filter(
      (item) =>
        item.section_type === sectionType &&
        item.hierarchy_type?.includes("classification") &&
        countCodeSegments(item.classification_code) === 2
    )
    .map(toBreakdownItem)
    .filter((item): item is BudgetBreakdownItem => item !== null)
    .sort((a, b) => b.amountCve - a.amountCve);
}

function getFunctionalBreakdown(items: RawLineItem[]) {
  return items
    .filter(
      (item) =>
        item.section_type === "functional_expense" &&
        countCodeSegments(item.classification_code) === 3
    )
    .map(toBreakdownItem)
    .filter((item): item is BudgetBreakdownItem => item !== null)
    .sort((a, b) => b.amountCve - a.amountCve);
}

function getDepartmentBreakdown(items: RawLineItem[], totalExpenseCve: number) {
  const preferredItems = items.filter(
    (item) => item.section_type === "expense" && item.map_number === "Mapa VIII"
  );

  return preferredItems
    .filter(
      (item) =>
        item.hierarchy_type === "organic_unit_total" &&
        item.department_name &&
        typeof item.total_cve === "number"
    )
    .map((item) => ({
      code: null,
      label: item.department_name as string,
      amountCve: item.total_cve as number,
      sharePct:
        typeof item.share_pct === "number"
          ? item.share_pct
          : totalExpenseCve > 0
            ? Number((((item.total_cve as number) / totalExpenseCve) * 100).toFixed(2))
            : null,
    }))
    .sort((a, b) => b.amountCve - a.amountCve);
}

function getInvestmentPrograms(projects: RawInvestmentProject[]) {
  const grouped = new Map<string, { amountCve: number; projectCount: number }>();

  for (const project of projects) {
    const label = project.program_name?.trim();
    const amount = project.total_cve;
    if (!label || typeof amount !== "number") continue;

    const current = grouped.get(label) ?? { amountCve: 0, projectCount: 0 };
    current.amountCve += amount;
    current.projectCount += 1;
    grouped.set(label, current);
  }

  return Array.from(grouped.entries())
    .map(([label, value]) => ({ label, ...value }))
    .sort((a, b) => b.amountCve - a.amountCve);
}

function getInvestmentProjects(projects: RawInvestmentProject[]): BudgetProjectItem[] {
  return projects
    .filter(
      (project) =>
        project.project_name &&
        typeof project.total_cve === "number" &&
        project.total_cve > 0
    )
    .map((project) => ({
      programName: project.program_name?.trim() || "Sem programa",
      subprogramName: project.subprogram_name?.trim() || null,
      projectName: project.project_name?.trim() || "Projeto sem titulo",
      classificationCode: project.classification_code ?? null,
      amountCve: project.total_cve as number,
      sourcePage:
        typeof project.source_page === "number" ? project.source_page : null,
    }))
    .sort((a, b) => b.amountCve - a.amountCve);
}

function getFundingSources(fundingSources: RawFundingSource[]) {
  return fundingSources
    .filter(
      (source) =>
        source.funding_source_name && typeof source.amount_cve === "number"
    )
    .map((source) => ({
      label: source.funding_source_name as string,
      type: source.funding_source_type ?? null,
      amountCve: source.amount_cve as number,
    }))
    .sort((a, b) => b.amountCve - a.amountCve);
}

function getStaffingPositions(
  positions: Array<Record<string, unknown>> | undefined
): BudgetStaffingPosition[] {
  return (positions ?? [])
    .map((raw) => ({
      id: String(raw.id ?? ""),
      costCenterName: String(raw.cost_center_name ?? "").trim(),
      budgetCode:
        typeof raw.budget_code === "string" && raw.budget_code.trim()
          ? raw.budget_code.trim()
          : null,
      staffGroup:
        typeof raw.staff_group === "string" && raw.staff_group.trim()
          ? raw.staff_group.trim()
          : null,
      positionTitle: String(raw.position_title ?? "").trim(),
      vacancyCount:
        typeof raw.vacancy_count === "number" ? raw.vacancy_count : 0,
      monthlySalaryCve:
        typeof raw.monthly_salary_cve === "number" ? raw.monthly_salary_cve : 0,
      annualSalaryCve:
        typeof raw.annual_salary_cve === "number" ? raw.annual_salary_cve : 0,
      observation:
        typeof raw.observation === "string" && raw.observation.trim()
          ? raw.observation.trim()
          : null,
      sourcePage:
        typeof raw.source_page === "number" ? raw.source_page : null,
    }))
    .filter((item) => item.id && item.costCenterName && item.positionTitle)
    .sort((a, b) => b.annualSalaryCve - a.annualSalaryCve);
}

const STAFFING_CORRECTIONS_2025: RawStaffingPositionRow[] = [
  {
    id: "cv-maio-2025-staff-dafp-apoio-op-v",
    map_number: "Proposta do quadro de pessoal",
    cost_center_name: "Direcao de Administracao, Financas e Patrimonio",
    budget_code: "02.01.01.01.02",
    staff_group: "Pessoal de Quadro",
    position_title: "Apoio Operacional",
    level_label: "V",
    vacancy_count: 1,
    monthly_salary_cve: 45000,
    annual_salary_cve: 540000,
    source_page: 12,
  },
  {
    id: "cv-maio-2025-staff-dafp-tecnico-i-contratado",
    map_number: "Proposta do quadro de pessoal",
    cost_center_name: "Direcao de Administracao, Financas e Patrimonio",
    budget_code: "02.01.01.01.03",
    staff_group: "Pessoal Contratado",
    position_title: "Tecnico",
    level_label: "I",
    vacancy_count: 1,
    monthly_salary_cve: 73000,
    annual_salary_cve: 876000,
    source_page: 12,
  },
  {
    id: "cv-maio-2025-staff-dafp-assistente-tecnico-vi-a",
    map_number: "Proposta do quadro de pessoal",
    cost_center_name: "Direcao de Administracao, Financas e Patrimonio",
    budget_code: "02.01.01.01.03",
    staff_group: "Pessoal Contratado",
    position_title: "Assistente Tecnico",
    level_label: "VI",
    vacancy_count: 1,
    monthly_salary_cve: 63000,
    annual_salary_cve: 756000,
    source_page: 12,
  },
  {
    id: "cv-maio-2025-staff-dafp-assistente-tecnico-vi-b",
    map_number: "Proposta do quadro de pessoal",
    cost_center_name: "Direcao de Administracao, Financas e Patrimonio",
    budget_code: "02.01.01.01.03",
    staff_group: "Pessoal Contratado",
    position_title: "Assistente Tecnico",
    level_label: "VI",
    vacancy_count: 1,
    monthly_salary_cve: 63000,
    annual_salary_cve: 693000,
    source_page: 12,
  },
  {
    id: "cv-maio-2025-staff-dafp-assistente-tecnico-i",
    map_number: "Proposta do quadro de pessoal",
    cost_center_name: "Direcao de Administracao, Financas e Patrimonio",
    budget_code: "02.01.01.01.03",
    staff_group: "Pessoal Contratado",
    position_title: "Assistente Tecnico",
    level_label: "I",
    vacancy_count: 4,
    monthly_salary_cve: 236000,
    annual_salary_cve: 2832000,
    source_page: 12,
  },
  {
    id: "cv-maio-2025-staff-dafp-apoio-op-i-a",
    map_number: "Proposta do quadro de pessoal",
    cost_center_name: "Direcao de Administracao, Financas e Patrimonio",
    budget_code: "02.01.01.01.03",
    staff_group: "Pessoal Contratado",
    position_title: "Apoio Operacional",
    level_label: "I",
    vacancy_count: 1,
    monthly_salary_cve: 45000,
    annual_salary_cve: 540000,
    source_page: 12,
  },
  {
    id: "cv-maio-2025-staff-dafp-apoio-op-iii-a",
    map_number: "Proposta do quadro de pessoal",
    cost_center_name: "Direcao de Administracao, Financas e Patrimonio",
    budget_code: "02.01.01.01.03",
    staff_group: "Pessoal Contratado",
    position_title: "Apoio Operacional",
    level_label: "III",
    vacancy_count: 1,
    monthly_salary_cve: 31000,
    annual_salary_cve: 372000,
    source_page: 12,
  },
  {
    id: "cv-maio-2025-staff-dafp-apoio-op-iv",
    map_number: "Proposta do quadro de pessoal",
    cost_center_name: "Direcao de Administracao, Financas e Patrimonio",
    budget_code: "02.01.01.01.03",
    staff_group: "Pessoal Contratado",
    position_title: "Apoio Operacional",
    level_label: "IV",
    vacancy_count: 2,
    monthly_salary_cve: 74000,
    annual_salary_cve: 888000,
    source_page: 12,
  },
  {
    id: "cv-maio-2025-staff-dafp-apoio-op-iii-b",
    map_number: "Proposta do quadro de pessoal",
    cost_center_name: "Direcao de Administracao, Financas e Patrimonio",
    budget_code: "02.01.01.01.03",
    staff_group: "Pessoal Contratado",
    position_title: "Apoio Operacional",
    level_label: "III",
    vacancy_count: 3,
    monthly_salary_cve: 93000,
    annual_salary_cve: 1116000,
    source_page: 12,
  },
  {
    id: "cv-maio-2025-staff-dafp-apoio-op-ii",
    map_number: "Proposta do quadro de pessoal",
    cost_center_name: "Direcao de Administracao, Financas e Patrimonio",
    budget_code: "02.01.01.01.03",
    staff_group: "Pessoal Contratado",
    position_title: "Apoio Operacional",
    level_label: "II",
    vacancy_count: 1,
    monthly_salary_cve: 33000,
    annual_salary_cve: 396000,
    source_page: 12,
  },
  {
    id: "cv-maio-2025-staff-dafp-apoio-op-i-b",
    map_number: "Proposta do quadro de pessoal",
    cost_center_name: "Direcao de Administracao, Financas e Patrimonio",
    budget_code: "02.01.01.01.03",
    staff_group: "Pessoal Contratado",
    position_title: "Apoio Operacional",
    level_label: "I",
    vacancy_count: 1,
    monthly_salary_cve: 23000,
    annual_salary_cve: 276000,
    source_page: 12,
  },
  {
    id: "cv-maio-2025-staff-dafp-apoio-op-i-52",
    map_number: "Proposta do quadro de pessoal",
    cost_center_name: "Direcao de Administracao, Financas e Patrimonio",
    budget_code: "02.01.01.01.03",
    staff_group: "Pessoal Contratado",
    position_title: "Apoio Operacional",
    level_label: "I",
    vacancy_count: 52,
    monthly_salary_cve: 988000,
    annual_salary_cve: 11856000,
    source_page: 12,
  },
  {
    id: "cv-maio-2025-staff-ddes-tecnico-i-c",
    map_number: "Proposta do quadro de pessoal",
    cost_center_name: "Direcao de Desenvolvimento Economico e Social",
    budget_code: "02.01.01.01.03",
    staff_group: "Pessoal Contratado",
    position_title: "Tecnico",
    level_label: "I",
    vacancy_count: 1,
    monthly_salary_cve: 73000,
    annual_salary_cve: 876000,
    source_page: 12,
  },
  {
    id: "cv-maio-2025-staff-ddes-assistente-tecnico-i",
    map_number: "Proposta do quadro de pessoal",
    cost_center_name: "Direcao de Desenvolvimento Economico e Social",
    budget_code: "02.01.01.01.03",
    staff_group: "Pessoal Contratado",
    position_title: "Assistente Tecnico",
    level_label: "I",
    vacancy_count: 1,
    monthly_salary_cve: 59000,
    annual_salary_cve: 708000,
    source_page: 12,
  },
  {
    id: "cv-maio-2025-staff-ddes-apoio-op-ii",
    map_number: "Proposta do quadro de pessoal",
    cost_center_name: "Direcao de Desenvolvimento Economico e Social",
    budget_code: "02.01.01.01.03",
    staff_group: "Pessoal Contratado",
    position_title: "Apoio Operacional",
    level_label: "II",
    vacancy_count: 1,
    monthly_salary_cve: 25000,
    annual_salary_cve: 300000,
    source_page: 12,
  },
  {
    id: "cv-maio-2025-staff-dasc-apoio-op-iii",
    map_number: "Proposta do quadro de pessoal",
    cost_center_name: "Direcao de Ambiente, Saneamento e Protecao Civil",
    budget_code: "02.01.01.01.03",
    staff_group: "Pessoal Contratado",
    position_title: "Apoio Operacional",
    level_label: "III",
    vacancy_count: 1,
    monthly_salary_cve: 31000,
    annual_salary_cve: 279000,
    source_page: 12,
  },
  {
    id: "cv-maio-2025-staff-dasc-apoio-op-i-30",
    map_number: "Proposta do quadro de pessoal",
    cost_center_name: "Direcao de Ambiente, Saneamento e Protecao Civil",
    budget_code: "02.01.01.01.03",
    staff_group: "Pessoal Contratado",
    position_title: "Apoio Operacional",
    level_label: "I",
    vacancy_count: 30,
    monthly_salary_cve: 518000,
    annual_salary_cve: 6216000,
    source_page: 12,
  },
  {
    id: "cv-maio-2025-staff-duit-apoio-op-v",
    map_number: "Proposta do quadro de pessoal",
    cost_center_name: "Direcao de Urbanismo, Infraestruturas e Transporte",
    budget_code: "02.01.01.01.03",
    staff_group: "Pessoal Contratado",
    position_title: "Apoio Operacional",
    level_label: "V",
    vacancy_count: 1,
    monthly_salary_cve: 45000,
    annual_salary_cve: 540000,
    source_page: 12,
  },
  {
    id: "cv-maio-2025-staff-duit-apoio-op-iv",
    map_number: "Proposta do quadro de pessoal",
    cost_center_name: "Direcao de Urbanismo, Infraestruturas e Transporte",
    budget_code: "02.01.01.01.03",
    staff_group: "Pessoal Contratado",
    position_title: "Apoio Operacional",
    level_label: "IV",
    vacancy_count: 2,
    monthly_salary_cve: 74000,
    annual_salary_cve: 888000,
    source_page: 12,
  },
  {
    id: "cv-maio-2025-staff-duit-apoio-op-i-4",
    map_number: "Proposta do quadro de pessoal",
    cost_center_name: "Direcao de Urbanismo, Infraestruturas e Transporte",
    budget_code: "02.01.01.01.03",
    staff_group: "Pessoal Contratado",
    position_title: "Apoio Operacional",
    level_label: "I",
    vacancy_count: 4,
    monthly_salary_cve: 100000,
    annual_salary_cve: 1200000,
    source_page: 12,
  },
];

function staffingSignature(raw: RawStaffingPositionRow) {
  const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase();
  return [
    normalize(raw.cost_center_name),
    normalize(raw.budget_code),
    normalize(raw.position_title),
    normalize(raw.level_label),
    Number(raw.vacancy_count ?? 0),
    Number(raw.monthly_salary_cve ?? 0),
    Number(raw.annual_salary_cve ?? 0),
  ].join("|");
}

function withStaffingCorrections(
  year: BudgetYear,
  rows: Array<Record<string, unknown>> | undefined,
) {
  const base = Array.isArray(rows) ? [...rows] : [];
  if (year !== 2025) return base;

  const seen = new Set(base.map((row) => staffingSignature(row)));
  for (const correction of STAFFING_CORRECTIONS_2025) {
    const signature = staffingSignature(correction);
    if (seen.has(signature)) continue;
    base.push({
      ...correction,
      extraction_confidence: 0.85,
      needs_manual_review: true,
    });
    seen.add(signature);
  }

  return base;
}

function countManualReviews(raw: RawBudgetDocument) {
  const collections = [
    raw.budget_line_items ?? [],
    raw.funding_sources ?? [],
    raw.investment_projects ?? [],
    raw.staffing_positions ?? [],
    raw.personnel_projections ?? [],
  ];

  return collections.reduce((total, collection) => {
    return (
      total +
      collection.filter(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          "needs_manual_review" in item &&
          item.needs_manual_review === true
      ).length
    );
  }, 0);
}

function buildSummary(raw: RawBudgetDocument) {
  const summary = raw.budget_summary ?? {};
  const totalRevenue = summary.revenue_total_cve ?? 0;
  const totalExpense = summary.expense_total_cve ?? 0;
  const capitalExpense = summary.expense_capital_cve ?? 0;
  const staffingDataAvailable =
    Boolean(raw.staffing_summary) ||
    Boolean(raw.staffing_positions?.length) ||
    Boolean(raw.personnel_projections?.length);

  return {
    totalRevenueCve: totalRevenue,
    totalExpenseCve: totalExpense,
    fiscalBalanceCve: totalRevenue - totalExpense,
    currentRevenueCve: summary.revenue_current_cve ?? 0,
    capitalRevenueCve: summary.revenue_capital_cve ?? 0,
    currentExpenseCve: summary.expense_current_cve ?? 0,
    capitalExpenseCve: capitalExpense,
    investmentSharePct:
      totalExpense > 0 ? Number(((capitalExpense / totalExpense) * 100).toFixed(2)) : 0,
    currentExpenseSharePct: summary.operating_share_pct ?? 0,
    sourceDeclaredTotalCve: raw.source_document?.total_amount_cve ?? totalRevenue,
    staffingDataAvailable,
    staffingPositionCount: raw.staffing_summary?.total_positions ?? 0,
    manualReviewCount: countManualReviews(raw),
    notes: [summary.notes, ...(raw.source_document?.ingestion_notes ?? [])].filter(
      (note): note is string => Boolean(note)
    ),
  };
}

function normalizeCompensationBlock(block?: RawCompensationBlock | null) {
  if (!block) return null;

  const departments = (block.departments ?? [])
    .filter((item) => item.department_name)
    .map((item) => ({
      departmentName: item.department_name?.trim() || "Sem designacao",
      vacancies: item.vacancies ?? 0,
      monthlyCve: item.monthly_cve ?? 0,
      annualCve: item.annual_cve ?? 0,
    }))
    .sort((a, b) => b.annualCve - a.annualCve);

  return {
    sourcePage: typeof block.source_page === "number" ? block.source_page : null,
    title: block.title?.trim() || null,
    totalVacancies:
      block.total_vacancies ??
      departments.reduce((sum, item) => sum + item.vacancies, 0),
    totalMonthlyCve:
      block.total_monthly_cve ??
      departments.reduce((sum, item) => sum + item.monthlyCve, 0),
    totalAnnualCve:
      block.total_annual_cve ??
      departments.reduce((sum, item) => sum + item.annualCve, 0),
    departments,
    notes: (block.notes ?? []).filter((note): note is string => Boolean(note)),
  };
}

function buildCompensationFramework(raw: RawBudgetDocument) {
  const framework = raw.compensation_framework;
  if (!framework) return null;

  const base = normalizeCompensationBlock(framework.base);
  const adjustmentsBase = normalizeCompensationBlock(framework.adjustments);
  const adjustmentItems = (framework.adjustments?.items ?? [])
    .filter((item) => item.department_name && item.position_title)
    .map((item) => ({
      departmentName: item.department_name?.trim() || "Sem designacao",
      positionTitle: item.position_title?.trim() || "Sem cargo",
      vacancies: item.vacancies ?? 0,
      monthlyCve: item.monthly_cve ?? 0,
      annualCve: item.annual_cve ?? 0,
      employmentType: item.employment_type?.trim() || null,
      notes: item.notes?.trim() || null,
    }))
    .sort((a, b) => b.annualCve - a.annualCve);

  const adjustments = adjustmentsBase
    ? {
        ...adjustmentsBase,
        items: adjustmentItems,
      }
    : null;

  const combinedTotalVacancies = (base?.totalVacancies ?? 0) + (adjustments?.totalVacancies ?? 0);
  const combinedTotalMonthly = (base?.totalMonthlyCve ?? 0) + (adjustments?.totalMonthlyCve ?? 0);
  const combinedTotalAnnual = (base?.totalAnnualCve ?? 0) + (adjustments?.totalAnnualCve ?? 0);

  return {
    currency: framework.currency?.trim() || "CVE",
    base,
    adjustments,
    combined: {
      totalVacancies: combinedTotalVacancies,
      totalMonthlyCve: combinedTotalMonthly,
      totalAnnualCve: combinedTotalAnnual,
    },
  };
}

function normalizeBudgetDocument(year: BudgetYear, raw: RawBudgetDocument): BudgetApiResponse {
  const items = raw.budget_line_items ?? [];
  const projects = raw.investment_projects ?? [];
  const fundingSources = raw.funding_sources ?? [];
  const totalExpenseCve = raw.budget_summary?.expense_total_cve ?? 0;

  return {
    scope: "municipal",
    dataset: "budget",
    municipality: "Maio",
    year,
    availableYears: [...AVAILABLE_BUDGET_YEARS],
    sourceDocument: {
      id: raw.source_document?.id ?? null,
      title: raw.source_document?.title ?? null,
      publicationDate: raw.source_document?.publication_date ?? null,
      approvalDate: raw.source_document?.approval_date ?? null,
      signatureDate: raw.source_document?.signature_date ?? null,
      publicationIssueNumber: raw.source_document?.publication_issue_number ?? null,
      publicationSeries: raw.source_document?.publication_series ?? null,
      sourceFileName: raw.source_document?.source_file_name ?? null,
      sourceFilePath: raw.source_document?.source_file_path ?? null,
      signatoryName: raw.source_document?.signatory_name ?? null,
      issuingBody: raw.source_document?.issuing_body ?? null,
    },
    decision: {
      decisionNumber: raw.decision?.decision_number ?? null,
      votesFor: raw.decision?.votes_for ?? 0,
      votesAgainst: raw.decision?.votes_against ?? 0,
      votesAbstain: raw.decision?.votes_abstain ?? 0,
      supportingGroup: raw.decision?.supporting_group ?? null,
      opposingGroup: raw.decision?.opposing_group ?? null,
    },
    summary: buildSummary(raw),
    revenueBreakdown: getTopLevelEconomicBreakdown(items, "revenue"),
    expenseBreakdown: getTopLevelEconomicBreakdown(items, "expense"),
    functionalBreakdown: getFunctionalBreakdown(items),
    departmentBreakdown: getDepartmentBreakdown(items, totalExpenseCve),
    investmentPrograms: getInvestmentPrograms(projects),
    investmentProjects: getInvestmentProjects(projects),
    fundingSources: getFundingSources(fundingSources),
    staffingPositions: getStaffingPositions(
      withStaffingCorrections(
        year,
        raw.staffing_positions as Array<Record<string, unknown>> | undefined,
      ),
    ),
    compensationFramework: buildCompensationFramework(raw),
    legalHighlights: raw.legal_highlights ?? [],
    fiscalOperations: raw.fiscal_operations ?? null,
    notes: raw.source_document?.ingestion_notes ?? [],
  };
}

export async function getBudgetDataset(
  yearInput?: string | null
): Promise<BudgetApiResponse> {
  const year = resolveBudgetYear(yearInput);
  const filePath = DATASET_FILES[year];
  const rawText = await fs.readFile(filePath, "utf8");
  const rawData = JSON.parse(rawText) as RawBudgetDocument;
  return normalizeBudgetDocument(year, rawData);
}
