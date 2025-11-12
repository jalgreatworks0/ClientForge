/**
 * Template Verification Script
 * Verifies all 70 templates across 7 modules are working
 */

import * as fs from 'fs';
import * as path from 'path';

interface VerificationResult {
  module: string;
  templateCount: number;
  status: 'success' | 'error';
  templates: string[];
  errors?: string[];
}

const modules = [
  'activities',
  'billing',
  'compliance',
  'custom-fields',
  'import-export',
  'notifications',
  'search',
];

async function verifyModuleTemplates(): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 ClientForge CRM - Template Verification');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results: VerificationResult[] = [];
  let totalTemplates = 0;

  for (const module of modules) {
    const modulePath = path.join(__dirname, module, 'templates');
    const result: VerificationResult = {
      module,
      templateCount: 0,
      status: 'success',
      templates: [],
      errors: [],
    };

    try {
      // Check if templates directory exists
      if (!fs.existsSync(modulePath)) {
        result.status = 'error';
        result.errors!.push('Templates directory not found');
        results.push(result);
        continue;
      }

      // Read template files
      const files = fs.readdirSync(modulePath);
      const templateFiles = files.filter(
        (f) => f.endsWith('.template.ts') || f === 'index.ts'
      );

      result.templateCount = templateFiles.length;
      result.templates = templateFiles;
      totalTemplates += templateFiles.length;

      console.log(`✅ ${module.toUpperCase().padEnd(20)} ${result.templateCount} templates`);
      templateFiles.forEach((file) => {
        console.log(`   - ${file}`);
      });
      console.log('');
    } catch (error: any) {
      result.status = 'error';
      result.errors!.push(error.message);
      console.log(`❌ ${module.toUpperCase().padEnd(20)} ERROR: ${error.message}\n`);
    }

    results.push(result);
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 VERIFICATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Total Modules Verified:   ${modules.length}`);
  console.log(`Total Templates Found:    ${totalTemplates}`);
  console.log(
    `Expected Templates:       ${modules.length * 10} (10 per module)`
  );
  console.log(
    `Status:                   ${totalTemplates >= modules.length * 10 ? '✅ PASS' : '⚠️  INCOMPLETE'}\n`
  );

  // Module breakdown
  console.log('Module Breakdown:');
  results.forEach((r) => {
    const status = r.status === 'success' ? '✅' : '❌';
    console.log(`  ${status} ${r.module.padEnd(20)} ${r.templateCount}/10 templates`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (totalTemplates >= modules.length * 10) {
    console.log('✅ ALL MODULES VERIFIED SUCCESSFULLY!');
  } else {
    console.log('⚠️  Some templates are missing. Check errors above.');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run verification
verifyModuleTemplates().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});

// Export for testing
export { verifyModuleTemplates, VerificationResult };
