import { run, mkState } from './state';
import { parse } from './parse';
import { allTests } from './tests';

let passed = 0;
let failed = 0;

for (const test of allTests) {
  const states = run(mkState(parse(test.input)));
  const lastState = states[states.length - 1];
  const succeeded = lastState.error === undefined || lastState.error === 'halt';

  const matchesExpectation = succeeded === test.expectSuccess;

  if (matchesExpectation) {
    console.log(`  PASS  ${test.name} (${succeeded ? 'ok' : 'error: ' + lastState.error})`);
    passed++;
  } else {
    console.log(`  FAIL  ${test.name} -- expected ${test.expectSuccess ? 'success' : 'failure'}, got ${succeeded ? 'success' : 'error: ' + lastState.error}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed, ${allTests.length} total`);
process.exit(failed > 0 ? 1 : 0);
