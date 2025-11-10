#!/usr/bin/env node

/**
 * ClientForge Build MCP Server
 * Build orchestration, CI gate, type checking, and linting
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || 'D:\\clientforge-crm';
const SCRIPTS_ROOT = process.env.SCRIPTS_ROOT || 'D:\\clientforge-crm\\scripts';

class ClientForgeBuild {
  async execCommand(command, args = [], options = {}) {
    return new Promise((resolve) => {
      const proc = spawn(command, args, {
        cwd: WORKSPACE_ROOT,
        shell: true,
        ...options
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          exitCode: code,
          stdout,
          stderr,
          success: code === 0
        });
      });
    });
  }

  async runCIGate() {
    const results = {
      typeCheck: null,
      lint: null,
      tests: null,
      build: null,
      overall: {
        success: false,
        passed: 0,
        failed: 0,
        duration: 0
      }
    };

    const startTime = Date.now();

    // 1. Type Check
    console.error('[CI Gate] Running type check...');
    results.typeCheck = await this.typeCheck();
    if (results.typeCheck.success) results.overall.passed++;
    else results.overall.failed++;

    // 2. Lint
    console.error('[CI Gate] Running lint...');
    results.lint = await this.lint();
    if (results.lint.success) results.overall.passed++;
    else results.overall.failed++;

    // 3. Tests
    console.error('[CI Gate] Running tests...');
    results.tests = await this.runTests({ coverage: false });
    if (results.tests.success) results.overall.passed++;
    else results.overall.failed++;

    // 4. Build
    console.error('[CI Gate] Running build...');
    results.build = await this.build();
    if (results.build.success) results.overall.passed++;
    else results.overall.failed++;

    results.overall.duration = (Date.now() - startTime) / 1000;
    results.overall.success = results.overall.failed === 0;

    return {
      success: results.overall.success,
      results,
      verificationCode: results.overall.success ? 'CI-GATE-PASSED' : 'CI-GATE-FAILED'
    };
  }

  async typeCheck() {
    const result = await this.execCommand('npx', ['tsc', '--noEmit']);

    // Parse TypeScript errors
    const errors = [];
    const errorLines = result.stderr.split('\n').filter(line =>
      line.includes(': error TS')
    );

    for (const line of errorLines.slice(0, 10)) { // Limit to 10 errors
      const match = line.match(/(.+)\((\d+),(\d+)\): error (TS\d+): (.+)/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          code: match[4],
          message: match[5]
        });
      }
    }

    return {
      success: result.success,
      errors,
      errorCount: errorLines.length,
      duration: null
    };
  }

  async lint() {
    const result = await this.execCommand('npx', ['eslint', '.', '--ext', '.ts,.tsx,.js,.jsx']);

    // Parse ESLint output
    const warnings = (result.stdout.match(/warning/g) || []).length;
    const errors = (result.stdout.match(/error/g) || []).length;

    return {
      success: result.success,
      warnings,
      errors,
      output: result.stdout.substring(0, 1000) // Limit output
    };
  }

  async runTests(options = {}) {
    const { coverage = false, file = null } = options;

    const args = ['jest'];

    if (file) {
      args.push(file);
    }

    if (coverage) {
      args.push('--coverage');
    }

    const result = await this.execCommand('npx', args);

    // Parse Jest output
    const testMatch = result.stdout.match(/Tests:\s+(?:(\d+) failed,\s*)?(?:(\d+) passed,\s*)?(\d+) total/);
    const tests = testMatch ? {
      failed: parseInt(testMatch[1] || '0'),
      passed: parseInt(testMatch[2] || '0'),
      total: parseInt(testMatch[3] || '0')
    } : null;

    return {
      success: result.success,
      tests,
      output: result.stdout.substring(0, 1000)
    };
  }

  async build() {
    const result = await this.execCommand('npm', ['run', 'build']);

    return {
      success: result.success,
      output: result.stdout.substring(0, 500),
      errors: result.stderr.substring(0, 500)
    };
  }

  async runScript(scriptName) {
    const result = await this.execCommand('npm', ['run', scriptName]);

    return {
      success: result.success,
      exitCode: result.exitCode,
      output: result.stdout,
      errors: result.stderr
    };
  }

  async clean() {
    const dirsToClean = ['dist', 'build', 'coverage', '.next'];

    const results = [];
    for (const dir of dirsToClean) {
      const fullPath = path.join(WORKSPACE_ROOT, dir);
      try {
        await fs.rm(fullPath, { recursive: true, force: true });
        results.push({ dir, success: true });
      } catch (error) {
        results.push({ dir, success: false, error: error.message });
      }
    }

    return {
      success: true,
      cleaned: results
    };
  }

  async getBuildInfo() {
    try {
      const packageJson = await fs.readFile(path.join(WORKSPACE_ROOT, 'package.json'), 'utf8');
      const pkg = JSON.parse(packageJson);

      return {
        success: true,
        name: pkg.name,
        version: pkg.version,
        scripts: Object.keys(pkg.scripts || {}),
        dependencies: Object.keys(pkg.dependencies || {}).length,
        devDependencies: Object.keys(pkg.devDependencies || {}).length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// MCP Server Interface
const server = new ClientForgeBuild();
console.error('[ClientForge Build MCP] Server started');

process.stdin.on('data', async (data) => {
  try {
    const request = JSON.parse(data.toString());
    let response;

    switch (request.method) {
      case 'run_ci_gate':
        response = await server.runCIGate();
        break;
      case 'type_check':
        response = await server.typeCheck();
        break;
      case 'lint':
        response = await server.lint();
        break;
      case 'run_tests':
        response = await server.runTests(request.params);
        break;
      case 'build':
        response = await server.build();
        break;
      case 'run_script':
        response = await server.runScript(request.params.script);
        break;
      case 'clean':
        response = await server.clean();
        break;
      case 'get_build_info':
        response = await server.getBuildInfo();
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
