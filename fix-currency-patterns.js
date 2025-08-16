const fs = require('fs');
const path = require('path');

// Function to fix currency patterns in a file
function fixCurrencyPatterns(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace patterns that need fixing
    let fixedContent = content;
    
    // Fix simple service.price patterns
    fixedContent = fixedContent.replace(/£\{service\.price\}/g, '{formatCurrency(service.price)}');
    
    // Fix SERVICE_CHARGE pattern
    fixedContent = fixedContent.replace(/£\{SERVICE_CHARGE\}/g, '{formatCurrency(SERVICE_CHARGE)}');
    
    // Only write if changes were made
    if (fixedContent !== content) {
      fs.writeFileSync(fullPath, fixedContent);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Files to fix
const filesToFix = [
  'src/app/business/dashboard/page.js'
];

console.log('🔧 Fixing currency formatting patterns...\n');

filesToFix.forEach(file => {
  const wasFixed = fixCurrencyPatterns(file);
  if (wasFixed) {
    console.log(`✅ Fixed ${file}`);
  } else {
    console.log(`⏭️  No changes needed in ${file}`);
  }
});

console.log('\n🎉 Currency formatting fix complete!');
console.log('\n📝 Remember to:');
console.log('1. Ensure formatCurrency is imported in fixed files');
console.log('2. Test the application to verify proper formatting');
console.log('3. Check that all monetary values show exactly 2 decimal places');
