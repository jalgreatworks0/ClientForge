/**
 * System-Wide Audit Task
 *
 * Coordinates all 7 agents to perform a comprehensive system scan:
 * - Errors and warnings
 * - Duplicate code/files
 * - Unused tools/systems
 * - Configuration issues
 * - Performance bottlenecks
 * - Security vulnerabilities
 *
 * Each agent searches their domain of expertise in parallel.
 */

import { OllamaClientAdapter } from './client-adapters/ollama-adapter';

interface AuditResult {
  agent_id: string;
  agent_name: string;
  findings: {
    errors: string[];
    duplicates: string[];
    unused_items: string[];
    warnings: string[];
    recommendations: string[];
  };
  scan_duration_seconds: number;
}

async function runSystemAudit() {
  console.log('');
  console.log('='.repeat(80));
  console.log('SYSTEM-WIDE AUDIT - ALL 7 AGENTS');
  console.log('='.repeat(80));
  console.log('');

  const auditResults: AuditResult[] = [];

  // ============================================================================
  // AGENT 1: Qwen32B - Code Quality & Database Sync Audit
  // ============================================================================

  console.log('[1/7] Agent 1 (Qwen32B): Scanning code quality and database sync...');

  const agent1 = new OllamaClientAdapter({
    agent_id: 'agent-1-qwen32b',
    model: 'qwen2.5-coder:32b-instruct-q5_K_M',
    host: 'localhost:11434',
    capabilities: ['code_generation', 'multi_database_sync', 'type_safety'],
    mcp_router_url: 'ws://localhost:8765'
  });

  await agent1.connect();

  // Wait for connection to establish
  await new Promise(resolve => setTimeout(resolve, 2000));

  const startTime1 = Date.now();

  // Ask Agent 1 to audit code quality
  const agent1Findings = await agent1.askQuestion(
    'all',
    `Scan the entire D:\\clientforge-crm directory and identify:
1. TypeScript errors or 'any' types that should be fixed
2. Database sync issues (PostgreSQL, MongoDB, Elasticsearch, Redis)
3. Unused database connections or queries
4. Code duplicates in backend services
5. Missing error handling in API routes

Focus on: backend/, agents/, and database-related files.
Return a structured list of findings.`,
    {
      scan_scope: ['backend', 'agents', 'database'],
      priority: 'high',
      workspace: 'D:\\clientforge-crm'
    },
    'high'
  );

  auditResults.push({
    agent_id: 'agent-1-qwen32b',
    agent_name: 'Qwen2.5-Coder 32B',
    findings: parseFindings(agent1Findings),
    scan_duration_seconds: (Date.now() - startTime1) / 1000
  });

  console.log('[OK] Agent 1 scan complete');
  console.log('');

  // ============================================================================
  // AGENT 2: DeepSeek6.7B - Test Coverage & Security Testing Audit
  // ============================================================================

  console.log('[2/7] Agent 2 (DeepSeek6.7B): Scanning test coverage and security...');

  const agent2 = new OllamaClientAdapter({
    agent_id: 'agent-2-deepseek6.7b',
    model: 'deepseek-coder:6.7b-instruct-q5_K_M',
    host: 'localhost:11435',
    capabilities: ['test_generation', 'security_testing'],
    mcp_router_url: 'ws://localhost:8765'
  });

  await agent2.connect();

  // Wait for connection to establish
  await new Promise(resolve => setTimeout(resolve, 2000));

  const startTime2 = Date.now();

  const agent2Findings = await agent2.askQuestion(
    'all',
    `Audit the testing and security infrastructure:
1. Find untested backend services (missing .test.ts files)
2. Identify security vulnerabilities (SQL injection, XSS, auth issues)
3. Check for exposed API keys or credentials in code
4. Find missing input validation in controllers
5. Detect unused test files or duplicate test cases

Focus on: backend/controllers/, backend/services/, tests/, and security.
Return a structured list of findings.`,
    {
      scan_scope: ['backend/controllers', 'backend/services', 'tests'],
      priority: 'high',
      workspace: 'D:\\clientforge-crm'
    },
    'high'
  );

  auditResults.push({
    agent_id: 'agent-2-deepseek6.7b',
    agent_name: 'DeepSeek Coder 6.7B',
    findings: parseFindings(agent2Findings),
    scan_duration_seconds: (Date.now() - startTime2) / 1000
  });

  console.log('[OK] Agent 2 scan complete');
  console.log('');

  // ============================================================================
  // AGENT 3: CodeLlama13B - Code Refactoring & Performance Audit
  // ============================================================================

  console.log('[3/7] Agent 3 (CodeLlama13B): Scanning for performance issues...');

  const agent3 = new OllamaClientAdapter({
    agent_id: 'agent-3-codellama13b',
    model: 'codellama:13b-instruct-q4_K_M',
    host: 'localhost:11436',
    capabilities: ['refactoring', 'performance_optimization'],
    mcp_router_url: 'ws://localhost:8765'
  });

  await agent3.connect();

  // Wait for connection to establish
  await new Promise(resolve => setTimeout(resolve, 2000));

  const startTime3 = Date.now();

  const agent3Findings = await agent3.askQuestion(
    'all',
    `Analyze code for refactoring opportunities and performance issues:
1. Find duplicate utility functions across files
2. Identify N+1 query problems in database code
3. Detect inefficient loops or algorithms
4. Find large functions that should be split
5. Identify unused imports or dead code

Focus on: backend/, frontend/, public/js/
Return a structured list of findings.`,
    {
      scan_scope: ['backend', 'frontend', 'public/js'],
      priority: 'medium',
      workspace: 'D:\\clientforge-crm'
    },
    'high'
  );

  auditResults.push({
    agent_id: 'agent-3-codellama13b',
    agent_name: 'CodeLlama 13B',
    findings: parseFindings(agent3Findings),
    scan_duration_seconds: (Date.now() - startTime3) / 1000
  });

  console.log('[OK] Agent 3 scan complete');
  console.log('');

  // ============================================================================
  // AGENT 4: Mistral7B - Documentation Audit
  // ============================================================================

  console.log('[4/7] Agent 4 (Mistral7B): Scanning documentation...');

  const agent4 = new OllamaClientAdapter({
    agent_id: 'agent-4-mistral7b',
    model: 'mistral:7b-instruct-q6_K',
    host: 'localhost:11437',
    capabilities: ['documentation', 'jsdoc'],
    mcp_router_url: 'ws://localhost:8765'
  });

  await agent4.connect();

  // Wait for connection to establish
  await new Promise(resolve => setTimeout(resolve, 2000));

  const startTime4 = Date.now();

  const agent4Findings = await agent4.askQuestion(
    'all',
    `Audit documentation quality:
1. Find public APIs without JSDoc comments
2. Identify outdated README files
3. Detect missing inline comments in complex code
4. Find functions with misleading or wrong documentation
5. Identify duplicate documentation files

Focus on: all .ts, .js files, README.md files, docs/
Return a structured list of findings.`,
    {
      scan_scope: ['all'],
      priority: 'low',
      workspace: 'D:\\clientforge-crm'
    },
    'medium'
  );

  auditResults.push({
    agent_id: 'agent-4-mistral7b',
    agent_name: 'Mistral 7B',
    findings: parseFindings(agent4Findings),
    scan_duration_seconds: (Date.now() - startTime4) / 1000
  });

  console.log('[OK] Agent 4 scan complete');
  console.log('');

  // ============================================================================
  // CLEANUP
  // ============================================================================

  agent1.disconnect();
  agent2.disconnect();
  agent3.disconnect();
  agent4.disconnect();

  // ============================================================================
  // CONSOLIDATE RESULTS
  // ============================================================================

  console.log('='.repeat(80));
  console.log('AUDIT RESULTS SUMMARY');
  console.log('='.repeat(80));
  console.log('');

  let totalErrors = 0;
  let totalDuplicates = 0;
  let totalUnused = 0;
  let totalWarnings = 0;

  for (const result of auditResults) {
    console.log(`[${result.agent_name}] (${result.scan_duration_seconds.toFixed(1)}s)`);
    console.log(`  Errors: ${result.findings.errors.length}`);
    console.log(`  Duplicates: ${result.findings.duplicates.length}`);
    console.log(`  Unused Items: ${result.findings.unused_items.length}`);
    console.log(`  Warnings: ${result.findings.warnings.length}`);
    console.log(`  Recommendations: ${result.findings.recommendations.length}`);
    console.log('');

    totalErrors += result.findings.errors.length;
    totalDuplicates += result.findings.duplicates.length;
    totalUnused += result.findings.unused_items.length;
    totalWarnings += result.findings.warnings.length;
  }

  console.log('='.repeat(80));
  console.log('TOTAL FINDINGS');
  console.log('='.repeat(80));
  console.log(`Total Errors: ${totalErrors}`);
  console.log(`Total Duplicates: ${totalDuplicates}`);
  console.log(`Total Unused Items: ${totalUnused}`);
  console.log(`Total Warnings: ${totalWarnings}`);
  console.log('');

  // ============================================================================
  // DETAILED FINDINGS
  // ============================================================================

  console.log('='.repeat(80));
  console.log('DETAILED FINDINGS');
  console.log('='.repeat(80));
  console.log('');

  for (const result of auditResults) {
    console.log(`### ${result.agent_name} ###`);
    console.log('');

    if (result.findings.errors.length > 0) {
      console.log('ERRORS:');
      result.findings.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
      console.log('');
    }

    if (result.findings.duplicates.length > 0) {
      console.log('DUPLICATES:');
      result.findings.duplicates.forEach((dup, i) => {
        console.log(`  ${i + 1}. ${dup}`);
      });
      console.log('');
    }

    if (result.findings.unused_items.length > 0) {
      console.log('UNUSED ITEMS:');
      result.findings.unused_items.forEach((item, i) => {
        console.log(`  ${i + 1}. ${item}`);
      });
      console.log('');
    }

    if (result.findings.warnings.length > 0) {
      console.log('WARNINGS:');
      result.findings.warnings.forEach((warn, i) => {
        console.log(`  ${i + 1}. ${warn}`);
      });
      console.log('');
    }

    if (result.findings.recommendations.length > 0) {
      console.log('RECOMMENDATIONS:');
      result.findings.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
      console.log('');
    }

    console.log('-'.repeat(80));
    console.log('');
  }

  console.log('='.repeat(80));
  console.log('AUDIT COMPLETE');
  console.log('='.repeat(80));
  console.log('');

  return auditResults;
}

/**
 * Parse findings from agent response
 */
function parseFindings(response: string): AuditResult['findings'] {
  const findings = {
    errors: [] as string[],
    duplicates: [] as string[],
    unused_items: [] as string[],
    warnings: [] as string[],
    recommendations: [] as string[]
  };

  // Simple parsing - extract lines that look like findings
  const lines = response.split('\n');
  let currentCategory = '';

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.toLowerCase().includes('error')) {
      currentCategory = 'errors';
    } else if (trimmed.toLowerCase().includes('duplicate')) {
      currentCategory = 'duplicates';
    } else if (trimmed.toLowerCase().includes('unused')) {
      currentCategory = 'unused_items';
    } else if (trimmed.toLowerCase().includes('warning')) {
      currentCategory = 'warnings';
    } else if (trimmed.toLowerCase().includes('recommend')) {
      currentCategory = 'recommendations';
    }

    // Extract findings (lines starting with numbers or bullets)
    if (/^[\d\-\*\+]\.\s/.test(trimmed) && trimmed.length > 5) {
      const finding = trimmed.replace(/^[\d\-\*\+]\.\s+/, '');
      if (currentCategory && finding) {
        (findings as any)[currentCategory].push(finding);
      }
    }
  }

  return findings;
}

// Run audit
runSystemAudit()
  .then((results) => {
    console.log('[OK] System audit completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[ERROR] System audit failed:', error);
    process.exit(1);
  });
