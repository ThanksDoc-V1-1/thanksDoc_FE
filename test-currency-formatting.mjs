// Test the formatCurrency function to ensure proper rounding
import { formatCurrency } from './src/lib/utils.js';

// Test cases that should demonstrate proper rounding
const testCases = [
  { input: 98.3333333333333, expected: '£98.33' },
  { input: 25.999, expected: '£26.00' },
  { input: 10.005, expected: '£10.01' },
  { input: 0.999, expected: '£1.00' },
  { input: 100, expected: '£100.00' },
  { input: '15.5', expected: '£15.50' },
  { input: null, expected: '£0.00' },
  { input: undefined, expected: '£0.00' },
  { input: NaN, expected: '£0.00' },
  { input: Infinity, expected: '£0.00' }
];

console.log('🧪 Testing formatCurrency function...\n');

testCases.forEach(({ input, expected }, index) => {
  const result = formatCurrency(input);
  const passed = result === expected;
  
  console.log(`Test ${index + 1}: ${passed ? '✅' : '❌'}`);
  console.log(`  Input: ${input}`);
  console.log(`  Expected: ${expected}`);
  console.log(`  Got: ${result}`);
  if (!passed) {
    console.log(`  ❌ FAILED!`);
  }
  console.log('');
});

console.log('🎉 Currency formatting tests complete!');
