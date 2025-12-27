/**
 * AI Agent Behavior Validation
 *
 * Validates that Gemini agents produce appropriate outputs for variance scenarios:
 * - Data Validation Agent: Appropriate warnings
 * - Analysis Agent: Pattern recognition
 * - Investigation Agent: Root cause depth
 * - Report Generator: Language quality and recommendations
 */

export interface AIAgentExpectations {
  validation?: {
    isValid?: boolean;
    confidence?: string;
    warnings?: string[];
    errors?: string[];
  };
  analysis?: {
    riskLevel?: string;
    materialVariances?: any[];
    patterns?: string[];
    overallHealth?: string;
  };
  investigation?: {
    investigations?: Array<{
      account: string;
      root_cause_keywords?: string[];
      process_level_thinking?: boolean;
    }>;
    message?: string;
  };
  report?: {
    should_contain?: string[];
    should_not_contain?: string[];
    language_focus?: string;
    critical_phrases?: string[];
  };
}

export interface AIValidationResult {
  passed: boolean;
  checks: AICheck[];
  score: number;
}

export interface AICheck {
  category: string;
  check: string;
  passed: boolean;
  details?: string;
}

/**
 * Validate AI agent behavior against expectations
 */
export function validateAIBehavior(
  geminiResults: any,
  expectations: AIAgentExpectations
): AIValidationResult {
  const checks: AICheck[] = [];

  // Validate Data Validation Agent
  if (expectations.validation) {
    checks.push(...validateValidationAgent(geminiResults.validation, expectations.validation));
  }

  // Validate Reconciliation Analyst Agent
  if (expectations.analysis) {
    checks.push(...validateAnalysisAgent(geminiResults.analysis, expectations.analysis));
  }

  // Validate Variance Investigator Agent
  if (expectations.investigation) {
    checks.push(...validateInvestigationAgent(geminiResults.investigation, expectations.investigation));
  }

  // Validate Report Generator Agent
  if (expectations.report) {
    checks.push(...validateReportAgent(geminiResults.report, expectations.report));
  }

  const passedChecks = checks.filter(c => c.passed).length;
  const score = checks.length > 0 ? Math.round((passedChecks / checks.length) * 100) : 0;

  return {
    passed: score >= 70, // 70% threshold for AI behavior
    checks,
    score,
  };
}

/**
 * Validate Data Validation Agent output
 */
function validateValidationAgent(actual: any, expected: any): AICheck[] {
  const checks: AICheck[] = [];

  if (!actual) {
    checks.push({
      category: 'Validation Agent',
      check: 'Agent executed',
      passed: false,
      details: 'No validation agent output found',
    });
    return checks;
  }

  // Check confidence level
  if (expected.confidence) {
    const confidenceCheck = checkRange(actual.confidence, expected.confidence);
    checks.push({
      category: 'Validation Agent',
      check: 'Confidence level',
      passed: confidenceCheck,
      details: `Expected ${expected.confidence}, got ${actual.confidence}`,
    });
  }

  // Check warnings
  if (expected.warnings && expected.warnings.length > 0) {
    const actualWarnings = JSON.stringify(actual.warnings || []).toLowerCase();
    for (const warning of expected.warnings) {
      const found = actualWarnings.includes(warning.toLowerCase());
      checks.push({
        category: 'Validation Agent',
        check: `Warning: ${warning}`,
        passed: found,
        details: found ? 'Found' : 'Not found in warnings',
      });
    }
  }

  return checks;
}

/**
 * Validate Reconciliation Analyst Agent output
 */
function validateAnalysisAgent(actual: any, expected: any): AICheck[] {
  const checks: AICheck[] = [];

  if (!actual) {
    checks.push({
      category: 'Analysis Agent',
      check: 'Agent executed',
      passed: false,
      details: 'No analysis agent output found',
    });
    return checks;
  }

  // Check risk level
  if (expected.riskLevel) {
    checks.push({
      category: 'Analysis Agent',
      check: 'Risk level',
      passed: actual.riskLevel?.toLowerCase() === expected.riskLevel.toLowerCase(),
      details: `Expected ${expected.riskLevel}, got ${actual.riskLevel}`,
    });
  }

  // Check pattern detection
  if (expected.patterns && expected.patterns.length > 0) {
    const analysisText = JSON.stringify(actual).toLowerCase();
    for (const pattern of expected.patterns) {
      const found = analysisText.includes(pattern.toLowerCase());
      checks.push({
        category: 'Analysis Agent',
        check: `Pattern: ${pattern}`,
        passed: found,
        details: found ? 'Pattern detected' : 'Pattern not mentioned',
      });
    }
  }

  // Check material variances count
  if (expected.materialVariances) {
    const expectedCount = expected.materialVariances.length;
    const actualCount = actual.materialVariances?.length || 0;
    checks.push({
      category: 'Analysis Agent',
      check: 'Material variances count',
      passed: actualCount === expectedCount,
      details: `Expected ${expectedCount}, got ${actualCount}`,
    });
  }

  return checks;
}

/**
 * Validate Variance Investigator Agent output
 */
function validateInvestigationAgent(actual: any, expected: any): AICheck[] {
  const checks: AICheck[] = [];

  if (!actual) {
    checks.push({
      category: 'Investigation Agent',
      check: 'Agent executed',
      passed: false,
      details: 'No investigation agent output found',
    });
    return checks;
  }

  // Check investigations exist
  const actualInvestigations = actual.investigations || [];
  const expectedInvestigations = expected.investigations || [];

  if (expectedInvestigations.length > 0) {
    checks.push({
      category: 'Investigation Agent',
      check: 'Investigations performed',
      passed: actualInvestigations.length >= expectedInvestigations.length,
      details: `Expected ${expectedInvestigations.length}, got ${actualInvestigations.length}`,
    });

    // Check root cause keywords for each investigation
    for (const expInv of expectedInvestigations) {
      const actInv = actualInvestigations.find((a: any) => a.account === expInv.account);

      if (!actInv) {
        checks.push({
          category: 'Investigation Agent',
          check: `Investigation for account ${expInv.account}`,
          passed: false,
          details: 'Investigation not found',
        });
        continue;
      }

      // Check for root cause keywords
      if (expInv.root_cause_keywords) {
        const invText = JSON.stringify(actInv).toLowerCase();
        const keywordsFound = expInv.root_cause_keywords.filter(
          (kw: string) => invText.includes(kw.toLowerCase())
        );
        const threshold = Math.ceil(expInv.root_cause_keywords.length * 0.5); // At least 50% of keywords

        checks.push({
          category: 'Investigation Agent',
          check: `Root cause analysis for ${expInv.account}`,
          passed: keywordsFound.length >= threshold,
          details: `Found ${keywordsFound.length}/${expInv.root_cause_keywords.length} keywords: ${keywordsFound.join(', ')}`,
        });
      }

      // Check for process-level thinking
      if (expInv.process_level_thinking) {
        const processKeywords = ['interface', 'process', 'systematic', 'system', 'posting logic', 'calculation'];
        const invText = JSON.stringify(actInv).toLowerCase();
        const hasProcessThinking = processKeywords.some(kw => invText.includes(kw));

        checks.push({
          category: 'Investigation Agent',
          check: `Process-level thinking for ${expInv.account}`,
          passed: hasProcessThinking,
          details: hasProcessThinking
            ? 'Uses process-level language'
            : 'Missing process-level thinking',
        });
      }
    }
  }

  return checks;
}

/**
 * Validate Report Generator Agent output
 */
function validateReportAgent(actual: any, expected: any): AICheck[] {
  const checks: AICheck[] = [];

  if (!actual) {
    checks.push({
      category: 'Report Generator',
      check: 'Agent executed',
      passed: false,
      details: 'No report generated',
    });
    return checks;
  }

  const reportText = typeof actual === 'string' ? actual : JSON.stringify(actual);
  const reportLower = reportText.toLowerCase();

  // Check should_contain phrases
  if (expected.should_contain) {
    for (const phrase of expected.should_contain) {
      const found = reportLower.includes(phrase.toLowerCase());
      checks.push({
        category: 'Report Generator',
        check: `Contains: "${phrase}"`,
        passed: found,
        details: found ? 'Found in report' : 'Not found in report',
      });
    }
  }

  // Check should_not_contain phrases
  if (expected.should_not_contain) {
    for (const phrase of expected.should_not_contain) {
      const notFound = !reportLower.includes(phrase.toLowerCase());
      checks.push({
        category: 'Report Generator',
        check: `Avoids: "${phrase}"`,
        passed: notFound,
        details: notFound ? 'Correctly avoided' : 'Inappropriately included',
      });
    }
  }

  // Check critical phrases (for systematic errors)
  if (expected.critical_phrases) {
    const foundCount = expected.critical_phrases.filter(
      (phrase: string) => reportLower.includes(phrase.toLowerCase())
    ).length;
    const threshold = Math.ceil(expected.critical_phrases.length * 0.5); // At least 50%

    checks.push({
      category: 'Report Generator',
      check: 'Critical phrases for systematic errors',
      passed: foundCount >= threshold,
      details: `Found ${foundCount}/${expected.critical_phrases.length} critical phrases`,
    });
  }

  return checks;
}

/**
 * Helper: Check if a value is within a range
 */
function checkRange(actual: number, expected: string): boolean {
  if (expected.includes('>=')) {
    const min = parseFloat(expected.replace('>=', '').trim());
    return actual >= min;
  }
  if (expected.includes('-')) {
    const [min, max] = expected.split('-').map(s => parseFloat(s.trim()));
    return actual >= min && actual <= max;
  }
  return actual === parseFloat(expected);
}
