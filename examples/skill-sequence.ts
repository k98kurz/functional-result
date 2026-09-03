// @docs: src/SKILL.md
// @snippet-start
import { sequence, success, failure } from '@k98kurz/functional-result';

const results = [
  success(1),
  success(2),
  success(3)
];

const sequenced = sequence(results);
// success([1, 2, 3])

// First failure stops execution
const withFailure = [
  success(1),
  failure('second failed'),
  success(3)
];

const failed = sequence(withFailure);
// failure('second failed') - third item never processes
// @snippet-end