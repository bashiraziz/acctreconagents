/**
 * Gemini Multi-Agent Pipeline
 * 4 Sequential Agents: Validation → Analysis → Investigation → Report
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// Lazy initialization to ensure dotenv has loaded
let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI | null {
  if (genAI === null) {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    if (geminiKey) {
      genAI = new GoogleGenerativeAI(geminiKey);
      console.log("✅ Gemini client initialized successfully");
    } else {
      console.log("⚠️  No Gemini API key found in environment");
    }
  }
  return genAI;
}

function getGeminiModel() {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

// ============================================
// Retry Logic for Rate Limiting
// ============================================

interface GeminiError {
  status?: number;
  statusText?: string;
  errorDetails?: Array<{
    "@type"?: string;
    retryDelay?: string;
  }>;
}

function parseRetryDelay(error: any): number {
  // Default retry delay in milliseconds
  const defaultDelay = 10000; // 10 seconds

  if (!error.errorDetails) return defaultDelay;

  const retryInfo = error.errorDetails.find(
    (detail: any) => detail["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
  );

  if (retryInfo?.retryDelay) {
    // Parse delay like "12s" or "1.5s"
    const match = retryInfo.retryDelay.match(/^([\d.]+)s?$/);
    if (match) {
      return Math.ceil(parseFloat(match[1]) * 1000);
    }
  }

  return defaultDelay;
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 0,
  operationName: string = "Gemini API call"
): Promise<{ result: T; retryCount: number }> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return { result, retryCount: attempt };
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit error
      if (error.status === 429 && attempt < maxRetries) {
        const retryDelay = parseRetryDelay(error);
        console.log(
          `⏳ ${operationName} rate limited. Retrying in ${retryDelay / 1000}s (attempt ${attempt + 1}/${maxRetries})...`
        );

        // Wait for the specified delay
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }

      // For non-429 errors or max retries exceeded, throw immediately
      throw error;
    }
  }

  throw lastError;
}

// ============================================
// Type Definitions
// ============================================

type LocalToolOutput = {
  materiality: number;
  reconciliations: any[];
  rollForward: any[];
  transactions: any[];
};

type RunInput = {
  userPrompt: string;
  payload: any;
};

export type GeminiAgentStatus = {
  success: boolean;
  retryCount?: number;
  usedFallback: boolean;
  error?: string;
  durationMs?: number;
};

export type GeminiAgentResults = {
  validation: any | null;
  analysis: any | null;
  investigation: any | null;
  report: string | null;
  status: {
    validation: GeminiAgentStatus;
    analysis: GeminiAgentStatus;
    investigation: GeminiAgentStatus;
    report: GeminiAgentStatus;
  };
};

// ============================================
// Agent 1: Data Validation Agent
// ============================================

async function runValidationAgent(
  input: RunInput,
  localOutput: LocalToolOutput,
): Promise<{ data: any | null; status: GeminiAgentStatus }> {
  const client = getGeminiClient();
  if (!client) {
    return {
      data: null,
      status: { success: false, usedFallback: false, error: "No Gemini API key" },
    };
  }

  const model = client.getGenerativeModel({
    model: getGeminiModel(),
    generationConfig: {
      temperature: 0.3, // Low temperature for validation
      responseMimeType: "application/json",
    },
  });

  const prompt = `You are a data validation specialist for accounting reconciliations.

Analyze the following reconciliation data and provide validation insights:

USER PROMPT: ${input.userPrompt}

RECONCILIATION RESULTS (CALCULATED):
${JSON.stringify(localOutput.reconciliations, null, 2)}

GL BALANCES (${input.payload.glBalances?.length || 0} rows total):
${JSON.stringify(input.payload.glBalances || [])}

SUBLEDGER BALANCES (${input.payload.subledgerBalances?.length || 0} rows total):
${JSON.stringify(input.payload.subledgerBalances || [])}

TRANSACTIONS (${input.payload.transactions?.length || 0} rows total):
${JSON.stringify(input.payload.transactions?.slice(0, 10) || [])}

IMPORTANT: Base your validation on the RECONCILIATION RESULTS above, which show the actual calculated balances and variances. Do not contradict these results. If the reconciliation shows 0 variance and "balanced" status, acknowledge that the accounts are balanced.

Provide a validation report in JSON format with:
{
  "isValid": boolean,
  "confidence": number (0-1),
  "warnings": string[],
  "errors": string[],
  "dataQualityScore": number (0-100),
  "suggestions": string[]
}`;

  try {
    const { result, retryCount } = await retryWithBackoff(
      async () => {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        return JSON.parse(responseText);
      },
      2, // maxRetries
      "Validation Agent"
    );
    return {
      data: result,
      status: { success: true, retryCount, usedFallback: false },
    };
  } catch (error: any) {
    console.error("Validation Agent failed:", error);
    return {
      data: {
        isValid: true,
        confidence: 0.5,
        warnings: ["Validation agent encountered an error"],
        errors: [],
        dataQualityScore: 70,
        suggestions: [],
      },
      status: {
        success: false,
        usedFallback: true,
        error: error.message || "Unknown error",
      },
    };
  }
}

// ============================================
// Agent 2: Reconciliation Analyst Agent
// ============================================

async function runAnalysisAgent(
  input: RunInput,
  localOutput: LocalToolOutput,
  validationResult: any,
): Promise<{ data: any | null; status: GeminiAgentStatus }> {
  const client = getGeminiClient();
  if (!client) {
    return {
      data: null,
      status: { success: false, usedFallback: false, error: "No Gemini API key" },
    };
  }

  const model = client.getGenerativeModel({
    model: getGeminiModel(),
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
    },
  });

  const prompt = `You are a reconciliation analyst specializing in variance detection.

Analyze these reconciliation results:

RECONCILIATIONS (${localOutput.reconciliations.length} accounts):
${JSON.stringify(localOutput.reconciliations, null, 2)}

MATERIALITY THRESHOLD: $${localOutput.materiality}

VALIDATION RESULT:
${JSON.stringify(validationResult, null, 2)}

IMPORTANT: The RECONCILIATIONS data above shows the ACTUAL calculated results. Each reconciliation shows:
- glBalance: The GL balance for that account
- subledgerBalance: The sum of all subledger entries for that account
- variance: The difference (GL - Subledger)
- status: "balanced" means variance is 0 or negligible

If an account shows status="balanced" and variance=0, it means the GL and subledger ARE reconciled. Do not report these as variances or discrepancies.

Only flag accounts where:
- status = "material_variance"
- variance is not 0
- material = true

Provide analysis in JSON format:
{
  "riskLevel": "low" | "medium" | "high",
  "materialVariances": [
    {
      "account": string,
      "variance": number,
      "percentage": number,
      "pattern": string,
      "priority": "low" | "medium" | "high"
    }
  ],
  "patterns": string[],
  "flags": string[],
  "overallHealth": number (0-100)
}`;

  try {
    const { result, retryCount } = await retryWithBackoff(
      async () => {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        return JSON.parse(responseText);
      },
      2, // maxRetries
      "Analysis Agent"
    );
    return {
      data: result,
      status: { success: true, retryCount, usedFallback: false },
    };
  } catch (error: any) {
    console.error("Analysis Agent failed:", error);
    return {
      data: {
        riskLevel: "medium",
        materialVariances: [],
        patterns: [],
        flags: [],
        overallHealth: 75,
      },
      status: {
        success: false,
        usedFallback: true,
        error: error.message || "Unknown error",
      },
    };
  }
}

// ============================================
// Agent 3: Investigator Agent
// ============================================

async function runInvestigatorAgent(
  input: RunInput,
  localOutput: LocalToolOutput,
  analysisResult: any,
): Promise<{ data: any | null; status: GeminiAgentStatus }> {
  const client = getGeminiClient();
  if (!client) {
    return {
      data: null,
      status: { success: false, usedFallback: false, error: "No Gemini API key" },
    };
  }

  // Only run if there are material variances
  if (!analysisResult.materialVariances || analysisResult.materialVariances.length === 0) {
    return {
      data: {
        investigations: [],
        message: "No material variances to investigate",
      },
      status: { success: true, retryCount: 0, usedFallback: false },
    };
  }

  const model = client.getGenerativeModel({
    model: getGeminiModel(),
    generationConfig: {
      temperature: 0.6, // Higher temp for creative problem-solving
      responseMimeType: "application/json",
    },
  });

  const prompt = `You are a variance investigator for accounting reconciliations.

Investigate these material variances:

MATERIAL VARIANCES:
${JSON.stringify(analysisResult.materialVariances, null, 2)}

RELATED TRANSACTIONS:
${JSON.stringify(localOutput.transactions.slice(0, 10), null, 2)}

ROLL FORWARD DATA:
${JSON.stringify(localOutput.rollForward, null, 2)}

For each material variance, provide investigation results in JSON format:
{
  "investigations": [
    {
      "account": string,
      "variance": number,
      "possibleCauses": string[],
      "suggestedActions": string[],
      "confidenceLevel": "low" | "medium" | "high",
      "needsManualReview": boolean,
      "auditNotes": string
    }
  ]
}`;

  try {
    const { result, retryCount } = await retryWithBackoff(
      async () => {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        return JSON.parse(responseText);
      },
      2, // maxRetries
      "Investigator Agent"
    );
    return {
      data: result,
      status: { success: true, retryCount, usedFallback: false },
    };
  } catch (error: any) {
    console.error("Investigator Agent failed:", error);
    return {
      data: {
        investigations: [],
        message: "Investigation encountered an error",
      },
      status: {
        success: false,
        usedFallback: true,
        error: error.message || "Unknown error",
      },
    };
  }
}

// ============================================
// Agent 4: Report Generator Agent
// ============================================

export async function runReportAgent(
  input: RunInput,
  localOutput: LocalToolOutput,
  validationResult: any,
  analysisResult: any,
  investigationResult: any,
): Promise<{ data: string | null; status: GeminiAgentStatus }> {
  const client = getGeminiClient();
  if (!client) {
    return {
      data: null,
      status: { success: false, usedFallback: false, error: "No Gemini API key" },
    };
  }

  const model = client.getGenerativeModel({
    model: getGeminiModel(),
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 800,
    },
  });

  const reconciliationSummary = localOutput.reconciliations.map(
    ({ transactions, notes, ...rest }) => ({
      ...rest,
      notes: Array.isArray(notes) ? notes.slice(0, 3) : notes,
      transactionCount: Array.isArray(transactions) ? transactions.length : 0,
    })
  );
  const periods = Array.from(
    new Set(
      localOutput.reconciliations
        .map((rec) => rec.period)
        .filter((period) => period && period !== "unspecified")
    )
  );
  const reportingPeriodLabel = formatReportingPeriod(periods);
  const reportingDateLabel = formatReportingDate(periods);

  const prompt = `You are a report writer creating audit-ready reconciliation documentation for an AI-POWERED AUTOMATED RECONCILIATION SYSTEM.

IMPORTANT CONTEXT:
This reconciliation was performed AUTOMATICALLY by Rowshni, an AI-powered reconciliation platform. The reconciliation process, variance detection, and analysis are ALREADY AUTOMATED. Do NOT recommend automation, automated matching, or implementing AI/ML systems - those are already in use.

Create a comprehensive reconciliation report based on:

USER REQUEST: ${input.userPrompt}

RECONCILIATION DATA (PRIMARY SOURCE OF TRUTH):
${JSON.stringify(reconciliationSummary, null, 2)}

REPORTING PERIODS:
${periods.length > 0 ? periods.join(", ") : "unspecified"}

VALIDATION RESULTS:
${JSON.stringify(validationResult, null, 2)}

ANALYSIS RESULTS:
${JSON.stringify(analysisResult, null, 2)}

INVESTIGATION RESULTS:
${JSON.stringify(investigationResult, null, 2)}

CRITICAL INSTRUCTIONS:
- The RECONCILIATION DATA above is the PRIMARY SOURCE OF TRUTH
- Each account shows: glBalance, subledgerBalance, variance, status, material
- If status="balanced" and variance=0, the account IS reconciled - state this clearly
- If status="material_variance", there IS a discrepancy that needs investigation
- DO NOT contradict the reconciliation data with validation/analysis findings
- If validation/analysis conflicts with reconciliation data, TRUST the reconciliation data
- DO NOT recommend automation or AI implementation - this IS an automated AI system
- Focus recommendations on BUSINESS ACTIONS (adjusting entries, contacting vendors, reviewing transactions)
- Avoid generic or obvious recommendations that add no value
- Do NOT invent dates or periods. If periods are "unspecified", omit dates entirely.
- Do NOT dump raw JSON or large tables. Keep output concise and readable.

Create a professional markdown report with:
1. Executive Summary (2-3 sentences)
2. Reconciliation Status (balanced accounts vs variances) - Use the reconciliation data status
3. Material Variances (ONLY if reconciliation data shows material=true) - with details
4. Root Cause Analysis (ONLY for accounts with actual variances)
5. Recommended Actions (ONLY if there are actual issues requiring business action)
6. Conclusion

Format in clean markdown suitable for audit documentation.
Target length: 300-600 words.
If you include "Reporting Period", write it as Month YYYY (example: October 2025).`;

  try {
    const { result, retryCount } = await retryWithBackoff(
      async () => {
        const result = await model.generateContent(prompt);
        return result.response.text();
      },
      2, // maxRetries
      "Report Agent"
    );
    const normalizedReport = normalizeReportMetadata(
      result,
      reportingPeriodLabel,
      reportingDateLabel
    );
    return {
      data: normalizedReport,
      status: { success: true, retryCount, usedFallback: false },
    };
  } catch (error: any) {
    console.error("Report Agent failed:", error);
  return {
    data: `# Reconciliation Report

## Error
Unable to generate full report due to technical error.

## Summary
Processed ${localOutput.reconciliations.length} accounts with materiality threshold of $${localOutput.materiality}.`,
      status: {
        success: false,
        usedFallback: true,
        error: error.message || "Unknown error",
      },
    };
  }
}

function formatReportingPeriod(periods: string[]) {
  if (periods.length === 0) return null;
  const normalized = periods
    .map((period) => period.trim())
    .filter(Boolean)
    .map((period) => period.slice(0, 7));

  const formatted = normalized
    .map(toMonthYear)
    .filter((label): label is string => Boolean(label));

  if (formatted.length === 0) return null;
  if (formatted.length === 1) return formatted[0];
  return `${formatted[0]} – ${formatted[formatted.length - 1]}`;
}

function toMonthYear(period: string) {
  const match = period.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || month < 1 || month > 12) return null;
  const monthName = new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
  });
  return `${monthName} ${year}`;
}

function patchReportingPeriod(report: string, label: string) {
  const pattern = /(Reporting Period:\s*)(.*)/i;
  if (pattern.test(report)) {
    return report.replace(pattern, `$1${label}`);
  }
  return report;
}

function formatReportingDate(periods: string[]) {
  if (periods.length === 0) return null;
  const normalized = periods
    .map((period) => period.trim())
    .filter(Boolean)
    .map((period) => period.slice(0, 7));
  const last = normalized[normalized.length - 1];
  if (!last) return null;
  const match = last.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || month < 1 || month > 12) return null;
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

function patchReportDate(report: string, label: string) {
  const pattern = /(Date:\s*)(.*)/i;
  if (pattern.test(report)) {
    return report.replace(pattern, `$1${label}`);
  }
  return report;
}

function normalizeReportMetadata(
  report: string,
  periodLabel: string | null,
  dateLabel: string | null
) {
  let updated = report;
  if (periodLabel) {
    updated = patchReportingPeriod(updated, periodLabel);
  }
  if (dateLabel) {
    updated = patchReportDate(updated, dateLabel);
  }
  return updated;
}

// ============================================
// Main Pipeline Orchestrator
// ============================================

export async function runGeminiAgentPipeline(
  input: RunInput,
  localOutput: LocalToolOutput,
): Promise<GeminiAgentResults> {
  console.log("🤖 Starting Gemini Agent Pipeline...");
  const client = getGeminiClient();
  console.log("   Gemini client initialized:", !!client);

  const results: GeminiAgentResults = {
    validation: null,
    analysis: null,
    investigation: null,
    report: null,
    status: {
      validation: { success: false, usedFallback: false },
      analysis: { success: false, usedFallback: false },
      investigation: { success: false, usedFallback: false },
      report: { success: false, usedFallback: false },
    },
  };

  try {
    // Agent 1: Data Validation
    console.log("  → Agent 1: Data Validation");
    const validationStart = Date.now();
    const validationResult = await runValidationAgent(input, localOutput);
    results.validation = validationResult.data;
    results.status.validation = {
      ...validationResult.status,
      durationMs: Date.now() - validationStart,
    };
    console.log("     Result:", validationResult.status.success ? "✓ Success" : "⚠ Fallback");
    if (validationResult.status.retryCount) {
      console.log(`     Retries: ${validationResult.status.retryCount}`);
    }

    // Agent 2: Reconciliation Analysis
    console.log("  → Agent 2: Reconciliation Analysis");
    const analysisStart = Date.now();
    const analysisResult = await runAnalysisAgent(
      input,
      localOutput,
      results.validation,
    );
    results.analysis = analysisResult.data;
    results.status.analysis = {
      ...analysisResult.status,
      durationMs: Date.now() - analysisStart,
    };
    console.log("     Result:", analysisResult.status.success ? "✓ Success" : "⚠ Fallback");
    if (analysisResult.status.retryCount) {
      console.log(`     Retries: ${analysisResult.status.retryCount}`);
    }

    // Agent 3: Variance Investigation (conditional)
    console.log("  → Agent 3: Variance Investigation");
    const investigationStart = Date.now();
    const investigationResult = await runInvestigatorAgent(
      input,
      localOutput,
      results.analysis,
    );
    results.investigation = investigationResult.data;
    results.status.investigation = {
      ...investigationResult.status,
      durationMs: Date.now() - investigationStart,
    };
    console.log("     Result:", investigationResult.status.success ? "✓ Success" : "⚠ Fallback");
    if (investigationResult.status.retryCount) {
      console.log(`     Retries: ${investigationResult.status.retryCount}`);
    }

    // Agent 4: Report Generation
    console.log("  → Agent 4: Report Generation");
    const reportStart = Date.now();
    const reportResult = await runReportAgent(
      input,
      localOutput,
      results.validation,
      results.analysis,
      results.investigation,
    );
    results.report = reportResult.data;
    results.status.report = {
      ...reportResult.status,
      durationMs: Date.now() - reportStart,
    };
    console.log("     Result:", reportResult.status.success ? "✓ Success" : "⚠ Fallback");
    if (reportResult.status.retryCount) {
      console.log(`     Retries: ${reportResult.status.retryCount}`);
    }

    console.log("✅ Gemini Agent Pipeline Complete");
    console.log("   Final results summary:", {
      hasValidation: !!results.validation,
      hasAnalysis: !!results.analysis,
      hasInvestigation: !!results.investigation,
      hasReport: !!results.report,
      allSucceeded: Object.values(results.status).every(s => s.success),
    });
  } catch (error) {
    console.error("❌ Gemini Agent Pipeline Error:", error);
  }

  return results;
}
