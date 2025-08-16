// Utility to find and replace currency formatting patterns
// This script helps identify where currency formatting needs to be fixed

const fs = require('fs');
const path = require('path');

// Files to search and fix
const filesToCheck = [
  'src/app/business/dashboard/page.js',
  'src/app/doctor/dashboard/page.js', 
  'src/app/admin/dashboard/page.js',
  'src/app/doctor/earnings/page.js',
  'src/components/PaymentForm.js',
  'src/components/TransactionHistory.js'
];

// Pattern to find: £{variable} or £{expression}
const currencyPattern = /£\{([^}]+)\}/g;

function findCurrencyPatterns(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    const matches = [];
    
    lines.forEach((line, index) => {
      const lineMatches = [...line.matchAll(currencyPattern)];
      lineMatches.forEach(match => {
        matches.push({
          line: index + 1,
          text: match[0],
          expression: match[1],
          fullLine: line.trim()
        });
      });
    });
    
    return matches;
  } catch (error) {
    return [];
  }
}

console.log('🔍 Searching for currency formatting patterns...\n');

filesToCheck.forEach(file => {
  const matches = findCurrencyPatterns(file);
  if (matches.length > 0) {
    console.log(`📄 ${file}:`);
    matches.forEach(match => {
      const needsFormatting = !match.expression.includes('.toFixed(2)') && 
                             !match.expression.includes('formatCurrency');
      console.log(`  Line ${match.line}: ${match.text} ${needsFormatting ? '❌ NEEDS FIXING' : '✅ OK'}`);
      console.log(`    Expression: ${match.expression}`);
      console.log(`    Context: ${match.fullLine.substring(0, 80)}...`);
      console.log('');
    });
  }
});

console.log('\n✨ Search complete!');
console.log('\n💡 Patterns that need fixing should use formatCurrency() or .toFixed(2)');
console.log('   ❌ Bad:  £{service.price}');
console.log('   ✅ Good: {formatCurrency(service.price)}');
console.log('   ✅ Good: £{service.price.toFixed(2)}');
