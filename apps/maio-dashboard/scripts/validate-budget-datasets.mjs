import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const DATASETS = [
  {
    year: 2025,
    file: path.join(
      ROOT,
      "public",
      "data",
      "municipal-budget-ingestion",
      "maio-2025",
      "maio_budget_2025.first_pass.json"
    ),
  },
  {
    year: 2026,
    file: path.join(
      ROOT,
      "public",
      "data",
      "municipal-budget-ingestion",
      "maio-2026",
      "maio_budget_2026.first_pass.json"
    ),
  },
];

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function assertEqual(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function topLevelEconomicTotal(items, sectionType) {
  return sum(
    items
      .filter(
        (item) =>
          item.section_type === sectionType &&
          item.hierarchy_type?.includes("classification") &&
          typeof item.classification_code === "string" &&
          item.classification_code.split(".").filter(Boolean).length === 2
      )
      .map((item) => item.total_cve || 0)
  );
}

function topLevelFunctionalTotal(items) {
  return sum(
    items
      .filter(
        (item) =>
          item.section_type === "functional_expense" &&
          typeof item.classification_code === "string" &&
          item.classification_code.split(".").filter(Boolean).length === 3
      )
      .map((item) => item.total_cve || 0)
  );
}

for (const dataset of DATASETS) {
  const raw = fs.readFileSync(dataset.file, "utf8");
  const data = JSON.parse(raw);

  const revenueTotal = data.budget_summary?.revenue_total_cve ?? 0;
  const expenseTotal = data.budget_summary?.expense_total_cve ?? 0;
  const capitalExpense = data.budget_summary?.expense_capital_cve ?? 0;

  const revenueBreakdownTotal = topLevelEconomicTotal(
    data.budget_line_items ?? [],
    "revenue"
  );
  const expenseBreakdownTotal = topLevelEconomicTotal(
    data.budget_line_items ?? [],
    "expense"
  );
  const functionalTotal = topLevelFunctionalTotal(data.budget_line_items ?? []);
  const projectsTotal = sum(
    (data.investment_projects ?? []).map((item) => item.total_cve || 0)
  );
  const fundingTotal = sum(
    (data.funding_sources ?? []).map((item) => item.amount_cve || 0)
  );

  assertEqual(
    `${dataset.year} revenue top-level reconciliation`,
    revenueBreakdownTotal,
    revenueTotal
  );
  assertEqual(
    `${dataset.year} expense top-level reconciliation`,
    expenseBreakdownTotal,
    expenseTotal
  );
  assertEqual(
    `${dataset.year} functional reconciliation`,
    functionalTotal,
    expenseTotal
  );
  assertEqual(
    `${dataset.year} investment projects reconciliation`,
    projectsTotal,
    capitalExpense
  );
  assertEqual(
    `${dataset.year} funding reconciliation`,
    fundingTotal,
    capitalExpense
  );

  console.log(
    `[ok] ${dataset.year}: revenue=${revenueTotal} expense=${expenseTotal} capital=${capitalExpense} projects=${projectsTotal}`
  );
}

console.log("Budget datasets validated.");
