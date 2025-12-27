/**
 * Shared TypeScript types for the reconciliation application
 */

// ============================================
// File Upload Types
// ============================================

export type FileType = "gl_balance" | "subledger_balance" | "transactions";

export type UploadedFile = {
  id: string;
  name: string;
  type: FileType;
  size: number;
  uploadedAt: number;
  rowCount: number;
  columnCount: number;
  headers: string[];
  rows: Record<string, any>[];
  metadata?: {
    accountCode?: string;    // For files missing account codes (e.g., subledger with vendor names)
    period?: string;          // For files where period is in header, not in rows (format: YYYY-MM)
    currency?: string;        // For files missing currency (e.g., "USD", "EUR", "GBP")
    reportDate?: string;      // Original report date extracted from PDF/header
    reverseSign?: boolean;    // Multiply all amounts by -1 to fix sign convention mismatches
  };
};

// ============================================
// Column Mapping Types
// ============================================

export type ColumnMapping = Record<string, string>;

export type MappingSuggestion = {
  canonicalField: string;
  suggestedColumn: string;
  confidence: number;
  reason: string;
};

// ============================================
// Reconciliation Data Types
// ============================================

export type Balance = {
  account_code: string;
  period?: string;
  amount: number;
  currency?: string;
};

export type Transaction = {
  account_code: string;
  booked_at: string | Date;
  debit?: number;
  credit?: number;
  amount?: number;
  narrative?: string;
  source_period?: string;
};

export type ReconciliationPayload = {
  glBalances: Balance[];
  subledgerBalances: Balance[];
  transactions?: Transaction[];
  orderedPeriods?: string[];
  activityByPeriod?: Record<string, number>;
  adjustmentsByPeriod?: Record<string, number>;
};

// ============================================
// Agent Result Types
// ============================================

export type DataValidationResult = {
  isValid: boolean;
  suggestedMappings: Record<string, string>;
  warnings: string[];
  errors: string[];
  confidence: number;
};

export type VarianceAnalysis = {
  account: string;
  variance: number;
  percentage: number;
  pattern: string;
  priority: "low" | "medium" | "high";
};

export type ReconciliationAnalysisResult = {
  riskLevel: "low" | "medium" | "high";
  materialVariances: VarianceAnalysis[];
  patterns: string[];
  flags: string[];
};

export type Investigation = {
  account: string;
  variance: number;
  possibleCauses: string[];
  suggestedActions: string[];
  confidenceLevel: "low" | "medium" | "high";
  needsManualReview: boolean;
};

export type InvestigationResult = {
  investigations: Investigation[];
};

export type ReportResult = {
  summary: string;
  detailedNotes: string;
  auditTrail: string;
};

export type GeminiAgentStatus = {
  success: boolean;
  retryCount?: number;
  usedFallback: boolean;
  error?: string;
};

export type GeminiAgentResults = {
  validation: DataValidationResult | null;
  analysis: ReconciliationAnalysisResult | null;
  investigation: InvestigationResult | null;
  report: ReportResult | null;
  status: {
    validation: GeminiAgentStatus;
    analysis: GeminiAgentStatus;
    investigation: GeminiAgentStatus;
    report: GeminiAgentStatus;
  };
};

// ============================================
// Orchestrator Response Types
// ============================================

export type TimelineEntry = {
  stage: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "skipped";
  detail: string;
  timestamp: string;
};

export type ReconciliationResult = {
  account: string;
  period: string;
  glBalance: number;
  subledgerBalance: number;
  variance: number;
  status: "balanced" | "immaterial_variance" | "material_variance";
  material: boolean;
  activity: number;
  adjustments: number;
  notes: string[];
  transactions: any[];
};

export type RollForwardEntry = {
  account: string;
  period: string;
  opening: number;
  activity: number;
  adjustments: number;
  closing: number;
  commentary: string;
};

export type LocalToolOutput = {
  materiality: number;
  reconciliations: ReconciliationResult[];
  rollForward: RollForwardEntry[];
  transactions: any[];
};

export type OrchestratorResponse = {
  runId: string;
  spec: {
    name: string;
    version: string;
    summary: string;
  };
  timeline: TimelineEntry[];
  geminiAgents?: GeminiAgentResults;
  toolOutput: LocalToolOutput;
};

// ============================================
// User Data Types (for authenticated users)
// ============================================

export type UserMapping = {
  id: string;
  userId: string;
  fileType: FileType;
  mapping: ColumnMapping;
  createdAt: string;
  updatedAt: string;
};

export type UserAccount = {
  id: string;
  userId: string;
  accountCode: string;
  accountName: string;
  materialityThreshold: number;
  createdAt: string;
};

export type ReconciliationHistory = {
  id: string;
  userId: string;
  runId: string;
  accounts: string[];
  periods: string[];
  status: "success" | "failed" | "partial";
  summary: string;
  createdAt: string;
};

// ============================================
// UI State Types
// ============================================

export type WorkflowStep = "upload" | "map" | "preview" | "run";

export type WorkflowStatus = {
  upload: "incomplete" | "complete";
  map: "incomplete" | "complete";
  preview: "incomplete" | "complete";
  run: "not_started" | "running" | "complete" | "failed";
};

// ============================================
// Error Types
// ============================================

export type AppError = {
  message: string;
  detail?: string;
  help?: string[];
  technical?: string;
};
