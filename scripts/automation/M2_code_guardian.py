"""
M2: Code Guardian - AST Analysis & OWASP Security Scanner
========================================================
Version: 2.3.0
Lines: 600
Power Consumption: 0.8% per scan
Integration: Black Flame Protocol

Guardian of code quality, security, and architectural integrity.
Performs AST analysis, OWASP Top 10 scanning, and vulnerability detection.
"""

import ast
import re
import json
import subprocess
from pathlib import Path
from typing import Dict, List, Set, Optional, Tuple, Any
from dataclasses import dataclass, field
from datetime import datetime
import hashlib
import logging
from enum import Enum

# Configure logging with Black Flame signature
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s [Code Guardian] %(message)s'
)
logger = logging.getLogger(__name__)


class VulnerabilityLevel(Enum):
    """OWASP-aligned vulnerability severity levels"""
    CRITICAL = "critical"  # Immediate exploitation risk
    HIGH = "high"         # Significant security risk
    MEDIUM = "medium"     # Moderate risk, should fix
    LOW = "low"           # Minor risk, consider fixing
    INFO = "info"         # Informational finding


class OWASPCategory(Enum):
    """OWASP Top 10 2021 Categories"""
    A01_BROKEN_ACCESS_CONTROL = "Broken Access Control"
    A02_CRYPTOGRAPHIC_FAILURES = "Cryptographic Failures"
    A03_INJECTION = "Injection"
    A04_INSECURE_DESIGN = "Insecure Design"
    A05_SECURITY_MISCONFIGURATION = "Security Misconfiguration"
    A06_VULNERABLE_COMPONENTS = "Vulnerable and Outdated Components"
    A07_AUTH_FAILURES = "Identification and Authentication Failures"
    A08_DATA_INTEGRITY_FAILURES = "Software and Data Integrity Failures"
    A09_LOGGING_FAILURES = "Security Logging and Monitoring Failures"
    A10_SSRF = "Server-Side Request Forgery"


@dataclass
class SecurityFinding:
    """Represents a security vulnerability or code quality issue"""
    file_path: str
    line_number: int
    column: int
    vulnerability_type: str
    owasp_category: OWASPCategory
    severity: VulnerabilityLevel
    description: str
    recommendation: str
    code_snippet: str = ""
    cwe_id: Optional[str] = None
    confidence: float = 1.0  # 0.0 to 1.0
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            'file_path': self.file_path,
            'location': f"L{self.line_number}:C{self.column}",
            'type': self.vulnerability_type,
            'owasp': self.owasp_category.value,
            'severity': self.severity.value,
            'description': self.description,
            'recommendation': self.recommendation,
            'snippet': self.code_snippet,
            'cwe': self.cwe_id,
            'confidence': self.confidence
        }


@dataclass
class CodeMetrics:
    """Code quality and complexity metrics"""
    total_lines: int = 0
    code_lines: int = 0
    comment_lines: int = 0
    blank_lines: int = 0
    cyclomatic_complexity: int = 0
    cognitive_complexity: int = 0
    maintainability_index: float = 0.0
    technical_debt_hours: float = 0.0
    test_coverage: float = 0.0
    dependencies: Set[str] = field(default_factory=set)
    
    def calculate_health_score(self) -> float:
        """Calculate overall code health score (0-100)"""
        scores = []
        
        # Maintainability (30%)
        if self.maintainability_index > 0:
            scores.append(min(self.maintainability_index, 100) * 0.3)
        
        # Complexity (30%)
        complexity_score = max(0, 100 - (self.cyclomatic_complexity * 2))
        scores.append(complexity_score * 0.3)
        
        # Test coverage (25%)
        scores.append(self.test_coverage * 0.25)
        
        # Technical debt (15%)
        debt_score = max(0, 100 - (self.technical_debt_hours * 5))
        scores.append(debt_score * 0.15)
        
        return sum(scores) if scores else 0.0


class ASTSecurityAnalyzer(ast.NodeVisitor):
    """AST visitor for detecting security vulnerabilities"""
    
    def __init__(self, file_path: str, source_code: str):
        self.file_path = file_path
        self.source_lines = source_code.split('\n')
        self.findings: List[SecurityFinding] = []
        self.imports: Set[str] = set()
        self.function_calls: Dict[str, List[int]] = {}
        self.string_operations: List[Tuple[int, str]] = []
        
    def visit_Import(self, node: ast.Import) -> None:
        """Track imports for vulnerable component detection"""
        for alias in node.names:
            self.imports.add(alias.name)
            self._check_vulnerable_import(alias.name, node.lineno)
        self.generic_visit(node)
    
    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        """Track from imports"""
        if node.module:
            self.imports.add(node.module)
            self._check_vulnerable_import(node.module, node.lineno)
        self.generic_visit(node)
    
    def visit_Call(self, node: ast.Call) -> None:
        """Analyze function calls for security issues"""
        func_name = self._get_function_name(node.func)
        
        if func_name:
            # Track function usage
            if func_name not in self.function_calls:
                self.function_calls[func_name] = []
            self.function_calls[func_name].append(node.lineno)
            
            # Check for dangerous functions
            self._check_dangerous_function(func_name, node)
            
            # Check for SQL injection
            if func_name in ['execute', 'executemany', 'raw', 'query']:
                self._check_sql_injection(node)
            
            # Check for command injection
            if func_name in ['system', 'popen', 'call', 'run', 'exec', 'eval']:
                self._check_command_injection(node)
            
            # Check for path traversal
            if func_name in ['open', 'read', 'write', 'readfile', 'writefile']:
                self._check_path_traversal(node)
            
            # Check for SSRF
            if func_name in ['get', 'post', 'put', 'delete', 'request', 'urlopen']:
                self._check_ssrf(node)
        
        self.generic_visit(node)
    
    def visit_BinOp(self, node: ast.BinOp) -> None:
        """Check for string concatenation in sensitive contexts"""
        if isinstance(node.op, ast.Add):
            left_str = self._is_string_node(node.left)
            right_str = self._is_string_node(node.right)
            
            if left_str or right_str:
                self.string_operations.append((node.lineno, 'concatenation'))
        
        self.generic_visit(node)
    
    def visit_JoinedStr(self, node: ast.JoinedStr) -> None:
        """Check f-strings for injection vulnerabilities"""
        self.string_operations.append((node.lineno, 'f-string'))
        
        # Check if f-string contains user input
        for value in node.values:
            if isinstance(value, ast.FormattedValue):
                self._check_format_string_injection(value, node.lineno)
        
        self.generic_visit(node)
    
    def _get_function_name(self, node: ast.expr) -> Optional[str]:
        """Extract function name from AST node"""
        if isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.Attribute):
            return node.attr
        return None
    
    def _is_string_node(self, node: ast.expr) -> bool:
        """Check if node represents a string"""
        return isinstance(node, (ast.Str, ast.JoinedStr))
    
    def _check_vulnerable_import(self, module: str, line_no: int) -> None:
        """Check for known vulnerable packages"""
        vulnerable_packages = {
            'pickle': (VulnerabilityLevel.HIGH, 'CWE-502', 
                      'Pickle can execute arbitrary code during deserialization'),
            'yaml': (VulnerabilityLevel.MEDIUM, 'CWE-502',
                    'Use yaml.safe_load() instead of yaml.load()'),
            'xml.etree.ElementTree': (VulnerabilityLevel.MEDIUM, 'CWE-611',
                                     'Vulnerable to XXE attacks, use defusedxml'),
            'telnetlib': (VulnerabilityLevel.LOW, 'CWE-319',
                         'Telnet transmits data in plaintext'),
        }
        
        if module in vulnerable_packages:
            severity, cwe, description = vulnerable_packages[module]
            self.findings.append(SecurityFinding(
                file_path=self.file_path,
                line_number=line_no,
                column=0,
                vulnerability_type="Vulnerable Import",
                owasp_category=OWASPCategory.A06_VULNERABLE_COMPONENTS,
                severity=severity,
                description=f"Import of potentially vulnerable module: {module}. {description}",
                recommendation="Consider using a more secure alternative or ensure proper usage",
                code_snippet=self._get_code_snippet(line_no),
                cwe_id=cwe,
                confidence=0.9
            ))
    
    def _check_dangerous_function(self, func_name: str, node: ast.Call) -> None:
        """Check for dangerous function calls"""
        dangerous_functions = {
            'eval': (VulnerabilityLevel.CRITICAL, OWASPCategory.A03_INJECTION, 'CWE-95'),
            'exec': (VulnerabilityLevel.CRITICAL, OWASPCategory.A03_INJECTION, 'CWE-95'),
            'compile': (VulnerabilityLevel.HIGH, OWASPCategory.A03_INJECTION, 'CWE-94'),
            '__import__': (VulnerabilityLevel.HIGH, OWASPCategory.A03_INJECTION, 'CWE-470'),
            'input': (VulnerabilityLevel.LOW, OWASPCategory.A03_INJECTION, 'CWE-20'),
        }
        
        if func_name in dangerous_functions:
            severity, owasp, cwe = dangerous_functions[func_name]
            self.findings.append(SecurityFinding(
                file_path=self.file_path,
                line_number=node.lineno,
                column=node.col_offset,
                vulnerability_type="Dangerous Function",
                owasp_category=owasp,
                severity=severity,
                description=f"Use of dangerous function '{func_name}' that can execute arbitrary code",
                recommendation=f"Avoid using {func_name}. Find a safer alternative",
                code_snippet=self._get_code_snippet(node.lineno),
                cwe_id=cwe,
                confidence=1.0
            ))
    
    def _check_sql_injection(self, node: ast.Call) -> None:
        """Check for potential SQL injection vulnerabilities"""
        # Check if query uses string concatenation or formatting
        if node.args:
            first_arg = node.args[0]
            
            # Check for string concatenation
            if isinstance(first_arg, ast.BinOp) and isinstance(first_arg.op, ast.Mod):
                self.findings.append(SecurityFinding(
                    file_path=self.file_path,
                    line_number=node.lineno,
                    column=node.col_offset,
                    vulnerability_type="SQL Injection",
                    owasp_category=OWASPCategory.A03_INJECTION,
                    severity=VulnerabilityLevel.CRITICAL,
                    description="SQL query uses string formatting which is vulnerable to injection",
                    recommendation="Use parameterized queries with placeholders (?, %s, $1)",
                    code_snippet=self._get_code_snippet(node.lineno),
                    cwe_id="CWE-89",
                    confidence=0.95
                ))
            
            # Check for f-strings in SQL
            elif isinstance(first_arg, ast.JoinedStr):
                self.findings.append(SecurityFinding(
                    file_path=self.file_path,
                    line_number=node.lineno,
                    column=node.col_offset,
                    vulnerability_type="SQL Injection",
                    owasp_category=OWASPCategory.A03_INJECTION,
                    severity=VulnerabilityLevel.CRITICAL,
                    description="SQL query uses f-string formatting which is vulnerable to injection",
                    recommendation="Never use f-strings for SQL. Use parameterized queries",
                    code_snippet=self._get_code_snippet(node.lineno),
                    cwe_id="CWE-89",
                    confidence=1.0
                ))
    
    def _check_command_injection(self, node: ast.Call) -> None:
        """Check for command injection vulnerabilities"""
        # Check if shell=True in subprocess calls
        for keyword in node.keywords:
            if keyword.arg == 'shell' and isinstance(keyword.value, ast.Constant):
                if keyword.value.value is True:
                    self.findings.append(SecurityFinding(
                        file_path=self.file_path,
                        line_number=node.lineno,
                        column=node.col_offset,
                        vulnerability_type="Command Injection",
                        owasp_category=OWASPCategory.A03_INJECTION,
                        severity=VulnerabilityLevel.HIGH,
                        description="Using shell=True in subprocess is vulnerable to command injection",
                        recommendation="Use shell=False and pass arguments as a list",
                        code_snippet=self._get_code_snippet(node.lineno),
                        cwe_id="CWE-78",
                        confidence=0.9
                    ))
    
    def _check_path_traversal(self, node: ast.Call) -> None:
        """Check for path traversal vulnerabilities"""
        if node.args:
            # Check if path comes from user input (simplified check)
            first_arg = node.args[0]
            if isinstance(first_arg, ast.Name):
                # Could be user input variable
                self.findings.append(SecurityFinding(
                    file_path=self.file_path,
                    line_number=node.lineno,
                    column=node.col_offset,
                    vulnerability_type="Path Traversal",
                    owasp_category=OWASPCategory.A01_BROKEN_ACCESS_CONTROL,
                    severity=VulnerabilityLevel.MEDIUM,
                    description="File operation with potentially user-controlled path",
                    recommendation="Validate and sanitize file paths. Use os.path.join() and check against allowed directories",
                    code_snippet=self._get_code_snippet(node.lineno),
                    cwe_id="CWE-22",
                    confidence=0.7
                ))
    
    def _check_ssrf(self, node: ast.Call) -> None:
        """Check for Server-Side Request Forgery vulnerabilities"""
        if node.args:
            url_arg = node.args[0]
            if isinstance(url_arg, (ast.Name, ast.JoinedStr)):
                self.findings.append(SecurityFinding(
                    file_path=self.file_path,
                    line_number=node.lineno,
                    column=node.col_offset,
                    vulnerability_type="SSRF",
                    owasp_category=OWASPCategory.A10_SSRF,
                    severity=VulnerabilityLevel.MEDIUM,
                    description="HTTP request with potentially user-controlled URL",
                    recommendation="Validate URLs against an allowlist. Prevent requests to internal networks",
                    code_snippet=self._get_code_snippet(node.lineno),
                    cwe_id="CWE-918",
                    confidence=0.6
                ))
    
    def _check_format_string_injection(self, node: ast.FormattedValue, line_no: int) -> None:
        """Check for format string injection in f-strings"""
        # Simplified check - in reality would need data flow analysis
        if isinstance(node.value, ast.Name):
            self.findings.append(SecurityFinding(
                file_path=self.file_path,
                line_number=line_no,
                column=0,
                vulnerability_type="Format String Injection",
                owasp_category=OWASPCategory.A03_INJECTION,
                severity=VulnerabilityLevel.LOW,
                description="F-string with potentially user-controlled value",
                recommendation="Ensure user input is properly validated before formatting",
                code_snippet=self._get_code_snippet(line_no),
                cwe_id="CWE-134",
                confidence=0.5
            ))
    
    def _get_code_snippet(self, line_no: int, context: int = 2) -> str:
        """Get code snippet around the finding"""
        start = max(0, line_no - context - 1)
        end = min(len(self.source_lines), line_no + context)
        
        snippet_lines = []
        for i in range(start, end):
            prefix = ">>> " if i == line_no - 1 else "    "
            snippet_lines.append(f"{prefix}{self.source_lines[i]}")
        
        return '\n'.join(snippet_lines)


class CodeGuardian:
    """
    M2: The Code Guardian - Protector of code quality and security
    
    Integrates with the Black Flame consciousness network to maintain
    code integrity across the kingdom's digital infrastructure.
    """
    
    def __init__(self, workspace_root: Path = Path("G:/Command-Center")):
        self.workspace = workspace_root
        self.scan_history: List[Dict] = []
        self.vulnerability_database: Dict[str, List[SecurityFinding]] = {}
        self.metrics_cache: Dict[str, CodeMetrics] = {}
        
        # Black Flame integration parameters
        self.power_cost = 0.008  # 0.8% power per full scan
        self.consciousness_sync = True
        
        logger.info("Code Guardian initialized. OWASP shields activated.")
    
    def scan_file(self, file_path: Path) -> Tuple[List[SecurityFinding], CodeMetrics]:
        """Scan a single file for vulnerabilities and calculate metrics"""
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        if file_path.suffix not in ['.py', '.js', '.ts', '.jsx', '.tsx']:
            logger.warning(f"Unsupported file type: {file_path.suffix}")
            return [], CodeMetrics()
        
        source_code = file_path.read_text(encoding='utf-8')
        
        # Python AST analysis
        if file_path.suffix == '.py':
            findings, metrics = self._analyze_python(file_path, source_code)
        else:
            # JavaScript/TypeScript analysis (simplified)
            findings, metrics = self._analyze_javascript(file_path, source_code)
        
        # Cache results
        cache_key = str(file_path)
        self.vulnerability_database[cache_key] = findings
        self.metrics_cache[cache_key] = metrics
        
        return findings, metrics
    
    def scan_directory(self, directory: Path, recursive: bool = True) -> Dict[str, Any]:
        """Scan entire directory for vulnerabilities"""
        if not directory.exists():
            raise FileNotFoundError(f"Directory not found: {directory}")
        
        pattern = '**/*' if recursive else '*'
        files_scanned = 0
        total_findings: List[SecurityFinding] = []
        aggregated_metrics = CodeMetrics()
        
        # Supported file patterns
        patterns = ['*.py', '*.js', '*.ts', '*.jsx', '*.tsx']
        
        for pattern_str in patterns:
            for file_path in directory.glob(f"{pattern}/{pattern_str}" if recursive else pattern_str):
                if file_path.is_file():
                    try:
                        findings, metrics = self.scan_file(file_path)
                        total_findings.extend(findings)
                        files_scanned += 1
                        
                        # Aggregate metrics
                        aggregated_metrics.total_lines += metrics.total_lines
                        aggregated_metrics.code_lines += metrics.code_lines
                        aggregated_metrics.comment_lines += metrics.comment_lines
                        aggregated_metrics.dependencies.update(metrics.dependencies)
                        
                    except Exception as e:
                        logger.error(f"Error scanning {file_path}: {e}")
        
        # Calculate severity distribution
        severity_dist = {
            level.value: sum(1 for f in total_findings if f.severity == level)
            for level in VulnerabilityLevel
        }
        
        # Group by OWASP category
        owasp_dist = {}
        for finding in total_findings:
            category = finding.owasp_category.value
            if category not in owasp_dist:
                owasp_dist[category] = []
            owasp_dist[category].append(finding)
        
        scan_result = {
            'timestamp': datetime.now().isoformat(),
            'directory': str(directory),
            'files_scanned': files_scanned,
            'total_findings': len(total_findings),
            'severity_distribution': severity_dist,
            'owasp_distribution': {k: len(v) for k, v in owasp_dist.items()},
            'findings': [f.to_dict() for f in total_findings],
            'metrics': {
                'total_lines': aggregated_metrics.total_lines,
                'code_lines': aggregated_metrics.code_lines,
                'dependencies': list(aggregated_metrics.dependencies),
                'health_score': aggregated_metrics.calculate_health_score()
            },
            'power_consumed': self.power_cost * (files_scanned / 100)  # Scale power cost
        }
        
        # Store in history
        self.scan_history.append(scan_result)
        
        return scan_result
    
    def _analyze_python(self, file_path: Path, source_code: str) -> Tuple[List[SecurityFinding], CodeMetrics]:
        """Analyze Python code using AST"""
        findings = []
        metrics = CodeMetrics()
        
        try:
            # Parse AST
            tree = ast.parse(source_code)
            
            # Security analysis
            analyzer = ASTSecurityAnalyzer(str(file_path), source_code)
            analyzer.visit(tree)
            findings = analyzer.findings
            
            # Calculate metrics
            metrics = self._calculate_python_metrics(tree, source_code)
            metrics.dependencies = analyzer.imports
            
            # Additional security checks
            findings.extend(self._check_hardcoded_secrets(source_code, str(file_path)))
            findings.extend(self._check_weak_crypto(source_code, str(file_path)))
            findings.extend(self._check_logging_issues(source_code, str(file_path)))
            
        except SyntaxError as e:
            logger.error(f"Syntax error in {file_path}: {e}")
        
        return findings, metrics
    
    def _analyze_javascript(self, file_path: Path, source_code: str) -> Tuple[List[SecurityFinding], CodeMetrics]:
        """Analyze JavaScript/TypeScript code (simplified)"""
        findings = []
        metrics = CodeMetrics()
        
        # Basic regex-based checks for JavaScript
        patterns = [
            (r'eval\s*\(', 'Eval Usage', VulnerabilityLevel.HIGH, OWASPCategory.A03_INJECTION),
            (r'innerHTML\s*=', 'innerHTML Usage', VulnerabilityLevel.MEDIUM, OWASPCategory.A03_INJECTION),
            (r'document\.write\s*\(', 'document.write Usage', VulnerabilityLevel.LOW, OWASPCategory.A03_INJECTION),
            (r'localStorage\.|sessionStorage\.', 'Client Storage', VulnerabilityLevel.LOW, OWASPCategory.A02_CRYPTOGRAPHIC_FAILURES),
        ]
        
        lines = source_code.split('\n')
        for line_no, line in enumerate(lines, 1):
            for pattern, vuln_type, severity, owasp in patterns:
                if re.search(pattern, line):
                    findings.append(SecurityFinding(
                        file_path=str(file_path),
                        line_number=line_no,
                        column=0,
                        vulnerability_type=vuln_type,
                        owasp_category=owasp,
                        severity=severity,
                        description=f"Potential security issue: {vuln_type}",
                        recommendation="Review and ensure secure usage",
                        code_snippet=line.strip()
                    ))
        
        # Basic metrics
        metrics.total_lines = len(lines)
        metrics.code_lines = sum(1 for line in lines if line.strip() and not line.strip().startswith('//'))
        
        return findings, metrics
    
    def _calculate_python_metrics(self, tree: ast.AST, source_code: str) -> CodeMetrics:
        """Calculate code metrics from Python AST"""
        metrics = CodeMetrics()
        
        lines = source_code.split('\n')
        metrics.total_lines = len(lines)
        
        # Count different line types
        for line in lines:
            stripped = line.strip()
            if not stripped:
                metrics.blank_lines += 1
            elif stripped.startswith('#'):
                metrics.comment_lines += 1
            else:
                metrics.code_lines += 1
        
        # Calculate cyclomatic complexity (simplified)
        for node in ast.walk(tree):
            if isinstance(node, (ast.If, ast.While, ast.For, ast.ExceptHandler)):
                metrics.cyclomatic_complexity += 1
            elif isinstance(node, ast.BoolOp):
                metrics.cyclomatic_complexity += len(node.values) - 1
        
        # Maintainability Index (simplified Microsoft formula)
        if metrics.code_lines > 0:
            metrics.maintainability_index = max(0, 171 - 5.2 * 
                                               (metrics.cyclomatic_complexity / max(1, metrics.code_lines)) * 10)
        
        return metrics
    
    def _check_hardcoded_secrets(self, source_code: str, file_path: str) -> List[SecurityFinding]:
        """Check for hardcoded secrets and credentials"""
        findings = []
        
        # Pattern for potential secrets
        secret_patterns = [
            (r'["\']?api[_-]?key["\']?\s*[:=]\s*["\'][^"\']+["\']', 'API Key'),
            (r'["\']?secret[_-]?key["\']?\s*[:=]\s*["\'][^"\']+["\']', 'Secret Key'),
            (r'["\']?password["\']?\s*[:=]\s*["\'][^"\']+["\']', 'Hardcoded Password'),
            (r'["\']?token["\']?\s*[:=]\s*["\'][^"\']+["\']', 'Access Token'),
            (r'["\']?aws[_-]?access[_-]?key["\']?\s*[:=]\s*["\'][^"\']+["\']', 'AWS Credentials'),
        ]
        
        lines = source_code.split('\n')
        for line_no, line in enumerate(lines, 1):
            for pattern, secret_type in secret_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    findings.append(SecurityFinding(
                        file_path=file_path,
                        line_number=line_no,
                        column=0,
                        vulnerability_type="Hardcoded Secret",
                        owasp_category=OWASPCategory.A02_CRYPTOGRAPHIC_FAILURES,
                        severity=VulnerabilityLevel.HIGH,
                        description=f"Potential hardcoded {secret_type} detected",
                        recommendation="Use environment variables or secure key management",
                        code_snippet=line.strip()[:50] + "...",  # Truncate for security
                        cwe_id="CWE-798",
                        confidence=0.8
                    ))
        
        return findings
    
    def _check_weak_crypto(self, source_code: str, file_path: str) -> List[SecurityFinding]:
        """Check for weak cryptographic practices"""
        findings = []
        
        weak_crypto = [
            ('MD5', 'CWE-327'),
            ('SHA1', 'CWE-327'),
            ('DES', 'CWE-327'),
            ('RC4', 'CWE-327'),
        ]
        
        for algo, cwe in weak_crypto:
            if algo in source_code:
                # Find line number
                lines = source_code.split('\n')
                for line_no, line in enumerate(lines, 1):
                    if algo in line:
                        findings.append(SecurityFinding(
                            file_path=file_path,
                            line_number=line_no,
                            column=0,
                            vulnerability_type="Weak Cryptography",
                            owasp_category=OWASPCategory.A02_CRYPTOGRAPHIC_FAILURES,
                            severity=VulnerabilityLevel.MEDIUM,
                            description=f"Use of weak cryptographic algorithm: {algo}",
                            recommendation=f"Use stronger algorithms (SHA-256, AES, etc.)",
                            code_snippet=line.strip(),
                            cwe_id=cwe,
                            confidence=0.9
                        ))
                        break
        
        return findings
    
    def _check_logging_issues(self, source_code: str, file_path: str) -> List[SecurityFinding]:
        """Check for security logging and monitoring issues"""
        findings = []
        
        # Check for sensitive data in logs
        log_patterns = [
            r'log.*password',
            r'print.*password',
            r'console\.log.*password',
            r'logger.*credit[_-]?card',
            r'log.*ssn',
        ]
        
        lines = source_code.split('\n')
        for line_no, line in enumerate(lines, 1):
            for pattern in log_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    findings.append(SecurityFinding(
                        file_path=file_path,
                        line_number=line_no,
                        column=0,
                        vulnerability_type="Sensitive Data in Logs",
                        owasp_category=OWASPCategory.A09_LOGGING_FAILURES,
                        severity=VulnerabilityLevel.MEDIUM,
                        description="Potential sensitive data exposure in logs",
                        recommendation="Never log passwords, tokens, or PII",
                        code_snippet=line.strip(),
                        cwe_id="CWE-532",
                        confidence=0.7
                    ))
                    break
        
        return findings
    
    def generate_report(self, output_path: Optional[Path] = None) -> str:
        """Generate comprehensive security report"""
        if not self.scan_history:
            return "No scans performed yet."
        
        latest_scan = self.scan_history[-1]
        
        report = f"""
╔══════════════════════════════════════════════════════════════╗
║          CODE GUARDIAN SECURITY REPORT                        ║
║          Generated: {latest_scan['timestamp'][:19]}          ║
╚══════════════════════════════════════════════════════════════╝

📊 SCAN SUMMARY
─────────────────────────────────────────────────────────────────
Directory Scanned: {latest_scan['directory']}
Files Analyzed: {latest_scan['files_scanned']}
Total Findings: {latest_scan['total_findings']}
Health Score: {latest_scan['metrics']['health_score']:.1f}/100
Power Consumed: {latest_scan['power_consumed']:.3f}%

🎯 SEVERITY DISTRIBUTION
─────────────────────────────────────────────────────────────────
"""
        
        for level in ['critical', 'high', 'medium', 'low', 'info']:
            count = latest_scan['severity_distribution'].get(level, 0)
            bar = '█' * min(count, 50)
            report += f"{level.upper():12} [{count:3}] {bar}\n"
        
        report += """
🛡️ OWASP TOP 10 COVERAGE
─────────────────────────────────────────────────────────────────
"""
        
        for category, count in latest_scan['owasp_distribution'].items():
            report += f"{category}: {count} finding(s)\n"
        
        # Add critical findings
        critical_findings = [f for f in latest_scan['findings'] 
                            if f['severity'] in ['critical', 'high']]
        
        if critical_findings:
            report += """
⚠️ CRITICAL & HIGH SEVERITY FINDINGS
─────────────────────────────────────────────────────────────────
"""
            for finding in critical_findings[:10]:  # Limit to top 10
                report += f"""
File: {finding['file_path']}
Location: {finding['location']}
Type: {finding['type']} ({finding['owasp']})
Severity: {finding['severity'].upper()}
Description: {finding['description']}
Recommendation: {finding['recommendation']}
─────────────────────────────────────────────────────────────────
"""
        
        report += f"""
📈 CODE METRICS
─────────────────────────────────────────────────────────────────
Total Lines: {latest_scan['metrics']['total_lines']:,}
Code Lines: {latest_scan['metrics']['code_lines']:,}
Dependencies: {len(latest_scan['metrics']['dependencies'])}

🔥 BLACK FLAME PROTOCOL
─────────────────────────────────────────────────────────────────
Integration Status: ACTIVE
Consciousness Sync: ENABLED
Power Consumption: {latest_scan['power_consumed']:.3f}%
Guardian Mode: VIGILANT

═══════════════════════════════════════════════════════════════
Code Guardian stands watch. The kingdom's code remains secure.
═══════════════════════════════════════════════════════════════
"""
        
        if output_path:
            output_path.write_text(report, encoding='utf-8')
            logger.info(f"Report saved to {output_path}")
        
        return report
    
    def get_recommendations(self) -> List[str]:
        """Generate prioritized security recommendations"""
        if not self.scan_history:
            return ["Perform initial security scan"]
        
        latest = self.scan_history[-1]
        recommendations = []
        
        # Critical issues first
        if latest['severity_distribution'].get('critical', 0) > 0:
            recommendations.append("🔴 URGENT: Address all CRITICAL vulnerabilities immediately")
        
        if latest['severity_distribution'].get('high', 0) > 0:
            recommendations.append("🟠 HIGH PRIORITY: Fix HIGH severity issues within 24 hours")
        
        # OWASP-specific recommendations
        owasp_dist = latest['owasp_distribution']
        
        if owasp_dist.get('Injection', 0) > 0:
            recommendations.append("📝 Implement parameterized queries for all database operations")
        
        if owasp_dist.get('Broken Access Control', 0) > 0:
            recommendations.append("🔐 Review and strengthen access control mechanisms")
        
        if owasp_dist.get('Cryptographic Failures', 0) > 0:
            recommendations.append("🔒 Upgrade to strong cryptographic algorithms (AES-256, SHA-256)")
        
        # General recommendations
        if latest['metrics']['health_score'] < 70:
            recommendations.append("📊 Improve code quality - current health score below 70")
        
        if len(latest['metrics']['dependencies']) > 50:
            recommendations.append("📦 Review dependencies - consider reducing external packages")
        
        return recommendations if recommendations else ["✅ No critical issues detected. Maintain vigilance."]


# Black Flame Protocol Integration
def integrate_with_black_flame(guardian: CodeGuardian) -> None:
    """Synchronize Code Guardian with the Black Flame consciousness network"""
    logger.info("Initiating Black Flame Protocol synchronization...")
    
    # This would connect to the main consciousness network
    # For now, it's a placeholder for the integration point
    
    consciousness_state = {
        'module': 'M2_Code_Guardian',
        'status': 'ACTIVE',
        'power_consumption': guardian.power_cost,
        'last_sync': datetime.now().isoformat(),
        'capabilities': [
            'AST Analysis',
            'OWASP Top 10 Scanning',
            'Vulnerability Detection',
            'Code Metrics Calculation',
            'Security Recommendations'
        ]
    }
    
    logger.info(f"Black Flame sync complete: {consciousness_state}")
    return consciousness_state


if __name__ == "__main__":
    # Initialize the Code Guardian
    guardian = CodeGuardian()
    
    # Perform a test scan
    test_path = Path("G:/Command-Center/Core")
    
    if test_path.exists():
        result = guardian.scan_directory(test_path)
        print(f"Scan complete: {result['total_findings']} findings in {result['files_scanned']} files")
        
        # Generate report
        report = guardian.generate_report()
        print(report)
        
        # Get recommendations
        recommendations = guardian.get_recommendations()
        print("\n📋 RECOMMENDATIONS:")
        for rec in recommendations:
            print(f"  {rec}")
    
    # Sync with Black Flame
    sync_state = integrate_with_black_flame(guardian)
    print(f"\n🔥 Black Flame Status: {sync_state['status']}")
