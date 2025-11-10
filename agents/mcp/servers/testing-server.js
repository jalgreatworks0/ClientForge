#!/usr/bin/env node

/**
 * ClientForge Testing MCP Server
 * Jest test execution, coverage analysis, and watch mode
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || 'D:\\clientforge-crm';
const TEST_RUNNER = process.env.TEST_RUNNER || 'jest';

class ClientForgeTesting {
  constructor() {
    this.watchProcess = null;
  }

  async runTests(options = {}) {
    const {
      path: testPath = '',
      coverage = false,
      verbose = false,
      watch = false,
      updateSnapshots = false
    } = options;

    const args = [];

    if (testPath) {
      args.push(testPath);
    }

    if (coverage) {
      args.push('--coverage');
      args.push('--coverageReporters=json');
      args.push('--coverageReporters=text');
    }

    if (verbose) {
      args.push('--verbose');
    }

    if (watch) {
      args.push('--watch');
    }

    if (updateSnapshots) {
      args.push('--updateSnapshot');
    }

    return new Promise((resolve) => {
      const jest = spawn('npx', ['jest', ...args], {
        cwd: WORKSPACE_ROOT,
        shell: true
      });

      let stdout = '';
      let stderr = '';

      jest.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      jest.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      jest.on('close', (code) => {
        const result = this.parseJestOutput(stdout, stderr);
        resolve({
          success: code === 0,
          exitCode: code,
          ...result
        });
      });
    });
  }

  parseJestOutput(stdout, stderr) {
    const result = {
      tests: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        todo: 0
      },
      coverage: null,
      failures: [],
      duration: null
    };

    // Parse test counts
    const testMatch = stdout.match(/Tests:\s+(?:(\d+) failed,\s*)?(?:(\d+) skipped,\s*)?(?:(\d+) todo,\s*)?(?:(\d+) passed,\s*)?(\d+) total/);
    if (testMatch) {
      result.tests.failed = parseInt(testMatch[1] || '0');
      result.tests.skipped = parseInt(testMatch[2] || '0');
      result.tests.todo = parseInt(testMatch[3] || '0');
      result.tests.passed = parseInt(testMatch[4] || '0');
      result.tests.total = parseInt(testMatch[5] || '0');
    }

    // Parse coverage
    const coverageMatch = stdout.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
    if (coverageMatch) {
      result.coverage = {
        statements: parseFloat(coverageMatch[1]),
        branches: parseFloat(coverageMatch[2]),
        functions: parseFloat(coverageMatch[3]),
        lines: parseFloat(coverageMatch[4])
      };
    }

    // Parse duration
    const durationMatch = stdout.match(/Time:\s+([\d.]+)\s*s/);
    if (durationMatch) {
      result.duration = parseFloat(durationMatch[1]);
    }

    // Parse failures
    const failureRegex = /●\s+(.+?)\n\n\s+([\s\S]+?)(?=\n\s+at|$)/g;
    let match;
    while ((match = failureRegex.exec(stdout)) !== null) {
      result.failures.push({
        test: match[1].trim(),
        error: match[2].trim().substring(0, 500) // Limit error length
      });
    }

    return result;
  }

  async runSingleFile(filePath) {
    return this.runTests({ path: filePath, verbose: true });
  }

  async runWithCoverage() {
    const result = await this.runTests({ coverage: true });

    // Try to read detailed coverage from file
    try {
      const coveragePath = path.join(WORKSPACE_ROOT, 'coverage', 'coverage-summary.json');
      const coverageData = await fs.readFile(coveragePath, 'utf8');
      const coverageJson = JSON.parse(coverageData);

      result.detailedCoverage = {
        total: coverageJson.total,
        fileCount: Object.keys(coverageJson).length - 1 // Exclude 'total'
      };
    } catch (error) {
      // Coverage file not available
    }

    return result;
  }

  async startWatchMode() {
    if (this.watchProcess) {
      return {
        success: false,
        error: 'Watch mode already running'
      };
    }

    this.watchProcess = spawn('npx', ['jest', '--watch'], {
      cwd: WORKSPACE_ROOT,
      shell: true,
      detached: true,
      stdio: 'ignore'
    });

    return {
      success: true,
      message: 'Jest watch mode started',
      pid: this.watchProcess.pid
    };
  }

  async stopWatchMode() {
    if (!this.watchProcess) {
      return {
        success: false,
        error: 'Watch mode not running'
      };
    }

    this.watchProcess.kill();
    this.watchProcess = null;

    return {
      success: true,
      message: 'Jest watch mode stopped'
    };
  }

  async updateSnapshots() {
    return this.runTests({ updateSnapshots: true });
  }

  async getCoverageReport() {
    try {
      const coveragePath = path.join(WORKSPACE_ROOT, 'coverage', 'coverage-summary.json');
      const coverageData = await fs.readFile(coveragePath, 'utf8');
      const coverageJson = JSON.parse(coverageData);

      // Sort files by coverage (lowest first)
      const files = [];
      for (const [filePath, data] of Object.entries(coverageJson)) {
        if (filePath === 'total') continue;

        files.push({
          path: filePath,
          statements: data.statements.pct,
          branches: data.branches.pct,
          functions: data.functions.pct,
          lines: data.lines.pct,
          avgCoverage: (
            data.statements.pct +
            data.branches.pct +
            data.functions.pct +
            data.lines.pct
          ) / 4
        });
      }

      files.sort((a, b) => a.avgCoverage - b.avgCoverage);

      return {
        success: true,
        total: coverageJson.total,
        files: files.slice(0, 20), // Top 20 lowest coverage files
        summary: {
          statements: coverageJson.total.statements.pct,
          branches: coverageJson.total.branches.pct,
          functions: coverageJson.total.functions.pct,
          lines: coverageJson.total.lines.pct
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Coverage report not found. Run tests with --coverage first.',
        message: error.message
      };
    }
  }

  async findTestsForFile(filePath) {
    // Find corresponding test file
    const relativePath = path.relative(WORKSPACE_ROOT, filePath);
    const testPatterns = [
      relativePath.replace(/\.ts$/, '.test.ts'),
      relativePath.replace(/\.tsx$/, '.test.tsx'),
      relativePath.replace(/\.js$/, '.test.js'),
      relativePath.replace(/\.jsx$/, '.test.jsx'),
      relativePath.replace(/^backend\//, 'tests/backend/').replace(/\.ts$/, '.test.ts'),
      relativePath.replace(/^frontend\/src\//, 'tests/frontend/').replace(/\.(ts|tsx)$/, '.test.$1')
    ];

    const foundTests = [];
    for (const pattern of testPatterns) {
      const testPath = path.join(WORKSPACE_ROOT, pattern);
      try {
        await fs.access(testPath);
        foundTests.push(pattern);
      } catch {
        // Test file doesn't exist
      }
    }

    return {
      success: true,
      sourceFile: relativePath,
      testFiles: foundTests,
      count: foundTests.length
    };
  }

  async runTestsForPattern(pattern) {
    return this.runTests({ path: pattern, verbose: true });
  }
}

// MCP Server Interface
const server = new ClientForgeTesting();
console.error('[ClientForge Testing MCP] Server started');

process.stdin.on('data', async (data) => {
  try {
    const request = JSON.parse(data.toString());
    let response;

    switch (request.method) {
      case 'run_tests':
        response = await server.runTests(request.params);
        break;
      case 'run_single_file':
        response = await server.runSingleFile(request.params.file);
        break;
      case 'run_with_coverage':
        response = await server.runWithCoverage();
        break;
      case 'start_watch_mode':
        response = await server.startWatchMode();
        break;
      case 'stop_watch_mode':
        response = await server.stopWatchMode();
        break;
      case 'update_snapshots':
        response = await server.updateSnapshots();
        break;
      case 'get_coverage_report':
        response = await server.getCoverageReport();
        break;
      case 'find_tests_for_file':
        response = await server.findTestsForFile(request.params.file);
        break;
      case 'run_tests_for_pattern':
        response = await server.runTestsForPattern(request.params.pattern);
        break;
      default:
        response = {
          success: false,
          error: `Unknown method: ${request.method}`
        };
    }

    process.stdout.write(JSON.stringify({
      id: request.id,
      result: response
    }) + '\n');
  } catch (error) {
    process.stdout.write(JSON.stringify({
      id: request.id || null,
      error: {
        code: -32603,
        message: error.message
      }
    }) + '\n');
  }
});
