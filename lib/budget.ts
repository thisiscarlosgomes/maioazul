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
};

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
