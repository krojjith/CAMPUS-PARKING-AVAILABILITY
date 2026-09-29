/**
 * @file Master Test Runner for ParkCampus
 * Executes all unit test suites for:
 * 1. ParkingStore in-memory DB and business logic
 * 2. API Endpoint contracts and sensor validation
 * 3. Error Boundary state transitions and fault tolerance
 */

import { runParkingStoreTests } from './parkingStore.test';
import { runApiEndpointTests } from './apiEndpoints.test';
import { runErrorBoundaryTests } from './errorBoundary.test';

console.log('===========================================================');
console.log('🚀 ParkCampus System - Unit Test Suite Runner');
console.log('   Review 2 Technical Verification & Validation Suite');
console.log('===========================================================\n');

const suites = [
  runParkingStoreTests(),
  runApiEndpointTests(),
  runErrorBoundaryTests(),
];

let totalPassed = 0;
let totalFailed = 0;

for (const suite of suites) {
  console.log(`📦 Suite: ${suite.suite}`);
  console.log(`   Passed: ${suite.passed} | Failed: ${suite.failed}`);
  for (const t of suite.tests) {
    if (t.passed) {
      console.log(`   ✅ PASS: ${t.name}`);
    } else {
      console.log(`   ❌ FAIL: ${t.name}`);
      if (t.error) {
        console.log(`      Error: ${t.error}`);
      }
    }
  }
  totalPassed += suite.passed;
  totalFailed += suite.failed;
  console.log('');
}

console.log('-----------------------------------------------------------');
console.log(`📊 FINAL RESULTS: ${totalPassed} PASSED, ${totalFailed} FAILED (Total: ${totalPassed + totalFailed})`);
console.log('===========================================================');

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log('✨ All unit test suites executed with 100% pass rate!');
  process.exit(0);
}
