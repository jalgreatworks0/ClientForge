// Quick fix: Remove "type": "module" from package.json
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

delete packageJson.type;

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');

console.log('✅ Fixed package.json - removed "type": "module"');
console.log('Now MCP servers will work with CommonJS require()');
