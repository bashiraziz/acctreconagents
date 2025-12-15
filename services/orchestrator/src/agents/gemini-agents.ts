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
  return process.env.GEMINI_MODEL || "gemini-2.0-flash-exp";
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

export type GeminiAgentResults = {
  validation: any | null;
  analysis: any | null;
  investigation: any | null;
  report: string | null;
};

// ============================================
// Agent 1: Data Validation Agent
// ============================================

async function runValidationAgent(
  input: RunInput,
  localOutput: LocalToolOutput,
): Promise<any | null> {
  const client = getGeminiClient();
  if (!client) return null;

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

GL BALANCES (${input.payload.glBalances?.length || 0} rows):
${JSON.stringify(input.payload.glBalances?.slice(0, 3) || [])}

SUBLEDGER BALANCES (${input.payload.subledgerBalances?.length || 0} rows):
${JSON.stringify(input.payload.subledgerBalances?.slice(0, 3) || [])}

TRANSACTIONS (${input.payload.transactions?.length || 0} rows):
${JSON.stringify(input.payload.transactions?.slice(0, 3) || [])}

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
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Validation Agent failed:", error);
    return {
      isValid: true,
      confidence: 0.5,
      warnings: ["Validation agent encountered an error"],
      errors: [],
      dataQualityScore: 70,
      suggestions: [],
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
): Promise<any | null> {
  const client = getGeminiClient();
  if (!client) return null;

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
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Analysis Agent failed:", error);
    return {
      riskLevel: "medium",
      materialVariances: [],
      patterns: [],
      flags: [],
      overallHealth: 75,
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
): Promise<any | null> {
  const client = getGeminiClient();
  if (!client) return null;

  // Only run if there are material variances
  if (!analysisResult.materialVariances || analysisResult.materialVariances.length === 0) {
    return {
      investigations: [],
      message: "No material variances to investigate",
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
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Investigator Agent failed:", error);
    return {
      investigations: [],
      message: "Investigation encountered an error",
    };
  }
}

// ============================================
// Agent 4: Report Generator Agent
// ============================================

async function runReportAgent(
  input: RunInput,
  localOutput: LocalToolOutput,
  validationResult: any,
  analysisResult: any,
  investigationResult: any,
): Promise<string | null> {
  const client = getGeminiClient();
  if (!client) return null;

  const model = client.getGenerativeModel({
    model: getGeminiModel(),
    generationConfig: {
      temperature: 0.5,
    },
  });

  const prompt = `You are a report writer creating audit-ready reconciliation documentation.

Create a comprehensive reconciliation report based on:

USER REQUEST: ${input.userPrompt}

VALIDATION RESULTS:
${JSON.stringify(validationResult, null, 2)}

ANALYSIS RESULTS:
${JSON.stringify(analysisResult, null, 2)}

INVESTIGATION RESULTS:
${JSON.stringify(investigationResult, null, 2)}

RECONCILIATION DATA:
${JSON.stringify(localOutput.reconciliations, null, 2)}

Create a professional markdown report with:
1. Executive Summary (2-3 sentences)
2. Reconciliation Status (balanced accounts vs variances)
3. Material Variances (if any, with details)
4. Root Cause Analysis (from investigation)
5. Recommended Actions
6. Conclusion

Format in clean markdown suitable for audit documentation.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Report Agent failed:", error);
    return `# Reconciliation Report

## Error
Unable to generate full report due to technical error.

## Summary
Processed ${localOutput.reconciliations.length} accounts with materiality threshold of $${localOutput.materiality}.`;
  }
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
  };

  try {
    // Agent 1: Data Validation
    console.log("  → Agent 1: Data Validation");
    results.validation = await runValidationAgent(input, localOutput);
    console.log("     Result:", results.validation ? "✓ Success" : "✗ Null");

    // Agent 2: Reconciliation Analysis
    console.log("  → Agent 2: Reconciliation Analysis");
    results.analysis = await runAnalysisAgent(
      input,
      localOutput,
      results.validation,
    );
    console.log("     Result:", results.analysis ? "✓ Success" : "✗ Null");

    // Agent 3: Variance Investigation (conditional)
    console.log("  → Agent 3: Variance Investigation");
    results.investigation = await runInvestigatorAgent(
      input,
      localOutput,
      results.analysis,
    );
    console.log("     Result:", results.investigation ? "✓ Success" : "✗ Null");

    // Agent 4: Report Generation
    console.log("  → Agent 4: Report Generation");
    results.report = await runReportAgent(
      input,
      localOutput,
      results.validation,
      results.analysis,
      results.investigation,
    );
    console.log("     Result:", results.report ? `✓ Success (${typeof results.report})` : "✗ Null");

    console.log("✅ Gemini Agent Pipeline Complete");
    console.log("   Final results summary:", {
      hasValidation: !!results.validation,
      hasAnalysis: !!results.analysis,
      hasInvestigation: !!results.investigation,
      hasReport: !!results.report,
    });
  } catch (error) {
    console.error("❌ Gemini Agent Pipeline Error:", error);
  }

  return results;
}
