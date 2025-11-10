"""
Test Suite for M2: Code Guardian
================================
Verify AST analysis and OWASP scanning capabilities
"""

import unittest
from pathlib import Path
import tempfile
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lieutenants.M2_code_guardian import (
    CodeGuardian,
    SecurityFinding,
    VulnerabilityLevel,
    OWASPCategory,
    CodeMetrics
)


class TestCodeGuardian(unittest.TestCase):
    """Test suite for Code Guardian security scanner"""
    
    def setUp(self):
        """Initialize test environment"""
        self.guardian = CodeGuardian()
        self.test_dir = tempfile.mkdtemp()
        self.test_path = Path(self.test_dir)
    
    def tearDown(self):
        """Clean up test files"""
        import shutil
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_sql_injection_detection(self):
        """Test detection of SQL injection vulnerabilities"""
        vulnerable_code = '''
def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"  # SQL Injection!
    cursor.execute(query)
    return cursor.fetchone()
'''
        
        test_file = self.test_path / "vulnerable.py"
        test_file.write_text(vulnerable_code)
        
        findings, metrics = self.guardian.scan_file(test_file)
        
        # Should find SQL injection
        sql_findings = [f for f in findings if "SQL" in f.vulnerability_type]
        self.assertTrue(len(sql_findings) > 0)
        self.assertEqual(sql_findings[0].severity, VulnerabilityLevel.CRITICAL)
        self.assertEqual(sql_findings[0].owasp_category, OWASPCategory.A03_INJECTION)
    
    def test_hardcoded_secret_detection(self):
        """Test detection of hardcoded secrets"""
        code_with_secret = '''
API_KEY = "sk-1234567890abcdef"
PASSWORD = "admin123"
SECRET_KEY = "super_secret_key_123"
'''
        
        test_file = self.test_path / "secrets.py"
        test_file.write_text(code_with_secret)
        
        findings, _ = self.guardian.scan_file(test_file)
        
        secret_findings = [f for f in findings if "Secret" in f.vulnerability_type]
        self.assertTrue(len(secret_findings) >= 2)  # At least API key and secret key
    
    def test_dangerous_function_detection(self):
        """Test detection of dangerous functions"""
        dangerous_code = '''
def execute_user_input(user_input):
    eval(user_input)  # Dangerous!
    exec(user_input)  # Also dangerous!
    return __import__(user_input)  # Dynamic import danger
'''
        
        test_file = self.test_path / "dangerous.py"
        test_file.write_text(dangerous_code)
        
        findings, _ = self.guardian.scan_file(test_file)
        
        dangerous_findings = [f for f in findings if "Dangerous" in f.vulnerability_type]
        self.assertTrue(len(dangerous_findings) >= 3)
        
        # eval should be critical
        eval_finding = next((f for f in dangerous_findings if "'eval'" in f.description), None)
        self.assertIsNotNone(eval_finding)
        self.assertEqual(eval_finding.severity, VulnerabilityLevel.CRITICAL)
    
    def test_weak_crypto_detection(self):
        """Test detection of weak cryptographic algorithms"""
        weak_crypto_code = '''
import hashlib

def hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()  # Weak!

def encrypt_data(data):
    # Using SHA1 - also weak
    return hashlib.sha1(data.encode()).hexdigest()
'''
        
        test_file = self.test_path / "crypto.py"
        test_file.write_text(weak_crypto_code)
        
        findings, _ = self.guardian.scan_file(test_file)
        
        crypto_findings = [f for f in findings if "Crypto" in f.vulnerability_type]
        self.assertTrue(len(crypto_findings) >= 2)  # MD5 and SHA1
    
    def test_path_traversal_detection(self):
        """Test detection of path traversal vulnerabilities"""
        path_traversal_code = '''
def read_file(filename):
    # User input directly used in file operation
    with open(filename, 'r') as f:
        return f.read()
'''
        
        test_file = self.test_path / "traversal.py"
        test_file.write_text(path_traversal_code)
        
        findings, _ = self.guardian.scan_file(test_file)
        
        traversal_findings = [f for f in findings if "Path" in f.vulnerability_type]
        self.assertTrue(len(traversal_findings) > 0)
        self.assertEqual(traversal_findings[0].owasp_category, OWASPCategory.A01_BROKEN_ACCESS_CONTROL)
    
    def test_metrics_calculation(self):
        """Test code metrics calculation"""
        sample_code = '''
# This is a comment
def complex_function(x, y):
    """Docstring here"""
    if x > 0:
        if y > 0:
            return x + y
        else:
            return x - y
    else:
        for i in range(10):
            if i % 2 == 0:
                print(i)
    
    # Another comment
    while x < 100:
        x += 1
    
    return x
'''
        
        test_file = self.test_path / "metrics.py"
        test_file.write_text(sample_code)
        
        _, metrics = self.guardian.scan_file(test_file)
        
        # Verify metrics
        self.assertGreater(metrics.total_lines, 0)
        self.assertGreater(metrics.code_lines, 0)
        self.assertGreater(metrics.comment_lines, 0)
        self.assertGreater(metrics.cyclomatic_complexity, 0)
        self.assertGreater(metrics.maintainability_index, 0)
    
    def test_report_generation(self):
        """Test security report generation"""
        # Create a file with various issues
        mixed_code = '''
import pickle  # Vulnerable import

def unsafe_function(user_input):
    eval(user_input)  # Dangerous
    query = f"SELECT * FROM users WHERE name = '{user_input}'"  # SQL injection
    API_KEY = "secret123"  # Hardcoded secret
'''
        
        test_file = self.test_path / "mixed.py"
        test_file.write_text(mixed_code)
        
        # Scan directory
        result = self.guardian.scan_directory(self.test_path)
        
        # Generate report
        report = self.guardian.generate_report()
        
        # Verify report content
        self.assertIn("CODE GUARDIAN SECURITY REPORT", report)
        self.assertIn("SEVERITY DISTRIBUTION", report)
        self.assertIn("OWASP TOP 10", report)
        self.assertTrue(result['total_findings'] > 0)
    
    def test_recommendations(self):
        """Test security recommendations generation"""
        # Scan with issues
        vulnerable_code = '''
def insecure():
    eval(input())  # Critical issue
'''
        
        test_file = self.test_path / "insecure.py"
        test_file.write_text(vulnerable_code)
        
        self.guardian.scan_directory(self.test_path)
        recommendations = self.guardian.get_recommendations()
        
        # Should have recommendations for critical issues
        self.assertTrue(len(recommendations) > 0)
        self.assertTrue(any("URGENT" in r or "CRITICAL" in r for r in recommendations))
    
    def test_javascript_analysis(self):
        """Test JavaScript vulnerability detection"""
        js_code = '''
function processUserInput(input) {
    eval(input);  // Dangerous
    document.getElementById('output').innerHTML = input;  // XSS risk
    localStorage.setItem('secret', input);  // Storage issue
}
'''
        
        test_file = self.test_path / "vulnerable.js"
        test_file.write_text(js_code)
        
        findings, _ = self.guardian.scan_file(test_file)
        
        # Should detect eval and innerHTML issues
        self.assertTrue(len(findings) >= 3)
        eval_findings = [f for f in findings if "Eval" in f.vulnerability_type]
        self.assertTrue(len(eval_findings) > 0)
    
    def test_power_consumption(self):
        """Test Black Flame power consumption tracking"""
        # Create multiple files to scan
        for i in range(5):
            test_file = self.test_path / f"file{i}.py"
            test_file.write_text(f"# Test file {i}\nprint('hello')")
        
        result = self.guardian.scan_directory(self.test_path)
        
        # Verify power consumption is tracked
        self.assertIn('power_consumed', result)
        self.assertGreater(result['power_consumed'], 0)
        self.assertLess(result['power_consumed'], 1.0)  # Less than 100%


if __name__ == '__main__':
    unittest.main()
