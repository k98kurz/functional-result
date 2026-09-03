// @docs: readme.md
import { success, failure } from '@k98kurz/functional-result';
// @snippet-start
import { partitionResults } from '@k98kurz/functional-result';

const results = [
  success(1),
  failure('error1'),
  success(2),
  failure('error2')
];

const { successes, failures } = partitionResults(results);
// successes: [1, 2]
// failures: ['error1', 'error2']
// @snippet-end