// @docs: src/SKILL.md
// @snippet-start
import { partitionResults, success, failure } from '@k98kurz/functional-result';

const results = [
  success(1),
  failure('error1'),
  success(2),
  failure('error2')
];

const { successes, failures } = partitionResults(results);
// successes: [1, 2]
// failures: ['error1', 'error2']

// Use case: partial failure processing
if (successes.length > 0) {
  console.log(`Processed ${successes.length} items`);
}
if (failures.length > 0) {
  console.log(`${failures.length} items failed`);
}
// @snippet-end