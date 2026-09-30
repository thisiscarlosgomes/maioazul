-- PostgreSQL schema for ingesting municipal budget deliberations and annexes.

CREATE TABLE IF NOT EXISTS source_documents (
  id TEXT PRIMARY KEY,
  source_file_path TEXT NOT NULL,
  source_file_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  title TEXT,
  document_type TEXT NOT NULL,
  subtype TEXT,
  jurisdiction_country TEXT,
  jurisdiction_level TEXT,
  jurisdiction_name TEXT,
  issuing_body TEXT,
  signatory_name TEXT,
  publication_series TEXT,
  publication_issue_number TEXT,
  publication_date DATE,
  approval_date DATE,
  signature_date DATE,
  budget_year INTEGER,
  language_code TEXT DEFAULT 'pt-CV',
  currency_code TEXT DEFAULT 'CVE',
  total_amount_cve NUMERIC(18,2),
  summary_text TEXT,
  source_page_start INTEGER,
  source_page_end INTEGER,
  page_count INTEGER,
  extraction_method TEXT,
  extraction_confidence NUMERIC(4,3),
  review_status TEXT DEFAULT 'needs_review',
  ingestion_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS legislative_decisions (
  id TEXT PRIMARY KEY,
  source_document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  decision_number TEXT NOT NULL,
  decision_type TEXT DEFAULT 'deliberation',
  decision_subject TEXT,
  meeting_session_label TEXT,
  votes_for INTEGER,
  votes_against INTEGER,
  votes_abstain INTEGER,
  supporting_group TEXT,
  opposing_group TEXT,
  decision_text_excerpt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_summaries (
  id TEXT PRIMARY KEY,
  source_document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  summary_scope TEXT NOT NULL,
  revenue_total_cve NUMERIC(18,2),
  revenue_current_cve NUMERIC(18,2),
  revenue_capital_cve NUMERIC(18,2),
  expense_total_cve NUMERIC(18,2),
  expense_current_cve NUMERIC(18,2),
  expense_capital_cve NUMERIC(18,2),
  operating_share_pct NUMERIC(6,3),
  capital_share_pct NUMERIC(6,3),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS budget_line_items (
  id TEXT PRIMARY KEY,
  source_document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  map_number TEXT NOT NULL,
  section_type TEXT NOT NULL,
  hierarchy_type TEXT NOT NULL,
  classification_code TEXT,
  parent_classification_code TEXT,
  classification_label TEXT NOT NULL,
  department_name TEXT,
  program_name TEXT,
  subprogram_name TEXT,
  project_name TEXT,
  admin_direct_cve NUMERIC(18,2),
  services_autonomous_cve NUMERIC(18,2),
  operating_cve NUMERIC(18,2),
  investment_cve NUMERIC(18,2),
  subtotal_cve NUMERIC(18,2),
  total_cve NUMERIC(18,2),
  share_pct NUMERIC(6,3),
  source_page INTEGER NOT NULL,
  extraction_confidence NUMERIC(4,3) DEFAULT 0.900,
  needs_manual_review BOOLEAN DEFAULT FALSE,
  raw_text TEXT
);

CREATE TABLE IF NOT EXISTS funding_sources (
  id TEXT PRIMARY KEY,
  source_document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  related_budget_line_item_id TEXT REFERENCES budget_line_items(id) ON DELETE SET NULL,
  map_number TEXT NOT NULL,
  funding_source_name TEXT NOT NULL,
  funding_source_type TEXT,
  amount_cve NUMERIC(18,2) NOT NULL,
  source_page INTEGER NOT NULL,
  extraction_confidence NUMERIC(4,3) DEFAULT 0.900,
  needs_manual_review BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS staffing_positions (
  id TEXT PRIMARY KEY,
  source_document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  map_number TEXT NOT NULL,
  cost_center_name TEXT NOT NULL,
  budget_code TEXT,
  staff_group TEXT,
  position_title TEXT NOT NULL,
  level_label TEXT,
  vacancy_count NUMERIC(10,2),
  monthly_salary_cve NUMERIC(18,2),
  annual_salary_cve NUMERIC(18,2),
  employment_type TEXT,
  observation TEXT,
  source_page INTEGER NOT NULL,
  extraction_confidence NUMERIC(4,3) DEFAULT 0.750,
  needs_manual_review BOOLEAN DEFAULT TRUE,
  raw_text TEXT
);

CREATE TABLE IF NOT EXISTS personnel_projections (
  id TEXT PRIMARY KEY,
  source_document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  map_number TEXT NOT NULL,
  department_name TEXT NOT NULL,
  position_title TEXT NOT NULL,
  level_label TEXT,
  vacancy_count NUMERIC(10,2),
  projected_monthly_cost_cve NUMERIC(18,2),
  projected_annual_cost_cve NUMERIC(18,2),
  employment_type TEXT,
  observation TEXT,
  source_page INTEGER NOT NULL,
  extraction_confidence NUMERIC(4,3) DEFAULT 0.900,
  needs_manual_review BOOLEAN DEFAULT FALSE,
  raw_text TEXT
);

CREATE INDEX IF NOT EXISTS idx_source_documents_budget_year
  ON source_documents (budget_year);

CREATE INDEX IF NOT EXISTS idx_budget_line_items_doc_section
  ON budget_line_items (source_document_id, section_type, map_number);

CREATE INDEX IF NOT EXISTS idx_budget_line_items_classification_code
  ON budget_line_items (classification_code);

CREATE INDEX IF NOT EXISTS idx_staffing_positions_doc_cost_center
  ON staffing_positions (source_document_id, cost_center_name);

CREATE INDEX IF NOT EXISTS idx_personnel_projections_doc_department
  ON personnel_projections (source_document_id, department_name);
