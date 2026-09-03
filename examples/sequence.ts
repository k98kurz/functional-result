// @docs: readme.md
import { success, failure } from '@k98kurz/functional-result';
// @snippet-start
import { sequence } from '@k98kurz/functional-result';

const results = [
  success(1),
  success(2),
  success(3)
];

const sequenced = sequence(results);
// { success: true, data: [1, 2, 3] }

// Returns first failure if any operation fails
const withFailure = [
  success(1),
  failure('second failed'),
  success(3)
];

const failed = sequence(withFailure);
// { success: false, error: 'second failed' }
// @snippet-end