#!/usr/bin/env node

/**
 * ClientForge Codebase MCP Server
 * Intelligent code navigation and dependency analysis
 */

const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');
const ts = require('typescript');

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || 'D:\\clientforge-crm';

class ClientForgeCodebase {
  constructor() {
    this.index = new Map();
    this.dependencyGraph = new Map();
    this.reverseIndex = new Map();
  }

  async buildIndex() {
    const patterns = [
      'backend/**/*.ts',
      'frontend/src/**/*.{ts,tsx}',
      'tests/**/*.test.ts'
    ];

    for (const pattern of patterns) {
      const files = await glob(path.join(WORKSPACE_ROOT, pattern), {
        ignore: ['**/node_modules/**', '**/dist/**']
      });

      for (const file of files) {
        await this.indexFile(file);
      }
    }

    return {
      success: true,
      filesIndexed: this.index.size
    };
  }

  async indexFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      const relativePath = path.relative(WORKSPACE_ROOT, filePath);
      const symbols = [];
      const imports = [];
      const exports = [];

      const visit = (node) => {
        // Track class definitions
        if (ts.isClassDeclaration(node) && node.name) {
          symbols.push({
            type: 'class',
            name: node.name.text,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
          });
        }

        // Track function definitions
        if (ts.isFunctionDeclaration(node) && node.name) {
          symbols.push({
            type: 'function',
            name: node.name.text,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
          });
        }

        // Track interface definitions
        if (ts.isInterfaceDeclaration(node)) {
          symbols.push({
            type: 'interface',
            name: node.name.text,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
          });
        }

        // Track imports
        if (ts.isImportDeclaration(node)) {
          const moduleSpecifier = node.moduleSpecifier;
          if (ts.isStringLiteral(moduleSpecifier)) {
            imports.push({
              module: moduleSpecifier.text,
              line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
            });
          }
        }

        // Track exports
        if (node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
          if (ts.isClassDeclaration(node) && node.name) {
            exports.push(node.name.text);
          } else if (ts.isFunctionDeclaration(node) && node.name) {
            exports.push(node.name.text);
          } else if (ts.isInterfaceDeclaration(node)) {
            exports.push(node.name.text);
          }
        }

        ts.forEachChild(node, visit);
      };

      visit(sourceFile);

      this.index.set(relativePath, {
        path: relativePath,
        symbols,
        imports,
        exports
      });

      // Build reverse index for "find references"
      for (const symbol of symbols) {
        if (!this.reverseIndex.has(symbol.name)) {
          this.reverseIndex.set(symbol.name, []);
        }
        this.reverseIndex.get(symbol.name).push({
          file: relativePath,
          line: symbol.line,
          type: symbol.type
        });
      }

    } catch (error) {
      // Skip files that can't be parsed
    }
  }

  async findDefinition(symbol) {
    const results = this.reverseIndex.get(symbol) || [];
    return {
      success: true,
      symbol,
      definitions: results
    };
  }

  async findReferences(symbol) {
    const references = [];

    for (const [filePath, data] of this.index.entries()) {
      try {
        const fullPath = path.join(WORKSPACE_ROOT, filePath);
        const content = await fs.readFile(fullPath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          if (line.includes(symbol)) {
            references.push({
              file: filePath,
              line: index + 1,
              text: line.trim()
            });
          }
        });
      } catch {
        // Skip files that can't be read
      }
    }

    return {
      success: true,
      symbol,
      count: references.length,
      references: references.slice(0, 50) // Limit to 50
    };
  }

  async findImplementations(interfaceName) {
    const implementations = [];

    for (const [filePath, data] of this.index.entries()) {
      try {
        const fullPath = path.join(WORKSPACE_ROOT, filePath);
        const content = await fs.readFile(fullPath, 'utf8');

        // Simple regex to find "implements InterfaceName"
        const regex = new RegExp(`class\\s+(\\w+).*implements.*${interfaceName}`, 'g');
        const matches = [...content.matchAll(regex)];

        for (const match of matches) {
          const lines = content.substring(0, match.index).split('\n');
          implementations.push({
            file: filePath,
            class: match[1],
            line: lines.length
          });
        }
      } catch {
        // Skip files that can't be read
      }
    }

    return {
      success: true,
      interface: interfaceName,
      count: implementations.length,
      implementations
    };
  }

  async dependencyGraph(filePath) {
    const data = this.index.get(filePath);
    if (!data) {
      return {
        success: false,
        error: 'File not indexed'
      };
    }

    const dependencies = data.imports.map(imp => imp.module);
    const dependents = [];

    // Find files that import this file
    for (const [otherFile, otherData] of this.index.entries()) {
      const relativeImport = './' + path.relative(
        path.dirname(otherFile),
        filePath
      ).replace(/\\/g, '/').replace(/\.tsx?$/, '');

      if (otherData.imports.some(imp =>
        imp.module === relativeImport ||
        imp.module === filePath.replace(/\.tsx?$/, '')
      )) {
        dependents.push(otherFile);
      }
    }

    return {
      success: true,
      file: filePath,
      dependencies,
      dependents,
      exports: data.exports
    };
  }

  async importChain(filePath, maxDepth = 3) {
    const visited = new Set();
    const buildChain = async (file, depth) => {
      if (depth >= maxDepth || visited.has(file)) {
        return null;
      }

      visited.add(file);
      const data = this.index.get(file);
      if (!data) return null;

      const children = [];
      for (const imp of data.imports) {
        const resolvedPath = this.resolveImport(file, imp.module);
        const childChain = await buildChain(resolvedPath, depth + 1);
        if (childChain) {
          children.push(childChain);
        }
      }

      return {
        file,
        imports: data.imports.map(imp => imp.module),
        children
      };
    };

    const chain = await buildChain(filePath, 0);

    return {
      success: true,
      file: filePath,
      maxDepth,
      chain
    };
  }

  async breakingChangeAnalysis(filePath) {
    const data = this.index.get(filePath);
    if (!data) {
      return {
        success: false,
        error: 'File not indexed'
      };
    }

    // Find all files that depend on this file
    const affectedFiles = [];
    for (const [otherFile, otherData] of this.index.entries()) {
      const relativeImport = './' + path.relative(
        path.dirname(otherFile),
        filePath
      ).replace(/\\/g, '/').replace(/\.tsx?$/, '');

      if (otherData.imports.some(imp =>
        imp.module === relativeImport ||
        imp.module === filePath.replace(/\.tsx?$/, '')
      )) {
        affectedFiles.push({
          file: otherFile,
          importsFrom: filePath
        });
      }
    }

    const riskLevel =
      affectedFiles.length > 10 ? 'HIGH' :
      affectedFiles.length > 5 ? 'MEDIUM' :
      'LOW';

    return {
      success: true,
      file: filePath,
      exports: data.exports,
      affectedFiles,
      affectedCount: affectedFiles.length,
      riskLevel
    };
  }

  async typeHierarchy(className) {
    const hierarchy = {
      class: className,
      extends: null,
      implements: [],
      extendedBy: []
    };

    for (const [filePath, data] of this.index.entries()) {
      try {
        const fullPath = path.join(WORKSPACE_ROOT, filePath);
        const content = await fs.readFile(fullPath, 'utf8');

        // Find class definition
        const classRegex = new RegExp(
          `class\\s+${className}(?:\\s+extends\\s+(\\w+))?(?:\\s+implements\\s+([\\w,\\s]+))?`,
          'g'
        );
        const match = classRegex.exec(content);

        if (match) {
          if (match[1]) {
            hierarchy.extends = match[1];
          }
          if (match[2]) {
            hierarchy.implements = match[2].split(',').map(s => s.trim());
          }
        }

        // Find classes that extend this class
        const extendsRegex = new RegExp(`class\\s+(\\w+)\\s+extends\\s+${className}`, 'g');
        const extendMatches = [...content.matchAll(extendsRegex)];
        for (const m of extendMatches) {
          hierarchy.extendedBy.push(m[1]);
        }
      } catch {
        // Skip files that can't be read
      }
    }

    return {
      success: true,
      hierarchy
    };
  }

  async moduleStructure(modulePath) {
    const moduleFiles = [];

    for (const [filePath] of this.index.entries()) {
      if (filePath.startsWith(modulePath)) {
        const data = this.index.get(filePath);
        moduleFiles.push({
          file: filePath,
          symbolCount: data.symbols.length,
          imports: data.imports.length,
          exports: data.exports.length
        });
      }
    }

    return {
      success: true,
      module: modulePath,
      fileCount: moduleFiles.length,
      files: moduleFiles
    };
  }

  resolveImport(fromFile, importPath) {
    if (importPath.startsWith('.')) {
      const fromDir = path.dirname(fromFile);
      const resolved = path.join(fromDir, importPath);
      return resolved.replace(/\\/g, '/');
    }
    return importPath;
  }
}

// MCP Server Interface
const server = new ClientForgeCodebase();
console.error('[ClientForge Codebase MCP] Building index...');
server.buildIndex().then(result => {
  console.error('[ClientForge Codebase MCP] Index built:', result);
});

process.stdin.on('data', async (data) => {
  try {
    const request = JSON.parse(data.toString());
    let response;

    switch (request.method) {
      case 'find_definition':
        response = await server.findDefinition(request.params.symbol);
        break;
      case 'find_references':
        response = await server.findReferences(request.params.symbol);
        break;
      case 'find_implementations':
        response = await server.findImplementations(request.params.interface);
        break;
      case 'dependency_graph':
        response = await server.dependencyGraph(request.params.file);
        break;
      case 'import_chain':
        response = await server.importChain(
          request.params.file,
          request.params.maxDepth
        );
        break;
      case 'breaking_change_analysis':
        response = await server.breakingChangeAnalysis(request.params.file);
        break;
      case 'type_hierarchy':
        response = await server.typeHierarchy(request.params.class);
        break;
      case 'module_structure':
        response = await server.moduleStructure(request.params.module);
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
